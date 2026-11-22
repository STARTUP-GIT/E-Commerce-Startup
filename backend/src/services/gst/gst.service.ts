import { prisma } from "../../config/prisma.js";
import { Prisma } from "@prisma/client";

/**
 * Official Indian State and Union Territory GST Codes (2-digit)
 */
export const INDIAN_STATE_GST_CODES: Record<string, { code: string; name: string }> = {
  "01": { code: "01", name: "Jammu and Kashmir" },
  "02": { code: "02", name: "Himachal Pradesh" },
  "03": { code: "03", name: "Punjab" },
  "04": { code: "04", name: "Chandigarh" },
  "05": { code: "05", name: "Uttarakhand" },
  "06": { code: "06", name: "Haryana" },
  "07": { code: "07", name: "Delhi" },
  "08": { code: "08", name: "Rajasthan" },
  "09": { code: "09", name: "Uttar Pradesh" },
  "10": { code: "10", name: "Bihar" },
  "11": { code: "11", name: "Sikkim" },
  "12": { code: "12", name: "Arunachal Pradesh" },
  "13": { code: "13", name: "Nagaland" },
  "14": { code: "14", name: "Manipur" },
  "15": { code: "15", name: "Mizoram" },
  "16": { code: "16", name: "Tripura" },
  "17": { code: "17", name: "Meghalaya" },
  "18": { code: "18", name: "Assam" },
  "19": { code: "19", name: "West Bengal" },
  "20": { code: "20", name: "Jharkhand" },
  "21": { code: "21", name: "Odisha" },
  "22": { code: "22", name: "Chhattisgarh" },
  "23": { code: "23", name: "Madhya Pradesh" },
  "24": { code: "24", name: "Gujarat" },
  "25": { code: "25", name: "Daman and Diu" },
  "26": { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  "27": { code: "27", name: "Maharashtra" },
  "28": { code: "28", name: "Andhra Pradesh (Old)" },
  "29": { code: "29", name: "Karnataka" },
  "30": { code: "30", name: "Goa" },
  "31": { code: "31", name: "Lakshadweep" },
  "32": { code: "32", name: "Kerala" },
  "33": { code: "33", name: "Tamil Nadu" },
  "34": { code: "34", name: "Puducherry" },
  "35": { code: "35", name: "Andaman and Nicobar Islands" },
  "36": { code: "36", name: "Telangana" },
  "37": { code: "37", name: "Andhra Pradesh" },
  "38": { code: "38", name: "Ladakh" },
  "97": { code: "97", name: "Other Territory" }
};

/**
 * Standard Indian GST Rates
 */
export const STANDARD_GST_RATES = [0, 5, 12, 18, 28];

/**
 * Resolve Indian State Name or Code into authoritative { name, code }
 */
export function resolveIndianState(input?: string | null): { name: string; code: string } {
  if (!input) {
    return { name: "Karnataka", code: "29" }; // Fallback to primary platform state
  }
  const clean = input.trim().toLowerCase();

  // Match by 2-digit code
  if (/^\d{2}$/.test(clean) && INDIAN_STATE_GST_CODES[clean]) {
    return INDIAN_STATE_GST_CODES[clean];
  }

  // Match by state name
  for (const entry of Object.values(INDIAN_STATE_GST_CODES)) {
    if (entry.name.toLowerCase() === clean) {
      return entry;
    }
  }

  // Common aliases
  if (clean === "ka" || clean.includes("karnat")) return { name: "Karnataka", code: "29" };
  if (clean === "mh" || clean.includes("maharas")) return { name: "Maharashtra", code: "27" };
  if (clean === "dl" || clean.includes("delhi")) return { name: "Delhi", code: "07" };
  if (clean === "tn" || clean.includes("tamil")) return { name: "Tamil Nadu", code: "33" };
  if (clean === "kl" || clean.includes("kerala")) return { name: "Kerala", code: "32" };
  if (clean === "ts" || clean.includes("telang")) return { name: "Telangana", code: "36" };
  if (clean === "ap" || clean.includes("andhra")) return { name: "Andhra Pradesh", code: "37" };
  if (clean === "up" || clean.includes("uttar p")) return { name: "Uttar Pradesh", code: "09" };
  if (clean === "wb" || clean.includes("bengal")) return { name: "West Bengal", code: "19" };
  if (clean === "gj" || clean.includes("gujarat")) return { name: "Gujarat", code: "24" };
  if (clean === "rj" || clean.includes("rajasthan")) return { name: "Rajasthan", code: "08" };
  if (clean === "ga" || clean.includes("goa")) return { name: "Goa", code: "30" };

  return { name: input.trim(), code: "29" };
}

/**
 * Extract state code from a 15-character Indian GSTIN
 */
export function extractStateCodeFromGstin(gstin?: string | null): string | null {
  if (!gstin) return null;
  const clean = gstin.trim().toUpperCase();
  const match = clean.match(/^([0-9]{2})[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/);
  return match ? match[1] : null;
}

/**
 * Validate a 15-character Indian GSTIN
 */
export function isValidGstin(gstin?: string | null): boolean {
  if (!gstin) return false;
  const clean = gstin.trim().toUpperCase();
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean);
}

/**
 * Rounding helper for currency amounts in INR (deterministic 2 decimal places)
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export interface GstTaxLine {
  taxableValue: number;
  rate: number;
  isInterState: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  lineTotal: number;
}

export interface ProductTaxItemCalculation {
  productId: string;
  productVariantId?: string | null;
  productName: string;
  sku: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxCategory: string;
  isTaxInclusive: boolean;
  taxLine: GstTaxLine;
}

export interface SellerTaxCalculation {
  sellerId: string;
  sellerState: string;
  sellerStateCode: string;
  placeOfSupplyState: string;
  placeOfSupplyCode: string;
  isInterState: boolean;
  subtotal: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  packingFee: number;
  shippingAmount: number;
  // TCS under Section 52
  isTcsApplicable: boolean;
  tcsCgstRate: number;
  tcsCgstAmount: number;
  tcsSgstRate: number;
  tcsSgstAmount: number;
  tcsIgstRate: number;
  tcsIgstAmount: number;
  totalTcsAmount: number;
  // Platform Commission & Service Tax
  platformCommission: number;
  commissionGstRate: number;
  commissionGstAmount: number;
  sellerEarnings: number;
  items: ProductTaxItemCalculation[];
}

export interface OrderGstBreakdown {
  isEnabled: boolean;
  supplierPlatformState: string;
  supplierPlatformStateCode: string;
  placeOfSupplyState: string;
  placeOfSupplyCode: string;
  isInterState: boolean;
  productTaxableTotal: number;
  productCgstTotal: number;
  productSgstTotal: number;
  productIgstTotal: number;
  productTaxTotal: number;
  platformFeeAmount: number;
  platformFeeTaxable: number;
  platformFeeSac: string;
  platformFeeGstRate: number;
  platformFeeCgstAmount: number;
  platformFeeSgstAmount: number;
  platformFeeIgstAmount: number;
  platformFeeTaxTotal: number;
  deliveryFeeAmount: number;
  deliveryTaxAmount: number;
  totalTaxAmount: number;
  grandTotal: number;
  sellers: SellerTaxCalculation[];
}

export class IndianGstService {
  /**
   * Fetch authoritative GST Master Config with caching / fallback
   */
  static async getMasterConfig() {
    let config = await prisma.gstMasterConfig.findUnique({ where: { id: 1 } });
    if (!config) {
      config = await prisma.gstMasterConfig.create({
        data: {
          id: 1,
          isEnabled: true,
          isMandatoryTcsEnabled: true,
          defaultPlatformFeeSac: "998319",
          platformFeeGstRate: new Prisma.Decimal(18.0),
          defaultCommissionSac: "996111",
          commissionGstRate: new Prisma.Decimal(18.0),
          deliveryServiceSac: "996813",
          deliveryGstRate: new Prisma.Decimal(18.0),
          tcsIntraStateCgstRate: new Prisma.Decimal(0.25),
          tcsIntraStateSgstRate: new Prisma.Decimal(0.25),
          tcsInterStateIgstRate: new Prisma.Decimal(0.50),
          invoicePrefixSeller: "INV-SEL-",
          invoicePrefixPlatform: "INV-AB-",
          creditNotePrefix: "CN-AB-"
        }
      });
    }
    return config;
  }

  /**
   * Fetch authoritative Business GST Registration details
   */
  static async getBusinessRegistration() {
    let reg = await prisma.businessGstRegistration.findUnique({ where: { id: 1 } });
    if (!reg) {
      reg = await prisma.businessGstRegistration.create({
        data: {
          id: 1,
          legalName: "AtlasBasket Technologies Private Limited",
          tradeName: "AtlasBasket",
          state: "Karnataka",
          stateCode: "29",
          registrationType: "REGULAR",
          status: "ACTIVE",
          registeredAddress: "No. 42, Outer Ring Road, Bengaluru, Karnataka, 560103",
          principalPlaceOfBusiness: "Bengaluru, Karnataka",
          verificationStatus: "UNVERIFIED"
        }
      });
    }
    return reg;
  }

  /**
   * Calculate GST Line for a single value and rate
   */
  static calculateTaxLine(params: {
    unitPrice: number;
    quantity: number;
    discountAmount?: number;
    rate: number;
    isTaxInclusive?: boolean;
    isInterState: boolean;
  }): GstTaxLine {
    const { unitPrice, quantity, discountAmount = 0, rate, isTaxInclusive = false, isInterState } = params;
    const gross = unitPrice * quantity;
    const afterDiscount = Math.max(0, gross - discountAmount);

    if (rate <= 0) {
      return {
        taxableValue: roundCurrency(afterDiscount),
        rate: 0,
        isInterState,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 0,
        igstAmount: 0,
        totalTax: 0,
        lineTotal: roundCurrency(afterDiscount)
      };
    }

    if (isTaxInclusive) {
      // Inclusive pricing: Line Total is known, derive taxable value
      const lineTotal = roundCurrency(afterDiscount);
      const taxableValue = roundCurrency(lineTotal / (1 + rate / 100));
      const totalTax = roundCurrency(lineTotal - taxableValue);

      if (isInterState) {
        return {
          taxableValue,
          rate,
          isInterState: true,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: rate,
          igstAmount: totalTax,
          totalTax,
          lineTotal
        };
      } else {
        const halfRate = rate / 2;
        const cgstAmount = roundCurrency(totalTax / 2);
        const sgstAmount = roundCurrency(totalTax - cgstAmount); // Ensure no fractional discrepancy
        return {
          taxableValue,
          rate,
          isInterState: false,
          cgstRate: halfRate,
          cgstAmount,
          sgstRate: halfRate,
          sgstAmount,
          igstRate: 0,
          igstAmount: 0,
          totalTax,
          lineTotal
        };
      }
    } else {
      // Exclusive pricing: Add tax on top of taxable value
      const taxableValue = roundCurrency(afterDiscount);
      const totalTax = roundCurrency(taxableValue * (rate / 100));
      const lineTotal = roundCurrency(taxableValue + totalTax);

      if (isInterState) {
        return {
          taxableValue,
          rate,
          isInterState: true,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: rate,
          igstAmount: totalTax,
          totalTax,
          lineTotal
        };
      } else {
        const halfRate = rate / 2;
        const cgstAmount = roundCurrency(taxableValue * (halfRate / 100));
        const sgstAmount = roundCurrency(totalTax - cgstAmount);
        return {
          taxableValue,
          rate,
          isInterState: false,
          cgstRate: halfRate,
          cgstAmount,
          sgstRate: halfRate,
          sgstAmount,
          igstRate: 0,
          igstAmount: 0,
          totalTax,
          lineTotal
        };
      }
    }
  }

  /**
   * Determine Place of Supply and calculate complete GST breakdown for an order
   */
  static async calculateOrderGst(params: {
    cartItems: any[];
    shippingAddress: { state?: string | null; postalCode?: string | null; country?: string | null };
    platformFeeAmount?: number;
    platformFeeEnabled?: boolean;
    deliveryFeeAmount?: number;
    customCommissionRatesBySeller?: Map<string, number>;
  }): Promise<OrderGstBreakdown> {
    const config = await this.getMasterConfig();
    const businessReg = await this.getBusinessRegistration();

    const isGstEnabled = config.isEnabled;
    const recipientLocation = resolveIndianState(params.shippingAddress?.state);
    const platformLocation = {
      name: businessReg.state || "Karnataka",
      code: businessReg.stateCode || "29"
    };

    // 1. Group cart items by seller
    const itemsBySeller = new Map<string, any[]>();
    for (const item of params.cartItems) {
      const sellerId = item.product?.sellerId;
      if (!sellerId) continue;
      if (!itemsBySeller.has(sellerId)) {
        itemsBySeller.set(sellerId, []);
      }
      itemsBySeller.get(sellerId)!.push(item);
    }

    const sellersCalculations: SellerTaxCalculation[] = [];
    let productTaxableTotal = 0;
    let productCgstTotal = 0;
    let productSgstTotal = 0;
    let productIgstTotal = 0;
    let productTaxTotal = 0;

    // 2. Process each seller order
    for (const [sellerId, items] of itemsBySeller.entries()) {
      const firstItem = items[0];
      const seller = firstItem.product?.seller;
      const shop = seller?.shop;
      const pickupAddress = seller?.addresses?.find((a: any) => a.addressType === "PICKUP") || seller?.addresses?.[0];

      // Determine seller supplier state
      let sellerLocation = resolveIndianState(pickupAddress?.state || shop?.gstState || "Karnataka");
      if (shop?.gstNumber) {
        const codeFromGst = extractStateCodeFromGstin(shop.gstNumber);
        if (codeFromGst && INDIAN_STATE_GST_CODES[codeFromGst]) {
          sellerLocation = INDIAN_STATE_GST_CODES[codeFromGst];
        }
      }

      // Check Inter-State vs Intra-State
      const isInterState = sellerLocation.code !== recipientLocation.code;

      let sellerSubtotal = 0;
      let sellerTaxableAmount = 0;
      let sellerCgstAmount = 0;
      let sellerSgstAmount = 0;
      let sellerIgstAmount = 0;
      let sellerTotalTaxAmount = 0;

      const itemCalcs: ProductTaxItemCalculation[] = [];

      for (const it of items) {
        const prod = it.product;
        const variant = it.productVariant;
        const price = variant ? Number(variant.price) : Number(prod.price);
        const qty = it.quantity || 1;
        const subtotal = price * qty;
        sellerSubtotal += subtotal;

        // Resolve Product Tax Classification
        const isTaxable = !prod.taxCategory || prod.taxCategory === "TAXABLE";
        let applicableRate = 0;
        if (isGstEnabled && isTaxable) {
          if (prod.taxRate !== null && prod.taxRate !== undefined) {
            applicableRate = Number(prod.taxRate);
          } else {
            // Default rate for unclassified taxable product: 18% or configured default
            applicableRate = 18;
          }
        }

        const isTaxInclusive = prod.isTaxInclusive ?? (config.defaultProductTaxMode === "INCLUSIVE");

        const taxLine = this.calculateTaxLine({
          unitPrice: price,
          quantity: qty,
          rate: applicableRate,
          isTaxInclusive,
          isInterState
        });

        sellerTaxableAmount += taxLine.taxableValue;
        sellerCgstAmount += taxLine.cgstAmount;
        sellerSgstAmount += taxLine.sgstAmount;
        sellerIgstAmount += taxLine.igstAmount;
        sellerTotalTaxAmount += taxLine.totalTax;

        itemCalcs.push({
          productId: prod.id,
          productVariantId: variant?.id || null,
          productName: prod.name,
          sku: variant?.sku || prod.sku || "",
          hsnCode: prod.hsnCode || "9999",
          quantity: qty,
          unitPrice: price,
          discountAmount: 0,
          taxCategory: prod.taxCategory || "TAXABLE",
          isTaxInclusive,
          taxLine
        });
      }

      sellerTaxableAmount = roundCurrency(sellerTaxableAmount);
      sellerCgstAmount = roundCurrency(sellerCgstAmount);
      sellerSgstAmount = roundCurrency(sellerSgstAmount);
      sellerIgstAmount = roundCurrency(sellerIgstAmount);
      sellerTotalTaxAmount = roundCurrency(sellerTotalTaxAmount);

      // TCS Calculation under Section 52 (notified July 2024: 0.5% total)
      // Only for taxable supplies made through operator
      let tcsCgstRate = 0;
      let tcsCgstAmount = 0;
      let tcsSgstRate = 0;
      let tcsSgstAmount = 0;
      let tcsIgstRate = 0;
      let tcsIgstAmount = 0;
      let totalTcsAmount = 0;

      const isTcsApplicable = config.isMandatoryTcsEnabled && isGstEnabled && sellerTaxableAmount > 0;
      if (isTcsApplicable) {
        if (isInterState) {
          tcsIgstRate = Number(config.tcsInterStateIgstRate); // 0.50%
          tcsIgstAmount = roundCurrency(sellerTaxableAmount * (tcsIgstRate / 100));
          totalTcsAmount = tcsIgstAmount;
        } else {
          tcsCgstRate = Number(config.tcsIntraStateCgstRate); // 0.25%
          tcsSgstRate = Number(config.tcsIntraStateSgstRate); // 0.25%
          tcsCgstAmount = roundCurrency(sellerTaxableAmount * (tcsCgstRate / 100));
          tcsSgstAmount = roundCurrency(sellerTaxableAmount * (tcsSgstRate / 100));
          totalTcsAmount = roundCurrency(tcsCgstAmount + tcsSgstAmount);
        }
      }

      // Platform Commission & Service Tax on Commission
      const commissionPct = params.customCommissionRatesBySeller?.get(sellerId) ??
        (shop?.commissionPercentage !== undefined && shop?.commissionPercentage !== null ? Number(shop.commissionPercentage) : 10.0);
      const platformCommission = roundCurrency(sellerSubtotal * (commissionPct / 100));
      const commissionGstRate = isGstEnabled ? Number(config.commissionGstRate) : 0; // 18%
      const commissionGstAmount = isGstEnabled ? roundCurrency(platformCommission * (commissionGstRate / 100)) : 0;

      // Seller Earnings = Subtotal - Platform Commission - TCS
      const sellerEarnings = roundCurrency(sellerSubtotal - platformCommission);

      sellersCalculations.push({
        sellerId,
        sellerState: sellerLocation.name,
        sellerStateCode: sellerLocation.code,
        placeOfSupplyState: recipientLocation.name,
        placeOfSupplyCode: recipientLocation.code,
        isInterState,
        subtotal: roundCurrency(sellerSubtotal),
        taxableAmount: sellerTaxableAmount,
        cgstAmount: sellerCgstAmount,
        sgstAmount: sellerSgstAmount,
        igstAmount: sellerIgstAmount,
        totalTaxAmount: sellerTotalTaxAmount,
        packingFee: 0,
        shippingAmount: 0,
        isTcsApplicable,
        tcsCgstRate,
        tcsCgstAmount,
        tcsSgstRate,
        tcsSgstAmount,
        tcsIgstRate,
        tcsIgstAmount,
        totalTcsAmount,
        platformCommission,
        commissionGstRate,
        commissionGstAmount,
        sellerEarnings,
        items: itemCalcs
      });

      productTaxableTotal += sellerTaxableAmount;
      productCgstTotal += sellerCgstAmount;
      productSgstTotal += sellerSgstAmount;
      productIgstTotal += sellerIgstAmount;
      productTaxTotal += sellerTotalTaxAmount;
    }

    productTaxableTotal = roundCurrency(productTaxableTotal);
    productCgstTotal = roundCurrency(productCgstTotal);
    productSgstTotal = roundCurrency(productSgstTotal);
    productIgstTotal = roundCurrency(productIgstTotal);
    productTaxTotal = roundCurrency(productTaxTotal);

    // 3. Platform Fee Service Tax Calculation (AtlasBasket to Customer)
    let platformFeeAmount = 0;
    let platformFeeTaxable = 0;
    let platformFeeCgstAmount = 0;
    let platformFeeSgstAmount = 0;
    let platformFeeIgstAmount = 0;
    let platformFeeTaxTotal = 0;

    const feeActive = params.platformFeeEnabled !== false && (params.platformFeeAmount || 0) > 0;
    if (feeActive) {
      platformFeeAmount = roundCurrency(params.platformFeeAmount || 0);
      const isPlatformInterState = platformLocation.code !== recipientLocation.code;
      const feeRate = isGstEnabled ? Number(config.platformFeeGstRate) : 0; // 18%

      if (feeRate > 0) {
        if (config.platformFeeTaxMode === "INCLUSIVE") {
          platformFeeTaxable = roundCurrency(platformFeeAmount / (1 + feeRate / 100));
          platformFeeTaxTotal = roundCurrency(platformFeeAmount - platformFeeTaxable);
        } else {
          platformFeeTaxable = platformFeeAmount;
          platformFeeTaxTotal = roundCurrency(platformFeeAmount * (feeRate / 100));
        }

        if (isPlatformInterState) {
          platformFeeIgstAmount = platformFeeTaxTotal;
        } else {
          platformFeeCgstAmount = roundCurrency(platformFeeTaxTotal / 2);
          platformFeeSgstAmount = roundCurrency(platformFeeTaxTotal - platformFeeCgstAmount);
        }
      } else {
        platformFeeTaxable = platformFeeAmount;
      }
    }

    // 4. Delivery Charges & Tax
    const deliveryFeeAmount = roundCurrency(params.deliveryFeeAmount || 0);
    const deliveryTaxAmount = 0; // Handled under standard platform service or composite delivery rules

    const totalTaxAmount = roundCurrency(productTaxTotal + platformFeeTaxTotal + deliveryTaxAmount);

    // Calculate Grand Total: Products (if exclusive: taxable + tax; if inclusive: total) + Platform fee + Delivery fee
    let grandTotal = 0;
    for (const s of sellersCalculations) {
      for (const it of s.items) {
        grandTotal += it.taxLine.lineTotal;
      }
    }
    if (config.platformFeeTaxMode === "EXCLUSIVE") {
      grandTotal += platformFeeTaxable + platformFeeTaxTotal;
    } else {
      grandTotal += platformFeeAmount;
    }
    grandTotal += deliveryFeeAmount;
    grandTotal = roundCurrency(grandTotal);

    return {
      isEnabled: isGstEnabled,
      supplierPlatformState: platformLocation.name,
      supplierPlatformStateCode: platformLocation.code,
      placeOfSupplyState: recipientLocation.name,
      placeOfSupplyCode: recipientLocation.code,
      isInterState: platformLocation.code !== recipientLocation.code,
      productTaxableTotal,
      productCgstTotal,
      productSgstTotal,
      productIgstTotal,
      productTaxTotal,
      platformFeeAmount,
      platformFeeTaxable,
      platformFeeSac: config.defaultPlatformFeeSac || "998319",
      platformFeeGstRate: isGstEnabled ? Number(config.platformFeeGstRate) : 0,
      platformFeeCgstAmount,
      platformFeeSgstAmount,
      platformFeeIgstAmount,
      platformFeeTaxTotal,
      deliveryFeeAmount,
      deliveryTaxAmount,
      totalTaxAmount,
      grandTotal,
      sellers: sellersCalculations
    };
  }

  /**
   * Generate consecutive invoice number (thread-safe formatting)
   */
  static generateInvoiceNumber(prefix: string, sequenceNumber: number): string {
    const year = new Date().getFullYear();
    const padded = String(sequenceNumber).padStart(6, "0");
    return `${prefix}${year}-${padded}`;
  }

  /**
   * Record TCS Deduction into Ledger
   */
  static async recordTcsDeduction(params: {
    sellerId: string;
    sellerOrderId: string;
    orderId: string;
    taxableSupplyValue: number;
    isInterState: boolean;
    placeOfSupplyStateCode: string;
    cgstTcsRate: number;
    cgstTcsAmount: number;
    sgstTcsRate: number;
    sgstTcsAmount: number;
    igstTcsRate: number;
    igstTcsAmount: number;
    totalTcsAmount: number;
    taxPeriodMonth?: string;
  }) {
    const month = params.taxPeriodMonth || new Date().toISOString().slice(0, 7); // e.g. "2026-11"
    return await prisma.gstTcsLedger.create({
      data: {
        sellerId: params.sellerId,
        sellerOrderId: params.sellerOrderId,
        orderId: params.orderId,
        transactionType: "COLLECTION",
        taxPeriodMonth: month,
        taxableSupplyValue: new Prisma.Decimal(params.taxableSupplyValue),
        isInterState: params.isInterState,
        placeOfSupplyStateCode: params.placeOfSupplyStateCode,
        cgstTcsRate: new Prisma.Decimal(params.cgstTcsRate),
        cgstTcsAmount: new Prisma.Decimal(params.cgstTcsAmount),
        sgstTcsRate: new Prisma.Decimal(params.sgstTcsRate),
        sgstTcsAmount: new Prisma.Decimal(params.sgstTcsAmount),
        igstTcsRate: new Prisma.Decimal(params.igstTcsRate),
        igstTcsAmount: new Prisma.Decimal(params.igstTcsAmount),
        totalTcsAmount: new Prisma.Decimal(params.totalTcsAmount),
        remittedStatus: "PENDING"
      }
    });
  }

  /**
   * Record TCS Reversal for Returned / Refunded Order
   */
  static async recordTcsReturnReversal(params: {
    sellerId: string;
    sellerOrderId: string;
    orderId: string;
    returnedSupplyValue: number;
    isInterState: boolean;
    placeOfSupplyStateCode: string;
    cgstTcsRate: number;
    sgstTcsRate: number;
    igstTcsRate: number;
  }) {
    const month = new Date().toISOString().slice(0, 7);
    const cgstTcsAmount = roundCurrency(params.returnedSupplyValue * (params.cgstTcsRate / 100));
    const sgstTcsAmount = roundCurrency(params.returnedSupplyValue * (params.sgstTcsRate / 100));
    const igstTcsAmount = roundCurrency(params.returnedSupplyValue * (params.igstTcsRate / 100));
    const totalTcsAmount = roundCurrency(cgstTcsAmount + sgstTcsAmount + igstTcsAmount);

    return await prisma.gstTcsLedger.create({
      data: {
        sellerId: params.sellerId,
        sellerOrderId: params.sellerOrderId,
        orderId: params.orderId,
        transactionType: "RETURN_REVERSAL",
        taxPeriodMonth: month,
        taxableSupplyValue: new Prisma.Decimal(-params.returnedSupplyValue),
        isInterState: params.isInterState,
        placeOfSupplyStateCode: params.placeOfSupplyStateCode,
        cgstTcsRate: new Prisma.Decimal(params.cgstTcsRate),
        cgstTcsAmount: new Prisma.Decimal(-cgstTcsAmount),
        sgstTcsRate: new Prisma.Decimal(params.sgstTcsRate),
        sgstTcsAmount: new Prisma.Decimal(-sgstTcsAmount),
        igstTcsRate: new Prisma.Decimal(params.igstTcsRate),
        igstTcsAmount: new Prisma.Decimal(-igstTcsAmount),
        totalTcsAmount: new Prisma.Decimal(-totalTcsAmount),
        remittedStatus: "PENDING"
      }
    });
  }
}
