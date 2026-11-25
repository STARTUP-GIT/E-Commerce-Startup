export interface CreateProductInput {
  productname: string;
  productquantity: number;
  productprice: number;
  imageKey: string;
  categoryId?: string;
  fulfilmentType?: 'READY_TO_SHIP' | 'MADE_TO_ORDER';
  minPrepDays?: number;
  maxPrepDays?: number;
  prepTimeType?: 'CALENDAR_DAYS' | 'BUSINESS_DAYS';
  productionNotes?: string;
  maxConcurrentOrders?: number;
}

export interface EditProductInput {
  productquantity: number;
  productprice: number;
  imageKey: string;
  categoryId?: string;
  fulfilmentType?: 'READY_TO_SHIP' | 'MADE_TO_ORDER';
  minPrepDays?: number;
  maxPrepDays?: number;
  prepTimeType?: 'CALENDAR_DAYS' | 'BUSINESS_DAYS';
  productionNotes?: string;
  maxConcurrentOrders?: number;
}

export const productService = {
  validateCreate: (data: CreateProductInput): { valid: boolean; error?: string } => {
    if (!data.productname || data.productname.length < 3) {
      return { valid: false, error: 'Product name must be at least 3 characters' };
    }
    if (data.fulfilmentType === 'MADE_TO_ORDER') {
      if (!data.minPrepDays || data.minPrepDays < 1) {
        return { valid: false, error: 'Minimum preparation time must be at least 1 day' };
      }
      if (!data.maxPrepDays || data.maxPrepDays < data.minPrepDays) {
        return { valid: false, error: 'Maximum preparation time cannot be less than minimum' };
      }
      if (data.maxConcurrentOrders !== undefined && data.maxConcurrentOrders < 0) {
        return { valid: false, error: 'Max concurrent orders cannot be negative' };
      }
    } else {
      if (data.productquantity < 1) {
        return { valid: false, error: 'Stock quantity must be at least 1 for ready to ship products' };
      }
    }
    if (data.productprice <= 0) {
      return { valid: false, error: 'Price must be greater than 0' };
    }
    if (!data.imageKey) {
      return { valid: false, error: 'Please upload a product image' };
    }
    return { valid: true };
  },

  validateEdit: (data: EditProductInput): { valid: boolean; error?: string } => {
    if (data.fulfilmentType === 'MADE_TO_ORDER') {
      if (!data.minPrepDays || data.minPrepDays < 1) {
        return { valid: false, error: 'Minimum preparation time must be at least 1 day' };
      }
      if (!data.maxPrepDays || data.maxPrepDays < data.minPrepDays) {
        return { valid: false, error: 'Maximum preparation time cannot be less than minimum' };
      }
      if (data.maxConcurrentOrders !== undefined && data.maxConcurrentOrders < 0) {
        return { valid: false, error: 'Max concurrent orders cannot be negative' };
      }
    } else {
      if (data.productquantity < 0) {
        return { valid: false, error: 'Stock quantity cannot be negative' };
      }
    }
    if (data.productprice <= 0) {
      return { valid: false, error: 'Price must be greater than 0' };
    }
    if (!data.imageKey) {
      return { valid: false, error: 'Please upload a product image' };
    }
    return { valid: true };
  },

  formatPrepTime: (
    minDays?: number | null,
    maxDays?: number | null,
    prepTimeType?: string | null
  ): string => {
    if (!minDays && !maxDays) return 'Ready to Ship';
    const typeLabel = prepTimeType === 'BUSINESS_DAYS' ? 'biz days' : 'days';
    if (minDays === maxDays || !maxDays) {
      return `${minDays} ${typeLabel} prep`;
    }
    return `${minDays}–${maxDays} ${typeLabel} prep`;
  },

  formatPrice: (price?: number | null): string => {
    const val = Number(price || 0);
    return `₹${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },
};
