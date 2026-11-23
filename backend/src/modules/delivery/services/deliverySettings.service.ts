import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { Prisma } from "@prisma/client";

export interface DeliveryFinancialQuote {
  distanceKm: number;
  baseChargePaise: number;
  distanceChargePaise: number;
  additionalChargePaise: number;
  deliveryFeePaise: number;
  riderPayoutPercentage: number;
  riderPayoutPaise: number;
  platformCommissionPaise: number;
}

export interface OperationalDeliveryCoverageResult {
  primaryActiveCity: string | null;
  totalOperationalDistricts: number;
  totalOperationalTowns: number;
  totalOperationalServiceAreas: number;
  operationalDistricts: Array<{
    id: string;
    name: string;
    displayName: string | null;
    state: string;
    displayOrder: number;
    operationalTownsCount: number;
    operationalServiceAreasCount: number;
    towns: string[];
    serviceAreas: string[];
  }>;
  activeLocations: string[];
  isCoverageOperational: boolean;
  statusMessage: string;
}

export class DeliverySettingsService {
  private static cachedSettings: any = null;
  private static lastCacheTime = 0;
  private static CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

  static invalidateCache() {
    this.cachedSettings = null;
    this.lastCacheTime = 0;
  }

  /**
   * Authoritative calculation of operational delivery locations from the database.
   * Considers:
   * 1. State availability (State isActive).
   * 2. District master availability (City isActive, maintenanceMode == false, launchStatus == 'LAUNCHED', isDeliveryEnabled == true).
   * 3. Town availability, where applicable (CityTown isActive, launchStatus == 'LAUNCHED').
   * 4. Service-area availability, where applicable (ServiceArea isActive == true, deliveryEligible == true).
   */
  static async getOperationalDeliveryCoverage(): Promise<OperationalDeliveryCoverageResult> {
    try {
      // 1. Fetch active states
      const activeStates = await prisma.state.findMany({
        where: { isActive: true },
        select: { name: true }
      });
      const activeStateNames = new Set(activeStates.map((s) => s.name.toLowerCase()));

      // 2. Query districts that satisfy strict delivery operational rules:
      // - District master is active (isActive == true)
      // - Delivery is explicitly enabled (isDeliveryEnabled == true)
      // - Maintenance mode is off (maintenanceMode == false)
      // - Launch status is launched (launchStatus == "LAUNCHED")
      const candidateDistricts = await prisma.city.findMany({
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

      // 3. Filter by parent state availability if state table has records
      const operationalDistricts = candidateDistricts.filter((d) => {
        if (activeStates.length > 0) {
          return activeStateNames.has(d.state.toLowerCase());
        }
        return true;
      });

      let totalOperationalTowns = 0;
      let totalOperationalServiceAreas = 0;
      const allActiveLocations = new Set<string>();

      const formattedDistricts = operationalDistricts.map((d) => {
        const canonicalDistrictName = d.displayName || d.name;
        allActiveLocations.add(canonicalDistrictName);

        const activeTownIds = new Set(d.cityTowns.map((t) => t.id));
        const townNames = d.cityTowns.map((t) => t.displayName || t.name);
        townNames.forEach((t) => allActiveLocations.add(t));
        totalOperationalTowns += townNames.length;

        // Valid service areas must have parent town active if child of a town
        const validServiceAreas = d.serviceAreas.filter((a) => {
          if (a.cityTownId) {
            return activeTownIds.has(a.cityTownId);
          }
          return true;
        });

        const areaNames = validServiceAreas.map((a) => a.name);
        areaNames.forEach((a) => allActiveLocations.add(a));
        totalOperationalServiceAreas += areaNames.length;

        return {
          id: d.id,
          name: d.name,
          displayName: d.displayName,
          state: d.state,
          displayOrder: d.displayOrder,
          operationalTownsCount: townNames.length,
          operationalServiceAreasCount: areaNames.length,
          towns: townNames,
          serviceAreas: areaNames,
        };
      });

      const activeLocations = Array.from(allActiveLocations);
      const primaryActiveCity = formattedDistricts.length > 0
        ? (formattedDistricts[0].displayName || formattedDistricts[0].name)
        : null;

      const isCoverageOperational = formattedDistricts.length > 0;

      return {
        primaryActiveCity,
        totalOperationalDistricts: formattedDistricts.length,
        totalOperationalTowns,
        totalOperationalServiceAreas,
        operationalDistricts: formattedDistricts,
        activeLocations,
        isCoverageOperational,
        statusMessage: isCoverageOperational
          ? "Database synchronized"
          : "No delivery locations are currently operational.",
      };
    } catch (err: any) {
      logger.error(`[DeliverySettings] Error computing operational delivery coverage: ${err?.message}`);
      return {
        primaryActiveCity: null,
        totalOperationalDistricts: 0,
        totalOperationalTowns: 0,
        totalOperationalServiceAreas: 0,
        operationalDistricts: [],
        activeLocations: [],
        isCoverageOperational: false,
        statusMessage: "No delivery locations are currently operational.",
      };
    }
  }

  static async getEffectiveSettings() {
    const now = Date.now();
    if (this.cachedSettings && now - this.lastCacheTime < this.CACHE_TTL_MS) {
      return this.cachedSettings;
    }

    try {
      let settings = await prisma.deliveryGlobalSetting.findUnique({
        where: { id: 1 },
      });

      if (!settings) {
        settings = await prisma.deliveryGlobalSetting.create({
          data: {
            id: 1,
            brandName: "AtlasBasket Delivery",
            brandLogoUrl: null,
            brandFaviconUrl: null,
            brandTagline: "Local Delivery Fleet",
            riderPayoutPercentage: new Prisma.Decimal(90.0),
            platformCommissionPercentage: new Prisma.Decimal(10.0),
            baseChargePaise: 3000, // ₹30
            perKmChargePaise: 1000, // ₹10 per km
            minDeliveryChargePaise: 4000, // ₹40
            maxDeliveryRadiusMeters: 25000,
            assignmentTimeoutSeconds: 30,
            searchRadiusMeters: 5000,
            maxAssignmentAttempts: 3,
            maxMonthlyRiderCancellations: 5,
            damagePenaltyPercentage: new Prisma.Decimal(20.0),
            maxStrikesBeforeBan: 3,
            activeCity: "Not configured",
            activeCities: [],
            supportedVehicles: ["BICYCLE", "MOTORCYCLE", "SCOOTER", "EV"],
            isDeliveryServiceEnabled: true,
            heroBadgeText: "Local Delivery Network",
            heroHeadingLine1: "Deliver locally.",
            heroHeadingLine2: "Earn directly with every trip.",
            heroDescription: "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in operational districts. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.",
            showCardPayout: true,
            cardPayoutValue: "~90%",
            cardPayoutLabel: "Rider Payout",
            cardPayoutDesc: "Direct earnings share",
            showCardCity: true,
            cardCityValue: "",
            cardCityLabel: "Active Districts",
            cardCityDesc: "",
            showCardFee: true,
            cardFeeValue: "₹0 Free",
            cardFeeLabel: "Registration Fee",
            cardFeeDesc: "No upfront fees",
            showCardVehicles: true,
            cardVehiclesValue: "Bikes & EVs",
            cardVehiclesLabel: "Vehicles Welcome",
            cardVehiclesDesc: "Bicycles welcome",
          },
        });
      }

      // Compute authoritative operational delivery coverage dynamically
      const coverage = await this.getOperationalDeliveryCoverage();
      const effectiveSettings = {
        ...settings,
        activeCity: coverage.primaryActiveCity || "Not configured",
        activeCities: coverage.activeLocations,
        operationalCoverage: coverage,
      };

      this.cachedSettings = effectiveSettings;
      this.lastCacheTime = now;
      return effectiveSettings;
    } catch (err: any) {
      logger.error(`[DeliverySettings] Error fetching settings: ${err?.message}`);
      return {
        id: 1,
        brandName: "AtlasBasket Delivery",
        brandLogoUrl: null,
        brandFaviconUrl: null,
        brandTagline: "Local Delivery Fleet",
        riderPayoutPercentage: 90,
        platformCommissionPercentage: 10,
        baseChargePaise: 3000,
        perKmChargePaise: 1000,
        minDeliveryChargePaise: 4000,
        maxDeliveryRadiusMeters: 25000,
        assignmentTimeoutSeconds: 30,
        searchRadiusMeters: 5000,
        maxAssignmentAttempts: 3,
        maxMonthlyRiderCancellations: 5,
        damagePenaltyPercentage: 20,
        maxStrikesBeforeBan: 3,
        activeCity: "Not configured",
        activeCities: [],
        supportedVehicles: ["BICYCLE", "MOTORCYCLE", "SCOOTER", "EV"],
        isDeliveryServiceEnabled: true,
        heroBadgeText: "Now Launching Delivery Operations",
        heroHeadingLine1: "Deliver locally.",
        heroHeadingLine2: "Earn directly with every trip.",
        heroDescription: "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in admin-approved operational districts.",
        showCardPayout: true,
        cardPayoutValue: "~90%",
        cardPayoutLabel: "Rider Payout",
        cardPayoutDesc: "Direct earnings share",
        showCardCity: true,
        cardCityValue: "Not configured",
        cardCityLabel: "Active City",
        cardCityDesc: "Local delivery zones",
        showCardFee: true,
        cardFeeValue: "₹0 Free",
        cardFeeLabel: "Registration Fee",
        cardFeeDesc: "No upfront fees",
        showCardVehicles: true,
        cardVehiclesValue: "Bikes & EVs",
        cardVehiclesLabel: "Vehicles Welcome",
        cardVehiclesDesc: "Bicycles welcome",
      };
    }
  }

  static async updateSettings(
    adminId: string,
    payload: {
      brandName?: string;
      brandLogoUrl?: string | null;
      brandFaviconUrl?: string | null;
      brandTagline?: string;
      riderPayoutPercentage?: number;
      platformCommissionPercentage?: number;
      baseChargePaise?: number;
      perKmChargePaise?: number;
      minDeliveryChargePaise?: number;
      maxDeliveryRadiusMeters?: number;
      assignmentTimeoutSeconds?: number;
      searchRadiusMeters?: number;
      maxAssignmentAttempts?: number;
      maxMonthlyRiderCancellations?: number;
      damagePenaltyPercentage?: number;
      maxStrikesBeforeBan?: number;
      activeCity?: string;
      activeCities?: string[];
      supportedVehicles?: string[];
      isDeliveryServiceEnabled?: boolean;
      heroBadgeText?: string;
      heroHeadingLine1?: string;
      heroHeadingLine2?: string;
      heroDescription?: string;
      showCardPayout?: boolean;
      cardPayoutValue?: string;
      cardPayoutLabel?: string;
      cardPayoutDesc?: string;
      showCardCity?: boolean;
      cardCityValue?: string;
      cardCityLabel?: string;
      cardCityDesc?: string;
      showCardFee?: boolean;
      cardFeeValue?: string;
      cardFeeLabel?: string;
      cardFeeDesc?: string;
      showCardVehicles?: boolean;
      cardVehiclesValue?: string;
      cardVehiclesLabel?: string;
      cardVehiclesDesc?: string;
    },
    reason = "Admin settings update"
  ) {
    const current = await this.getEffectiveSettings();

    // Remove activeCity and activeCities from payload to guarantee manual location entry cannot overwrite DB coverage
    const sanitizedPayload: any = { ...payload };
    delete sanitizedPayload.activeCity;
    delete sanitizedPayload.activeCities;

    const updateData: any = {
      updatedByAdminId: adminId,
    };

    const auditEntries: Array<{
      adminId: string;
      settingKey: string;
      previousValue: string;
      newValue: string;
      reason: string;
    }> = [];

    for (const [key, val] of Object.entries(sanitizedPayload)) {
      if (typeof val !== "undefined" && val !== null) {
        if (key.includes("Percentage")) {
          updateData[key] = new Prisma.Decimal(Number(val));
        } else {
          updateData[key] = val;
        }

        const prev = String(current[key] ?? "");
        const next = String(val);
        if (prev !== next) {
          auditEntries.push({
            adminId,
            settingKey: key,
            previousValue: prev,
            newValue: next,
            reason,
          });
        }
      }
    }

    // Auto balance platform commission if payout % changed
    if (sanitizedPayload.riderPayoutPercentage && !sanitizedPayload.platformCommissionPercentage) {
      const comm = Math.max(0, 100 - Number(sanitizedPayload.riderPayoutPercentage));
      updateData.platformCommissionPercentage = new Prisma.Decimal(comm);
    }

    // Keep database activeCity & activeCities columns synced with actual database operational coverage
    const coverage = await this.getOperationalDeliveryCoverage();
    updateData.activeCity = coverage.primaryActiveCity || "Not configured";
    updateData.activeCities = coverage.activeLocations;

    const updated = await prisma.deliveryGlobalSetting.update({
      where: { id: 1 },
      data: updateData,
    });

    if (auditEntries.length > 0) {
      await prisma.deliverySettingsAuditLog.createMany({
        data: auditEntries,
      });
    }

    this.invalidateCache();
    logger.info(`[DeliverySettings] Global settings updated by admin: ${adminId}`);
    return {
      ...updated,
      activeCity: coverage.primaryActiveCity || "Not configured",
      activeCities: coverage.activeLocations,
      operationalCoverage: coverage,
    };
  }

  static async calculateQuote(
    distanceKm: number,
    additionalChargePaise: number = 0
  ): Promise<DeliveryFinancialQuote> {
    const settings = await this.getEffectiveSettings();

    const baseChargePaise = settings.baseChargePaise;
    const perKmChargePaise = settings.perKmChargePaise;
    const minDeliveryChargePaise = settings.minDeliveryChargePaise;
    const riderPayoutPct = Number(settings.riderPayoutPercentage);

    const distanceChargePaise = Math.round(distanceKm * perKmChargePaise);
    const calculatedFee = baseChargePaise + distanceChargePaise + additionalChargePaise;
    const deliveryFeePaise = Math.max(minDeliveryChargePaise, calculatedFee);

    const riderPayoutPaise = Math.round((deliveryFeePaise * riderPayoutPct) / 100);
    const platformCommissionPaise = deliveryFeePaise - riderPayoutPaise;

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      baseChargePaise,
      distanceChargePaise,
      additionalChargePaise,
      deliveryFeePaise,
      riderPayoutPercentage: riderPayoutPct,
      riderPayoutPaise,
      platformCommissionPaise,
    };
  }
}
