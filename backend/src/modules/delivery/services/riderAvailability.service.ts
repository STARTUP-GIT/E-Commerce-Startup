import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { Prisma } from "@prisma/client";
import { DeliverySettingsService } from "./deliverySettings.service.js";
import { DeliveryLocationService } from "./deliveryLocation.service.js";

export class RiderAvailabilityService {
  static async toggleAvailability(
    riderId: string,
    isAvailable: boolean,
    coords?: { latitude?: number; longitude?: number }
  ) {
    const rider = await prisma.deliveryPartner.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new Error("Rider not found.");
    }

    if (isAvailable) {
      // Must be approved by admin
      if (rider.verificationStatus !== "APPROVED") {
        throw new Error(
          `Cannot go online. Verification status is '${rider.verificationStatus}'. Admin approval is required.`
        );
      }

      if (rider.status !== "ACTIVE") {
        throw new Error(
          `Account is currently ${rider.status.toLowerCase()}. You cannot receive delivery offers.`
        );
      }

      // Check global delivery operations status
      const settings = await DeliverySettingsService.getEffectiveSettings();
      if (settings.isDeliveryServiceEnabled === false) {
        throw new Error("Delivery operations are temporarily paused across the platform.");
      }

      // Validate rider is within an eligible, operational delivery coverage area
      await DeliveryLocationService.validateRiderOnlineLocation(riderId, coords);
    } else {
      // If going offline, check if rider has an ongoing active delivery
      const activeDelivery = await prisma.delivery.findFirst({
        where: {
          deliveryPartnerId: riderId,
          status: {
            in: [
              "ASSIGNED",
              "ACCEPTED",
              "ARRIVING_AT_PICKUP",
              "ARRIVED_AT_PICKUP",
              "PICKUP_VERIFICATION",
              "PICKED_UP",
              "IN_TRANSIT",
              "ARRIVED_AT_DROPOFF",
              "DELIVERY_VERIFICATION",
            ],
          },
        },
      });

      if (activeDelivery) {
        // We still allow going offline for future offers, but keep delivery active
        logger.info(
          `[RiderAvailability] Rider ${riderId} going offline with active delivery ${activeDelivery.deliveryNumber}`
        );
      }
    }

    const updateData: any = { isAvailable };
    if (coords?.latitude !== undefined && coords?.longitude !== undefined) {
      updateData.currentLat = new Prisma.Decimal(coords.latitude);
      updateData.currentLng = new Prisma.Decimal(coords.longitude);
      updateData.lastLocationUpdatedAt = new Date();
    }

    const updated = await prisma.deliveryPartner.update({
      where: { id: riderId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        city: true,
        isAvailable: true,
        verificationStatus: true,
        currentLat: true,
        currentLng: true,
      },
    });

    return updated;
  }

  static async updateLocation(
    riderId: string,
    lat: number,
    lng: number,
    accuracyMeters?: number
  ) {
    const rider = await prisma.deliveryPartner.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        city: true,
        isAvailable: true,
        verificationStatus: true,
      },
    });

    if (!rider) {
      throw new Error("Rider not found.");
    }

    // Update rider's current coordinates without overwriting registered residential address
    const updated = await prisma.deliveryPartner.update({
      where: { id: riderId },
      data: {
        currentLat: new Prisma.Decimal(lat),
        currentLng: new Prisma.Decimal(lng),
        lastLocationUpdatedAt: new Date(),
      },
      select: {
        id: true,
        city: true,
        currentLat: true,
        currentLng: true,
        lastLocationUpdatedAt: true,
      },
    });

    // Evaluate whether coordinates are currently within operational delivery coverage
    const coverageCheck = await DeliveryLocationService.checkDeliveryEligibility({
      latitude: lat,
      longitude: lng,
    });

    return {
      ...updated,
      isWithinCoverage: coverageCheck.isDeliveryEligible,
      coverageStatus: coverageCheck.status,
      coverageMessage: coverageCheck.message,
    };
  }
}
