import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { ServiceabilityService, normalizeDistrictName } from "../../../services/location/serviceability.service.js";
import { DeliverySettingsService } from "./deliverySettings.service.js";

export interface DeliveryEligibilityResult {
  isDeliveryEligible: boolean;
  status:
    | "AVAILABLE"
    | "COMING_SOON"
    | "DISTRICT_DISABLED"
    | "TOWN_DISABLED"
    | "SERVICE_AREA_DISABLED"
    | "MAINTENANCE"
    | "LOCATION_UNRESOLVED";
  message: string;
  comingSoonMessage?: string | null;
  resolvedLocation: {
    state?: string;
    district?: string;
    districtId?: string;
    town?: string;
    townId?: string;
    serviceArea?: string;
    serviceAreaId?: string;
    postalCode?: string;
    formattedAddress?: string;
    latitude?: number;
    longitude?: number;
  };
  operationalCoverage?: {
    primaryActiveCity: string | null;
    totalOperationalDistricts: number;
    activeLocations: string[];
  };
}

export class DeliveryLocationService {
  /**
   * Retrieves the authoritative delivery location catalogue for selection and display.
   * Only includes locations adhering to delivery configuration.
   */
  static async getDeliveryCatalogue() {
    try {
      const states = await prisma.state.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      const districts = await prisma.city.findMany({
        where: {
          isActive: true,
          isDeliveryEnabled: true,
          maintenanceMode: false,
          launchStatus: "LAUNCHED",
        },
        include: {
          cityTowns: {
            where: {
              isActive: true,
              launchStatus: "LAUNCHED",
            },
            orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          },
          serviceAreas: {
            where: {
              isActive: true,
              deliveryEligible: true,
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      });

      return {
        success: true,
        states,
        districts: districts.map((d) => ({
          id: d.id,
          name: d.name,
          displayName: d.displayName || d.name,
          state: d.state,
          isDeliveryEnabled: d.isDeliveryEnabled,
          towns: d.cityTowns.map((t) => ({
            id: t.id,
            name: t.name,
            displayName: t.displayName || t.name,
          })),
          serviceAreas: d.serviceAreas.map((a) => ({
            id: a.id,
            name: a.name,
            postalCodes: a.postalCodes,
            cityTownId: a.cityTownId,
          })),
        })),
      };
    } catch (err: any) {
      logger.error(`[DeliveryLocationService] getDeliveryCatalogue error: ${err?.message}`);
      throw err;
    }
  }

  /**
   * Complete delivery serviceability and location eligibility check.
   * Validates:
   * 1. State active.
   * 2. District active, isDeliveryEnabled === true, maintenanceMode === false, launchStatus === "LAUNCHED".
   * 3. Town active & launchStatus === "LAUNCHED" (if specified or matched).
   * 4. Service area active & deliveryEligible === true (if specified or matched).
   * 5. Never defaults to Mysuru or any arbitrary district.
   */
  static async checkDeliveryEligibility(params: {
    state?: string;
    district?: string;
    districtId?: string;
    town?: string;
    townId?: string;
    serviceArea?: string;
    serviceAreaId?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<DeliveryEligibilityResult> {
    const coverage = await DeliverySettingsService.getOperationalDeliveryCoverage();
    const operationalCoverageSummary = {
      primaryActiveCity: coverage.primaryActiveCity,
      totalOperationalDistricts: coverage.totalOperationalDistricts,
      activeLocations: coverage.activeLocations,
    };

    let resolvedState = params.state?.trim() || "";
    let resolvedDistrict = params.district?.trim() || "";
    let resolvedDistrictId = params.districtId?.trim() || "";
    let resolvedTown = params.town?.trim() || "";
    let resolvedTownId = params.townId?.trim() || "";
    let resolvedServiceArea = params.serviceArea?.trim() || "";
    let resolvedServiceAreaId = params.serviceAreaId?.trim() || "";
    let resolvedPostalCode = params.postalCode?.trim() || "";
    let formattedAddress = "";

    // 1. Resolve GPS Coordinates if provided
    if (typeof params.latitude === "number" && typeof params.longitude === "number") {
      try {
        const geo = await ServiceabilityService.resolveCoordinates(params.latitude, params.longitude);
        if (geo.district || geo.city) {
          resolvedState = geo.state || resolvedState;
          resolvedDistrict = geo.district || geo.city || resolvedDistrict;
          resolvedTown = geo.city !== geo.district ? geo.city : resolvedTown;
          resolvedServiceArea = geo.serviceArea || resolvedServiceArea;
          resolvedPostalCode = geo.postalCode || resolvedPostalCode;
          formattedAddress = geo.formattedAddress || "";
        }
      } catch (err: any) {
        logger.warn(`[DeliveryLocationService] Coordinate resolution error: ${err?.message}`);
      }
    }

    if (!resolvedDistrictId && !resolvedDistrict && !resolvedPostalCode) {
      return {
        isDeliveryEligible: false,
        status: "LOCATION_UNRESOLVED",
        message: "Please select or provide a delivery location to check availability.",
        resolvedLocation: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        operationalCoverage: operationalCoverageSummary,
      };
    }

    // 2. Query District by ID or Normalized Name
    let districtRecord: any = null;
    if (resolvedDistrictId) {
      districtRecord = await prisma.city.findUnique({
        where: { id: resolvedDistrictId },
        include: {
          cityTowns: true,
          serviceAreas: true,
        },
      });
    }

    if (!districtRecord && resolvedDistrict) {
      const canonicalName = normalizeDistrictName(resolvedDistrict);
      districtRecord = await prisma.city.findFirst({
        where: {
          OR: [
            { name: { equals: canonicalName, mode: "insensitive" } },
            { displayName: { equals: canonicalName, mode: "insensitive" } },
            { name: { equals: resolvedDistrict, mode: "insensitive" } },
            { displayName: { equals: resolvedDistrict, mode: "insensitive" } },
          ],
        },
        include: {
          cityTowns: true,
          serviceAreas: true,
        },
      });
    }

    // Postal code search if district not yet found
    if (!districtRecord && resolvedPostalCode) {
      const areaMatch = await prisma.serviceArea.findFirst({
        where: { postalCodes: { has: resolvedPostalCode } },
        include: {
          district: {
            include: { cityTowns: true, serviceAreas: true },
          },
          cityTown: true,
        },
      });
      if (areaMatch) {
        districtRecord = areaMatch.district;
        resolvedServiceArea = areaMatch.name;
        resolvedServiceAreaId = areaMatch.id;
        if (areaMatch.cityTown) {
          resolvedTown = areaMatch.cityTown.name;
          resolvedTownId = areaMatch.cityTown.id;
        }
      }
    }

    if (!districtRecord) {
      return {
        isDeliveryEligible: false,
        status: "COMING_SOON",
        message: `AtlasBasket Delivery is coming soon to ${resolvedDistrict || "your area"}! We are actively expanding coverage.`,
        resolvedLocation: {
          state: resolvedState,
          district: resolvedDistrict,
          town: resolvedTown,
          serviceArea: resolvedServiceArea,
          postalCode: resolvedPostalCode,
          formattedAddress,
          latitude: params.latitude,
          longitude: params.longitude,
        },
        operationalCoverage: operationalCoverageSummary,
      };
    }

    resolvedDistrictId = districtRecord.id;
    resolvedDistrict = districtRecord.displayName || districtRecord.name;
    resolvedState = districtRecord.state || resolvedState;

    // 3. Verify Parent State active status
    if (resolvedState) {
      const stateRecord = await prisma.state.findFirst({
        where: { name: { equals: resolvedState, mode: "insensitive" } },
      });
      if (stateRecord && !stateRecord.isActive) {
        return {
          isDeliveryEligible: false,
          status: "COMING_SOON",
          message: `AtlasBasket Delivery is coming soon to ${resolvedState}! State-level operations are not yet open.`,
          resolvedLocation: {
            state: resolvedState,
            district: resolvedDistrict,
            districtId: resolvedDistrictId,
            formattedAddress,
            latitude: params.latitude,
            longitude: params.longitude,
          },
          operationalCoverage: operationalCoverageSummary,
        };
      }
    }

    // 4. District Master Delivery Invariants
    if (districtRecord.maintenanceMode) {
      return {
        isDeliveryEligible: false,
        status: "MAINTENANCE",
        message: `Delivery services in ${resolvedDistrict} are temporarily paused for maintenance. Please check back shortly.`,
        comingSoonMessage: districtRecord.comingSoonMessage,
        resolvedLocation: {
          state: resolvedState,
          district: resolvedDistrict,
          districtId: resolvedDistrictId,
          formattedAddress,
          latitude: params.latitude,
          longitude: params.longitude,
        },
        operationalCoverage: operationalCoverageSummary,
      };
    }

    if (!districtRecord.isActive || !districtRecord.isDeliveryEnabled || districtRecord.launchStatus !== "LAUNCHED") {
      return {
        isDeliveryEligible: false,
        status: "DISTRICT_DISABLED",
        message: `Delivery operations are currently not enabled in ${resolvedDistrict}.`,
        comingSoonMessage: districtRecord.comingSoonMessage,
        resolvedLocation: {
          state: resolvedState,
          district: resolvedDistrict,
          districtId: resolvedDistrictId,
          formattedAddress,
          latitude: params.latitude,
          longitude: params.longitude,
        },
        operationalCoverage: operationalCoverageSummary,
      };
    }

    // 5. Verify Child Town Availability (if town provided or matched)
    let matchedTown: any = null;
    if (resolvedTownId) {
      matchedTown = districtRecord.cityTowns.find((t: any) => t.id === resolvedTownId);
    } else if (resolvedTown) {
      matchedTown = districtRecord.cityTowns.find(
        (t: any) =>
          t.name.toLowerCase() === resolvedTown.toLowerCase() ||
          (t.displayName && t.displayName.toLowerCase() === resolvedTown.toLowerCase())
      );
    }

    if (matchedTown) {
      resolvedTownId = matchedTown.id;
      resolvedTown = matchedTown.displayName || matchedTown.name;

      if (!matchedTown.isActive || matchedTown.launchStatus !== "LAUNCHED") {
        return {
          isDeliveryEligible: false,
          status: "TOWN_DISABLED",
          message: `Delivery operations in ${resolvedTown} are currently disabled by administration.`,
          resolvedLocation: {
            state: resolvedState,
            district: resolvedDistrict,
            districtId: resolvedDistrictId,
            town: resolvedTown,
            townId: resolvedTownId,
            formattedAddress,
            latitude: params.latitude,
            longitude: params.longitude,
          },
          operationalCoverage: operationalCoverageSummary,
        };
      }
    }

    // 6. Verify Service Area Availability (if service area provided or matched)
    let matchedArea: any = null;
    if (resolvedServiceAreaId) {
      matchedArea = districtRecord.serviceAreas.find((a: any) => a.id === resolvedServiceAreaId);
    } else if (resolvedServiceArea) {
      matchedArea = districtRecord.serviceAreas.find(
        (a: any) => a.name.toLowerCase() === resolvedServiceArea.toLowerCase()
      );
    } else if (resolvedPostalCode) {
      matchedArea = districtRecord.serviceAreas.find((a: any) =>
        a.postalCodes?.includes(resolvedPostalCode)
      );
    }

    if (matchedArea) {
      resolvedServiceAreaId = matchedArea.id;
      resolvedServiceArea = matchedArea.name;

      // If service area belongs to a town, ensure parent town is active
      if (matchedArea.cityTownId) {
        const parentTown = districtRecord.cityTowns.find((t: any) => t.id === matchedArea.cityTownId);
        if (parentTown && (!parentTown.isActive || parentTown.launchStatus !== "LAUNCHED")) {
          return {
            isDeliveryEligible: false,
            status: "TOWN_DISABLED",
            message: `Delivery to ${resolvedServiceArea} is unavailable because parent town ${parentTown.displayName || parentTown.name} is disabled.`,
            resolvedLocation: {
              state: resolvedState,
              district: resolvedDistrict,
              districtId: resolvedDistrictId,
              town: parentTown.displayName || parentTown.name,
              townId: parentTown.id,
              serviceArea: resolvedServiceArea,
              serviceAreaId: resolvedServiceAreaId,
              formattedAddress,
              latitude: params.latitude,
              longitude: params.longitude,
            },
            operationalCoverage: operationalCoverageSummary,
          };
        }
      }

      if (!matchedArea.isActive || !matchedArea.deliveryEligible) {
        return {
          isDeliveryEligible: false,
          status: "SERVICE_AREA_DISABLED",
          message: `Delivery coverage is currently unavailable in ${resolvedServiceArea}.`,
          resolvedLocation: {
            state: resolvedState,
            district: resolvedDistrict,
            districtId: resolvedDistrictId,
            town: resolvedTown,
            townId: resolvedTownId,
            serviceArea: resolvedServiceArea,
            serviceAreaId: resolvedServiceAreaId,
            postalCode: resolvedPostalCode,
            formattedAddress,
            latitude: params.latitude,
            longitude: params.longitude,
          },
          operationalCoverage: operationalCoverageSummary,
        };
      }
    }

    // Location is fully operational and delivery eligible
    return {
      isDeliveryEligible: true,
      status: "AVAILABLE",
      message: `AtlasBasket Delivery is operational in ${resolvedServiceArea || resolvedTown || resolvedDistrict}.`,
      comingSoonMessage: districtRecord.comingSoonMessage,
      resolvedLocation: {
        state: resolvedState,
        district: resolvedDistrict,
        districtId: resolvedDistrictId,
        town: resolvedTown || undefined,
        townId: resolvedTownId || undefined,
        serviceArea: resolvedServiceArea || undefined,
        serviceAreaId: resolvedServiceAreaId || undefined,
        postalCode: resolvedPostalCode || undefined,
        formattedAddress,
        latitude: params.latitude,
        longitude: params.longitude,
      },
      operationalCoverage: operationalCoverageSummary,
    };
  }

  /**
   * Validates a rider's operating location for registration or profile update.
   */
  static async validateRiderOperatingLocation(input: {
    districtId?: string;
    city?: string;
    district?: string;
    townId?: string;
    town?: string;
    serviceAreaId?: string;
    serviceArea?: string;
    postalCode?: string;
  }) {
    const eligibility = await this.checkDeliveryEligibility({
      districtId: input.districtId,
      district: input.district || input.city,
      townId: input.townId,
      town: input.town,
      serviceAreaId: input.serviceAreaId,
      serviceArea: input.serviceArea,
      postalCode: input.postalCode,
    });

    if (!eligibility.isDeliveryEligible) {
      throw new Error(
        eligibility.message ||
          "Selected location is not currently operational for AtlasBasket Delivery. Rider registration is only permitted in active delivery areas."
      );
    }

    return eligibility;
  }

  /**
   * Validates rider online activation against current coordinates.
   */
  static async validateRiderOnlineLocation(riderId: string, coords?: { latitude?: number; longitude?: number }) {
    const rider = await prisma.deliveryPartner.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        city: true,
        currentLat: true,
        currentLng: true,
        verificationStatus: true,
        status: true,
      },
    });

    if (!rider) throw new Error("Rider not found.");
    if (rider.verificationStatus !== "APPROVED") {
      throw new Error(`Only approved riders can go online. Current status: ${rider.verificationStatus}.`);
    }
    if (rider.status !== "ACTIVE") {
      throw new Error(`Rider account is ${rider.status.toLowerCase()}. You cannot receive delivery offers.`);
    }

    const lat = coords?.latitude ?? (rider.currentLat ? Number(rider.currentLat) : undefined);
    const lng = coords?.longitude ?? (rider.currentLng ? Number(rider.currentLng) : undefined);

    if (lat === undefined || lng === undefined) {
      // If coordinates not provided, check rider's registered city
      if (!rider.city) {
        throw new Error("Current location is required to activate availability and receive delivery jobs.");
      }
      const cityCheck = await this.checkDeliveryEligibility({ district: rider.city });
      if (!cityCheck.isDeliveryEligible) {
        throw new Error(`Your registered operating district '${rider.city}' is currently disabled for delivery.`);
      }
      return cityCheck;
    }

    const eligibility = await this.checkDeliveryEligibility({ latitude: lat, longitude: lng });
    if (!eligibility.isDeliveryEligible) {
      throw new Error(
        `Cannot go online: You are currently outside active delivery coverage (${eligibility.resolvedLocation.district || "Current zone"} is not enabled for delivery).`
      );
    }

    return eligibility;
  }

  /**
   * Validates that both pickup and dropoff locations for a delivery job are operational.
   */
  static async validateDeliveryJobLocations(pickupLocation: {
    state?: string;
    district?: string;
    city?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  }, dropoffLocation: {
    state?: string;
    district?: string;
    city?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const [pickupCheck, dropoffCheck] = await Promise.all([
      this.checkDeliveryEligibility({
        state: pickupLocation.state,
        district: pickupLocation.district || pickupLocation.city,
        postalCode: pickupLocation.postalCode,
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
      }),
      this.checkDeliveryEligibility({
        state: dropoffLocation.state,
        district: dropoffLocation.district || dropoffLocation.city,
        postalCode: dropoffLocation.postalCode,
        latitude: dropoffLocation.latitude,
        longitude: dropoffLocation.longitude,
      }),
    ]);

    if (!pickupCheck.isDeliveryEligible) {
      throw new Error(`Delivery cannot be created: Pickup location is outside operational coverage (${pickupCheck.message}).`);
    }

    if (!dropoffCheck.isDeliveryEligible) {
      throw new Error(`Delivery cannot be created: Drop-off destination is outside operational coverage (${dropoffCheck.message}).`);
    }

    return { pickupCheck, dropoffCheck };
  }
}
