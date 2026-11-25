import { FulfilmentType, PrepTimeType } from "@prisma/client";

export interface FulfilmentInput {
  fulfilmentType?: FulfilmentType | string;
  stockQuantity?: number;
  minPrepDays?: number | null;
  maxPrepDays?: number | null;
  prepTimeType?: PrepTimeType | string | null;
  productionNotes?: string | null;
  maxConcurrentOrders?: number | null;
}

export interface ValidatedFulfilment {
  fulfilmentType: FulfilmentType;
  stockQuantity: number;
  minPrepDays: number | null;
  maxPrepDays: number | null;
  prepTimeType: PrepTimeType;
  productionNotes: string | null;
  maxConcurrentOrders: number | null;
}

export class FulfilmentService {
  /**
   * Validates fulfilment settings for product creation or editing.
   */
  static validate(input: FulfilmentInput, isCreate = false): { valid: boolean; error?: string; data?: ValidatedFulfilment } {
    const rawType = (input.fulfilmentType || "READY_TO_SHIP").toString().toUpperCase();
    
    if (rawType !== "READY_TO_SHIP" && rawType !== "MADE_TO_ORDER") {
      return { valid: false, error: "Fulfilment type must be either 'READY_TO_SHIP' or 'MADE_TO_ORDER'." };
    }

    const fulfilmentType = rawType as FulfilmentType;

    if (fulfilmentType === "READY_TO_SHIP") {
      const stock = input.stockQuantity !== undefined ? Number(input.stockQuantity) : (isCreate ? 0 : undefined);
      if (stock === undefined || isNaN(stock) || stock < 0 || (isCreate && stock <= 0)) {
        return { valid: false, error: isCreate ? "Stock quantity must be at least 1 for Ready to Ship products." : "Stock quantity cannot be negative." };
      }

      return {
        valid: true,
        data: {
          fulfilmentType: "READY_TO_SHIP",
          stockQuantity: Math.floor(stock),
          minPrepDays: null,
          maxPrepDays: null,
          prepTimeType: "BUSINESS_DAYS",
          productionNotes: null,
          maxConcurrentOrders: null,
        }
      };
    }

    // MADE_TO_ORDER validations
    const minDays = input.minPrepDays !== undefined && input.minPrepDays !== null ? Number(input.minPrepDays) : NaN;
    const maxDays = input.maxPrepDays !== undefined && input.maxPrepDays !== null ? Number(input.maxPrepDays) : NaN;

    if (isNaN(minDays) || minDays < 1) {
      return { valid: false, error: "Minimum preparation days is required and must be at least 1 day for Made to Order products." };
    }

    if (isNaN(maxDays) || maxDays < minDays) {
      return { valid: false, error: "Maximum preparation days is required and must be greater than or equal to minimum preparation days." };
    }

    if (maxDays > 365) {
      return { valid: false, error: "Maximum preparation days cannot exceed 365 days." };
    }

    let prepTimeType: PrepTimeType = "BUSINESS_DAYS";
    if (input.prepTimeType) {
      const rawPType = input.prepTimeType.toString().toUpperCase();
      if (rawPType === "CALENDAR_DAYS" || rawPType === "BUSINESS_DAYS") {
        prepTimeType = rawPType as PrepTimeType;
      } else {
        return { valid: false, error: "Preparation time type must be either 'BUSINESS_DAYS' or 'CALENDAR_DAYS'." };
      }
    }

    let maxCapacity: number | null = null;
    if (input.maxConcurrentOrders !== undefined && input.maxConcurrentOrders !== null && input.maxConcurrentOrders !== ("" as any)) {
      const cap = Number(input.maxConcurrentOrders);
      if (isNaN(cap) || cap < 1) {
        return { valid: false, error: "Maximum concurrent orders / capacity must be at least 1." };
      }
      maxCapacity = Math.floor(cap);
    }

    const notes = input.productionNotes?.trim() || null;
    if (notes && notes.length > 1000) {
      return { valid: false, error: "Production notes cannot exceed 1000 characters." };
    }

    // For Made to Order, stock quantity defaults to 0 or capacity limit if provided
    const stockQuantity = input.stockQuantity !== undefined && !isNaN(Number(input.stockQuantity))
      ? Math.max(0, Math.floor(Number(input.stockQuantity)))
      : (maxCapacity ?? 9999);

    return {
      valid: true,
      data: {
        fulfilmentType: "MADE_TO_ORDER",
        stockQuantity,
        minPrepDays: Math.floor(minDays),
        maxPrepDays: Math.floor(maxDays),
        prepTimeType,
        productionNotes: notes,
        maxConcurrentOrders: maxCapacity,
      }
    };
  }

  /**
   * Adds calendar or business days to a given start date.
   * Business days skip Saturdays (6) and Sundays (0).
   */
  static addDays(startDate: Date, days: number, prepType: PrepTimeType | string = "BUSINESS_DAYS"): Date {
    const result = new Date(startDate);
    const isBusiness = (prepType || "BUSINESS_DAYS").toString().toUpperCase() === "BUSINESS_DAYS";

    if (!isBusiness) {
      result.setDate(result.getDate() + days);
      return result;
    }

    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      // Skip Sunday (0) and Saturday (6)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        added++;
      }
    }

    return result;
  }

  /**
   * Calculates minimum and maximum readiness dates for a product/item snapshot.
   */
  static calculateItemReadiness(
    startDate: Date,
    item: {
      fulfilmentType?: FulfilmentType | string | null;
      minPrepDays?: number | null;
      maxPrepDays?: number | null;
      prepTimeType?: PrepTimeType | string | null;
    }
  ): { minReadyDate: Date; maxReadyDate: Date; isMadeToOrder: boolean } {
    const isMTO = (item.fulfilmentType || "").toString().toUpperCase() === "MADE_TO_ORDER";
    if (isMTO && item.minPrepDays && item.maxPrepDays) {
      const type = item.prepTimeType || "BUSINESS_DAYS";
      return {
        minReadyDate: this.addDays(startDate, item.minPrepDays, type),
        maxReadyDate: this.addDays(startDate, item.maxPrepDays, type),
        isMadeToOrder: true,
      };
    }

    // Ready to ship: ready within 1 calendar day
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return {
      minReadyDate: new Date(startDate),
      maxReadyDate: nextDay,
      isMadeToOrder: false,
    };
  }

  /**
   * For orders containing multiple products, calculate the preparation readiness using
   * the latest applicable item readiness date.
   */
  static calculateOrderReadiness(
    startDate: Date,
    items: Array<{
      fulfilmentType?: FulfilmentType | string | null;
      minPrepDays?: number | null;
      maxPrepDays?: number | null;
      prepTimeType?: PrepTimeType | string | null;
    }>
  ): { targetReadyDate: Date; hasMadeToOrder: boolean; latestEstimatedDate: Date } {
    let hasMadeToOrder = false;
    let latestEstimatedDate = new Date(startDate);

    for (const item of items) {
      const readiness = this.calculateItemReadiness(startDate, item);
      if (readiness.isMadeToOrder) {
        hasMadeToOrder = true;
      }
      if (readiness.maxReadyDate.getTime() > latestEstimatedDate.getTime()) {
        latestEstimatedDate = readiness.maxReadyDate;
      }
    }

    return {
      targetReadyDate: latestEstimatedDate,
      hasMadeToOrder,
      latestEstimatedDate,
    };
  }
}
