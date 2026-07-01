import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import DeliveryService from "../services/delivery.service.js";

export const markReadyForPickup = async (req: Request, res: Response) => {
  try {
    const sellerId = req.sellerId;
    const id = req.params.id as string;

    if (!sellerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!id) {
      return res.status(400).json({ message: "Seller Order ID is required" });
    }

    const sellerOrder = await prisma.sellerOrder.findUnique({
      where: { id }
    });

    if (!sellerOrder || sellerOrder.sellerId !== sellerId) {
      return res.status(404).json({ message: "Seller order not found" });
    }

    // Update status to READY_FOR_PICKUP so DeliveryService can process it
    const updatedOrder = await prisma.sellerOrder.update({
      where: { id },
      data: { status: "READY_FOR_PICKUP" }
    });

    // Create the delivery booking
    const delivery = await DeliveryService.createDeliveryForSellerOrder(id);

    return res.status(200).json({
      message: "Order marked ready for pickup and delivery created",
      sellerOrder: updatedOrder,
      delivery
    });
  } catch (err: any) {
    console.error("MARK READY FOR PICKUP ERROR:", err);
    return res.status(400).json({ message: err.message || "Failed to mark ready for pickup" });
  }
};

export const getAssignedDelivery = async (req: Request, res: Response) => {
  try {
    const sellerId = req.sellerId;
    const id = req.params.id as string;

    if (!sellerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!id) {
      return res.status(400).json({ message: "Seller Order ID is required" });
    }

    const sellerOrder = await prisma.sellerOrder.findUnique({
      where: { id }
    });

    if (!sellerOrder || sellerOrder.sellerId !== sellerId) {
      return res.status(404).json({ message: "Seller order not found" });
    }

    const delivery = await prisma.delivery.findUnique({
      where: { sellerOrderId: id }
    });

    if (!delivery) {
      return res.status(404).json({ message: "No delivery assigned to this order" });
    }

    return res.status(200).json({ delivery });
  } catch (err: any) {
    console.error("GET ASSIGNED DELIVERY ERROR:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const cancelPickup = async (req: Request, res: Response) => {
  try {
    const sellerId = req.sellerId;
    const id = req.params.id as string;

    if (!sellerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!id) {
      return res.status(400).json({ message: "Seller Order ID is required" });
    }

    const sellerOrder = await prisma.sellerOrder.findUnique({
      where: { id }
    });

    if (!sellerOrder || sellerOrder.sellerId !== sellerId) {
      return res.status(404).json({ message: "Seller order not found" });
    }

    const delivery = await prisma.delivery.findUnique({
      where: { sellerOrderId: id }
    });

    if (!delivery) {
      return res.status(404).json({ message: "Delivery booking not found" });
    }

    // Cancel provider booking if present
    try {
      const notes = delivery.notes ? JSON.parse(delivery.notes) : {};
      const providerOrderId = notes.providerOrderId || null;
      if (providerOrderId) {
        const Provider = DeliveryService.getProvider();
        await Provider.cancelBooking(providerOrderId).catch(() => null);
      }
    } catch (e) {}

    // Update statuses
    const updatedDelivery = await prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: "CANCELLED", failedAt: new Date() }
    });

    const updatedOrder = await prisma.sellerOrder.update({
      where: { id },
      data: { status: "PACKED" }
    });

    await prisma.orderTimelineEvent.create({
      data: {
        entityType: "DELIVERY",
        deliveryId: delivery.id,
        status: "CANCELLED",
        title: "Pickup Cancelled by Seller",
        description: "Pickup cancelled and order reverted to packed status."
      }
    });

    return res.status(200).json({
      message: "Pickup booking cancelled",
      delivery: updatedDelivery,
      sellerOrder: updatedOrder
    });
  } catch (err: any) {
    console.error("CANCEL PICKUP ERROR:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getDeliveryHistory = async (req: Request, res: Response) => {
  try {
    const sellerId = req.sellerId;

    if (!sellerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const deliveries = await prisma.delivery.findMany({
      where: {
        sellerOrder: {
          sellerId
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json({ count: deliveries.length, deliveries });
  } catch (err: any) {
    console.error("GET DELIVERY HISTORY ERROR:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
