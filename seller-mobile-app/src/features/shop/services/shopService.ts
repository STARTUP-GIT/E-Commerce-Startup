export interface ShopSetupInput {
  shopName: string;
  slug: string;
  description: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string;
  placeId?: string;
  doorNo?: string;
  buildingName?: string;
  street?: string;
  cross?: string;
  area?: string;
  landmark?: string;
  locationSource?: string;
  accuracyMeters?: number | null;
}

export interface BankDetailsInput {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
}

export const shopService = {
  validateShopSetup: (
    data: Partial<ShopSetupInput>,
    districtRequired: boolean
  ): { valid: boolean; error?: string } => {
    if (!data.shopName || data.shopName.length < 3) {
      return { valid: false, error: 'Shop name must be at least 3 characters' };
    }
    if (!data.slug || !/^[a-z0-9-]+$/.test(data.slug)) {
      return { valid: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' };
    }
    if (!data.phone || data.phone.length < 10) {
      return { valid: false, error: 'Please enter a valid phone number' };
    }
    const effectiveAddress = (data.doorNo && data.street)
      ? `${data.doorNo}, ${data.street}`
      : data.addressLine1;
    if (!effectiveAddress || effectiveAddress.length < 3) {
      return { valid: false, error: 'Door/Shop number and street address are required' };
    }
    if (!data.state) {
      return { valid: false, error: 'State selection is required' };
    }
    if (districtRequired && (!data.city || !data.city.trim())) {
      return { valid: false, error: 'District selection is required' };
    }
    if (!data.postalCode || !/^[1-9][0-9]{5}$/.test(data.postalCode.trim())) {
      return { valid: false, error: 'Valid 6-digit Indian PIN code is required' };
    }
    return { valid: true };
  },

  validateBankDetails: (data: BankDetailsInput): { valid: boolean; error?: string } => {
    if (!data.accountHolderName?.trim()) {
      return { valid: false, error: 'Account holder name is required' };
    }
    if (!data.bankName?.trim()) {
      return { valid: false, error: 'Bank name is required' };
    }
    if (!data.accountNumber || data.accountNumber.length < 8) {
      return { valid: false, error: 'Please enter a valid account number' };
    }
    if (!data.ifscCode || data.ifscCode.length < 4) {
      return { valid: false, error: 'IFSC code is required' };
    }
    return { valid: true };
  },

  getApprovalStatusColor: (status?: string): 'default' | 'success' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'default';
      case 'REJECTED':
      case 'SUSPENDED':
      case 'DISABLED':
        return 'destructive';
      default:
        return 'secondary';
    }
  },
};
