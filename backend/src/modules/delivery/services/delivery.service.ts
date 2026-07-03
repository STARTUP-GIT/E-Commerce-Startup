import { prisma } from "../../../config/prisma.js";
import PorterService from "./porter.service.js";
import { DeliveryDecisionEngine } from "./deliveryProviders.js";

const DEFAULT_PROVIDER = "PORTER";

const SYSTEM_PARTNER_EMAIL = process.env.SYSTEM_DELIVERY_PARTNER_EMAIL || "system-delivery@platform.local";
const SYSTEM_PARTNER_PHONE = process.env.SYSTEM_DELIVERY_PARTNER_PHONE || "0000000000";

export class DeliveryService {
  static getProvider() {
    const provider = (process.env.DELIVERY_PROVIDER || DEFAULT_PROVIDER).toUpperCase();
    if (provider === "PORTER") return PorterService;
    // future providers: ShadowfaxService, DunzoService, OwnFleetService
    throw new Error(`Unsupported delivery provider: ${provider}`);
  }

  static async getBestProvider(pickupAddress: any, dropoffAddress: any) {
    return DeliveryDecisionEngine.selectProvider({ pickupAddress, dropoffAddress });
  }

  static async calculateShares(deliveryCost: number, customerShare = 75, sellerShare = 25) {
    const customerAmount = Math.round((deliveryCost * customerShare) / 100);
    const sellerAmount = deliveryCost - customerAmount;

    return {
      deliveryCost,
      customerDeliveryShare: customerAmount,
      sellerDeliveryShare: sellerAmount,
      customerSharePercent: customerShare,
      sellerSharePercent: sellerShare
    };
  }

  static async createDeliveryForSellerOrder(sellerOrderId: string) {
    // prevent duplicate delivery
    const existing = await prisma.delivery.findUnique({ where: { sellerOrderId } });
    if (existing) throw new Error("Delivery already exists for this seller order");

    const sellerOrder = await prisma.sellerOrder.findUnique({ where: { id: sellerOrderId }, include: { order: true, seller: true, pickupSellerAddress: true } });
    if (!sellerOrder) throw new Error("Seller order not found");

    // ensure order is ready for pickup
    if (sellerOrder.status !== "READY_FOR_PICKUP" && sellerOrder.status !== "PACKED") {
      throw new Error("Seller order not ready for pickup");
    }

    const pickupAddressSnapshot = sellerOrder.pickupSellerAddress || null;
    const dropoffAddress = await prisma.customerAddress.findUnique({ where: { id: sellerOrder.order.shippingAddressId } });
    const deliveryAddressSnapshot = dropoffAddress || null;

    const pickupAddress = pickupAddressSnapshot ? JSON.stringify(pickupAddressSnapshot) : "";
    const deliveryAddress = deliveryAddressSnapshot ? JSON.stringify(deliveryAddressSnapshot) : "";

    const Provider = this.getProvider();

    const estimate: any = await Provider.estimatePrice(pickupAddress, deliveryAddress);
    const amount = Number(estimate?.amount ?? estimate?.price ?? 0);
    const bestProvider = await this.getBestProvider(pickupAddressSnapshot, deliveryAddressSnapshot);
    console.info(`[DELIVERY] Selected provider ${bestProvider.name} for seller order ${sellerOrderId}`);

    // Fetch shop settings for individual delivery split
    const shop = await prisma.shop.findUnique({ where: { sellerId: sellerOrder.sellerId } });
    const customerShare = shop?.customerDeliveryShare !== null && shop?.customerDeliveryShare !== undefined ? shop.customerDeliveryShare : 75;
    const sellerShare = shop?.sellerDeliveryShare !== null && shop?.sellerDeliveryShare !== undefined ? shop.sellerDeliveryShare : 25;

    const shares = await this.calculateShares(amount, customerShare, sellerShare);

    const bookingPayload = { sellerOrderId, pickup: pickupAddressSnapshot, dropoff: deliveryAddressSnapshot, amount };
    const booking: any = await Provider.createBooking(bookingPayload);

    // ensure system/unassigned delivery partner exists
    let systemPartner = await prisma.deliveryPartner.findUnique({ where: { email: SYSTEM_PARTNER_EMAIL } });
    if (!systemPartner) {
      systemPartner = await prisma.deliveryPartner.create({ data: { email: SYSTEM_PARTNER_EMAIL, passwordHash: "", firstName: "System", lastName: "Unassigned", phone: SYSTEM_PARTNER_PHONE } });
    }

    // Persist delivery using canonical fields; store provider metadata in notes
    const delivery = await prisma.delivery.create({
      data: {
        deliveryNumber: `DLY_${Date.now()}`,
        sellerOrderId,
        deliveryPartnerId: systemPartner.id,
        pickupSellerAddressId: sellerOrder.pickupSellerAddressId,
        dropoffCustomerAddressId: sellerOrder.order.shippingAddressId,
        status: "ASSIGNED",
        pickupAddressSnapshot: pickupAddressSnapshot as any,
        deliveryAddressSnapshot: deliveryAddressSnapshot as any,
        estimatedPickupAt: booking.estimatedPickupTime ? new Date(booking.estimatedPickupTime) : null,
        estimatedDeliveryAt: booking.estimatedDeliveryTime ? new Date(booking.estimatedDeliveryTime) : null,
        notes: JSON.stringify({ provider: process.env.DELIVERY_PROVIDER || DEFAULT_PROVIDER, providerOrderId: booking.providerOrderId || null, providerTrackingId: booking.trackingId || null, deliveryCost: amount, shares })
      }
    });

    // timeline event
    await prisma.orderTimelineEvent.create({
      data: {
        entityType: "DELIVERY",
        sellerOrderId,
        deliveryId: delivery.id,
        status: "ASSIGNED",
        title: "Delivery Booking Created",
        description: `Delivery booking created with provider ${process.env.DELIVERY_PROVIDER || DEFAULT_PROVIDER}`,
        metadata: JSON.parse(JSON.stringify({ booking }))
      }
    });

    return delivery;
  }

  static async trackDeliveryById(deliveryId: string) {
    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new Error("Delivery not found");

    const notes = delivery.notes ? JSON.parse(delivery.notes) : {};
    const providerOrderId = notes.providerOrderId || notes.provider_order_id || null;
    if (!providerOrderId) throw new Error("No provider booking id available");

    const Provider = this.getProvider();
    const track = await Provider.trackBooking(providerOrderId);
    return { delivery, track };
  }

  static async assignDriver(deliveryId: string, driverInfo: any) {
    // store driver info in notes and mark as ACCEPTED
    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new Error("Delivery not found");
    const notes = delivery.notes ? JSON.parse(delivery.notes) : {};
    notes.driver = { name: driverInfo.name, phone: driverInfo.phone, vehicleNumber: driverInfo.vehicleNumber };
    const updated = await prisma.delivery.update({ where: { id: deliveryId }, data: { notes: JSON.stringify(notes), status: "ACCEPTED", acceptedAt: new Date() } });
    await prisma.orderTimelineEvent.create({ data: { entityType: "DELIVERY", deliveryId: updated.id, status: "ACCEPTED", title: "Driver Assigned", description: "Driver assigned by provider", metadata: { driverInfo } } });
    return updated;
  }

  static async updateStatus(deliveryId: string, status: string) {
    const now = new Date();
    const data: any = { status };
    // map some common incoming statuses to DB fields
    if (status === "PICKED_UP" || status === "PICKUP_COMPLETE") data.actualPickupAt = now;
    if (status === "IN_TRANSIT") data.acceptedAt = now;
    if (status === "OUT_FOR_DELIVERY") data.updatedAt = now;
    if (status === "DELIVERED") { data.actualDeliveryAt = now; data.completedAt = now; }

    const delivery = await prisma.delivery.update({ where: { id: deliveryId }, data });
    await prisma.orderTimelineEvent.create({ data: { entityType: "DELIVERY", deliveryId: delivery.id, status, title: `Delivery ${status}`, description: `Status updated to ${status}` } });
    return delivery;
  }
}

export default DeliveryService;
