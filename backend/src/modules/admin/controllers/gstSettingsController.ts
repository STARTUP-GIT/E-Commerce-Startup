import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType, Prisma } from "@prisma/client";
import {
  IndianGstService,
  isValidGstin,
  extractStateCodeFromGstin,
  resolveIndianState,
  INDIAN_STATE_GST_CODES
} from "../../../services/gst/gst.service.js";
import { seedHsnCatalogueIfEmpty } from "../../../services/gst/hsnCatalogueData.js";

/**
 * GET /api/admin/settings/gst
 * Comprehensive Indian GST configuration overview
 */
export const getIndianGstConfiguration = async (req: Request, res: Response) => {
  try {
    await seedHsnCatalogueIfEmpty();

    const masterConfig = await IndianGstService.getMasterConfig();
    const businessRegistration = await IndianGstService.getBusinessRegistration();
    const hsnRates = await prisma.hsnRateMaster.findMany({
      orderBy: { hsnCode: "asc" }
    });

    // TCS metrics summary
    const tcsAgg = await prisma.gstTcsLedger.aggregate({
      _sum: { totalTcsAmount: true, taxableSupplyValue: true },
      _count: { id: true }
    });

    const pendingTcsAgg = await prisma.gstTcsLedger.aggregate({
      where: { remittedStatus: "PENDING" },
      _sum: { totalTcsAmount: true }
    });

    const lastAuditLog = await prisma.adminAction.findFirst({
      where: {
        actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
        targetType: "GST"
      },
      orderBy: { performedAt: "desc" },
      include: { admin: { select: { firstName: true, lastName: true, email: true } } }
    });

    return res.status(200).json({
      masterConfig,
      businessRegistration,
      hsnRates,
      tcsSummary: {
        totalTransactionsCount: tcsAgg._count.id || 0,
        totalTaxableSupply: Number(tcsAgg._sum.taxableSupplyValue || 0),
        totalTcsAccrued: Number(tcsAgg._sum.totalTcsAmount || 0),
        pendingTcsRemittance: Number(pendingTcsAgg._sum.totalTcsAmount || 0)
      },
      stateCodes: INDIAN_STATE_GST_CODES,
      lastUpdatedBy: lastAuditLog?.admin ? `${lastAuditLog.admin.firstName || "Admin"} ${lastAuditLog.admin.lastName || ""}`.trim() : null,
      lastUpdatedAt: lastAuditLog?.performedAt || masterConfig.updatedAt
    });
  } catch (error: any) {
    console.error("GET INDIAN GST CONFIGURATION ERROR:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * PATCH /api/admin/settings/gst/master
 * Update Master GST Toggle, TCS parameters, and SAC configs
 */
export const updateIndianGstMasterConfig = async (req: Request, res: Response) => {
  try {
    const adminId = req.adminId!;
    const {
      isEnabled,
      isMandatoryTcsEnabled,
      defaultProductTaxMode,
      defaultPlatformFeeSac,
      platformFeeGstRate,
      platformFeeTaxMode,
      defaultCommissionSac,
      commissionGstRate,
      deliveryServiceSac,
      deliveryGstRate,
      tcsIntraStateCgstRate,
      tcsIntraStateSgstRate,
      tcsInterStateIgstRate,
      invoicePrefixSeller,
      invoicePrefixPlatform,
      creditNotePrefix
    } = req.body;

    const previous = await IndianGstService.getMasterConfig();

    // Safety validation: If attempting to disable GST, ensure no pending statutory obligations
    if (isEnabled === false && previous.isEnabled === true) {
      const activeRegisteredShops = await prisma.shop.count({
        where: { gstRegistered: true, gstNumber: { not: null }, status: "APPROVED" }
      });
      if (activeRegisteredShops > 0 && req.body.forceDisable !== true) {
        // Warn admin that registered sellers are actively onboarded
        return res.status(400).json({
          message: `Cannot disable GST calculation engine while ${activeRegisteredShops} active registered sellers exist on the platform without explicit statutory waiver. Tax collection on registered supplies is legally required under Section 9 and Section 52 of CGST Act.`,
          requiresConfirmation: true
        });
      }
    }

    const updated = await prisma.gstMasterConfig.update({
      where: { id: 1 },
      data: {
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : previous.isEnabled,
        isMandatoryTcsEnabled: isMandatoryTcsEnabled !== undefined ? Boolean(isMandatoryTcsEnabled) : previous.isMandatoryTcsEnabled,
        defaultProductTaxMode: defaultProductTaxMode || previous.defaultProductTaxMode,
        defaultPlatformFeeSac: defaultPlatformFeeSac || previous.defaultPlatformFeeSac,
        platformFeeGstRate: platformFeeGstRate !== undefined ? new Prisma.Decimal(platformFeeGstRate) : previous.platformFeeGstRate,
        platformFeeTaxMode: platformFeeTaxMode || previous.platformFeeTaxMode,
        defaultCommissionSac: defaultCommissionSac || previous.defaultCommissionSac,
        commissionGstRate: commissionGstRate !== undefined ? new Prisma.Decimal(commissionGstRate) : previous.commissionGstRate,
        deliveryServiceSac: deliveryServiceSac || previous.deliveryServiceSac,
        deliveryGstRate: deliveryGstRate !== undefined ? new Prisma.Decimal(deliveryGstRate) : previous.deliveryGstRate,
        tcsIntraStateCgstRate: tcsIntraStateCgstRate !== undefined ? new Prisma.Decimal(tcsIntraStateCgstRate) : previous.tcsIntraStateCgstRate,
        tcsIntraStateSgstRate: tcsIntraStateSgstRate !== undefined ? new Prisma.Decimal(tcsIntraStateSgstRate) : previous.tcsIntraStateSgstRate,
        tcsInterStateIgstRate: tcsInterStateIgstRate !== undefined ? new Prisma.Decimal(tcsInterStateIgstRate) : previous.tcsInterStateIgstRate,
        invoicePrefixSeller: invoicePrefixSeller || previous.invoicePrefixSeller,
        invoicePrefixPlatform: invoicePrefixPlatform || previous.invoicePrefixPlatform,
        creditNotePrefix: creditNotePrefix || previous.creditNotePrefix,
        lastUpdatedByAdminId: adminId
      }
    });

    // Update legacy MarketplaceSetting row for backward compatibility
    try {
      const settingRow = await prisma.marketplaceSetting.findUnique({ where: { id: 1 } });
      if (settingRow && settingRow.data) {
        const curData = settingRow.data as any;
        await prisma.marketplaceSetting.update({
          where: { id: 1 },
          data: {
            data: {
              ...curData,
              gstPercentage: Number(updated.platformFeeGstRate)
            }
          }
        });
      }
    } catch (e) {
      // non-critical
    }

    await logAdminAction({
      adminId,
      actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
      targetType: "GST",
      targetId: "gst-master",
      description: `Admin updated GST master config: isEnabled=${updated.isEnabled}, platformFeeGstRate=${updated.platformFeeGstRate}%`,
      previousValue: previous,
      newValue: updated
    });

    return res.status(200).json({
      message: `Indian GST Configuration updated successfully. Master calculation is ${updated.isEnabled ? 'ENABLED' : 'DISABLED'}.`,
      masterConfig: updated
    });
  } catch (error: any) {
    console.error("UPDATE INDIAN GST MASTER CONFIG ERROR:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * PATCH /api/admin/settings/gst/business-registration
 * Update AtlasBasket Business GST Registration Details
 */
export const updateBusinessGstRegistration = async (req: Request, res: Response) => {
  try {
    const adminId = req.adminId!;
    const {
      legalName,
      tradeName,
      gstin,
      pan,
      registrationType,
      status,
      state,
      stateCode,
      registeredAddress,
      principalPlaceOfBusiness,
      authorizedSignatoryName,
      authorizedSignatoryDesignation,
      verificationStatus,
      certificateUrl
    } = req.body;

    const previous = await IndianGstService.getBusinessRegistration();

    // Validate GSTIN if provided
    let resolvedStateCode = stateCode;
    let resolvedStateName = state;
    if (gstin && gstin.trim()) {
      const cleanGstin = gstin.trim().toUpperCase();
      if (!isValidGstin(cleanGstin)) {
        return res.status(400).json({
          message: "Invalid GSTIN format. Must be a 15-character valid Indian GSTIN (e.g. 29AAAAA0000A1Z5)."
        });
      }
      const gstinStateCode = extractStateCodeFromGstin(cleanGstin);
      if (gstinStateCode && INDIAN_STATE_GST_CODES[gstinStateCode]) {
        resolvedStateCode = gstinStateCode;
        resolvedStateName = INDIAN_STATE_GST_CODES[gstinStateCode].name;
      }
    }

    if (state && !resolvedStateCode) {
      const resolved = resolveIndianState(state);
      resolvedStateName = resolved.name;
      resolvedStateCode = resolved.code;
    }

    const updated = await prisma.businessGstRegistration.update({
      where: { id: 1 },
      data: {
        legalName: legalName ? legalName.trim() : previous.legalName,
        tradeName: tradeName !== undefined ? tradeName.trim() : previous.tradeName,
        gstin: gstin ? gstin.trim().toUpperCase() : previous.gstin,
        pan: pan ? pan.trim().toUpperCase() : (gstin ? gstin.slice(2, 12).toUpperCase() : previous.pan),
        registrationType: registrationType || previous.registrationType,
        status: status || previous.status,
        state: resolvedStateName || previous.state,
        stateCode: resolvedStateCode || previous.stateCode,
        registeredAddress: registeredAddress !== undefined ? registeredAddress.trim() : previous.registeredAddress,
        principalPlaceOfBusiness: principalPlaceOfBusiness !== undefined ? principalPlaceOfBusiness.trim() : previous.principalPlaceOfBusiness,
        authorizedSignatoryName: authorizedSignatoryName !== undefined ? authorizedSignatoryName.trim() : previous.authorizedSignatoryName,
        authorizedSignatoryDesignation: authorizedSignatoryDesignation !== undefined ? authorizedSignatoryDesignation.trim() : previous.authorizedSignatoryDesignation,
        verificationStatus: verificationStatus || previous.verificationStatus,
        verifiedAt: verificationStatus === "VERIFIED" ? new Date() : previous.verifiedAt,
        certificateUrl: certificateUrl !== undefined ? certificateUrl : previous.certificateUrl
      }
    });

    await logAdminAction({
      adminId,
      actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
      targetType: "GST",
      targetId: "business-registration",
      description: `Admin updated AtlasBasket business GST registration: GSTIN=${updated.gstin || 'None'}, State=${updated.state} (${updated.stateCode})`,
      previousValue: previous,
      newValue: updated
    });

    return res.status(200).json({
      message: "AtlasBasket Business GST registration details saved.",
      businessRegistration: updated
    });
  } catch (error: any) {
    console.error("UPDATE BUSINESS GST REGISTRATION ERROR:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * POST /api/admin/settings/gst/hsn
 * Create HSN classification rate
 */
export const createHsnClassification = async (req: Request, res: Response) => {
  try {
    const adminId = req.adminId!;
    const { hsnCode, description, gstRate, taxCategory, notificationRef } = req.body;

    if (!hsnCode?.trim()) {
      return res.status(400).json({ message: "HSN code is required." });
    }
    if (!description?.trim()) {
      return res.status(400).json({ message: "Description is required." });
    }
    if (gstRate === undefined || isNaN(Number(gstRate))) {
      return res.status(400).json({ message: "Valid GST rate percentage is required." });
    }

    const created = await prisma.hsnRateMaster.create({
      data: {
        hsnCode: hsnCode.trim(),
        description: description.trim(),
        gstRate: new Prisma.Decimal(Number(gstRate)),
        taxCategory: taxCategory || "TAXABLE",
        notificationRef: notificationRef ? notificationRef.trim() : null,
        isActive: true
      }
    });

    await logAdminAction({
      adminId,
      actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
      targetType: "GST",
      targetId: created.id,
      description: `Admin created HSN classification ${created.hsnCode} with GST ${created.gstRate}%`,
      newValue: created
    });

    return res.status(201).json({
      message: `HSN code ${created.hsnCode} registered successfully.`,
      hsnRate: created
    });
  } catch (error: any) {
    console.error("CREATE HSN CLASSIFICATION ERROR:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * PATCH /api/admin/settings/gst/hsn/:id
 * Update HSN classification rate
 */
export const updateHsnClassification = async (req: Request, res: Response) => {
  try {
    const adminId = req.adminId!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { hsnCode, description, gstRate, taxCategory, notificationRef, isActive } = req.body;

    const previous = await prisma.hsnRateMaster.findUnique({ where: { id } });
    if (!previous) {
      return res.status(404).json({ message: "HSN classification record not found." });
    }

    const updated = await prisma.hsnRateMaster.update({
      where: { id },
      data: {
        hsnCode: hsnCode ? hsnCode.trim() : previous.hsnCode,
        description: description ? description.trim() : previous.description,
        gstRate: gstRate !== undefined ? new Prisma.Decimal(Number(gstRate)) : previous.gstRate,
        taxCategory: taxCategory || previous.taxCategory,
        notificationRef: notificationRef !== undefined ? notificationRef : previous.notificationRef,
        isActive: isActive !== undefined ? Boolean(isActive) : previous.isActive
      }
    });

    await logAdminAction({
      adminId,
      actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
      targetType: "GST",
      targetId: id,
      description: `Admin updated HSN classification ${updated.hsnCode} to ${updated.gstRate}%`,
      previousValue: previous,
      newValue: updated
    });

    return res.status(200).json({
      message: `HSN code ${updated.hsnCode} updated successfully.`,
      hsnRate: updated
    });
  } catch (error: any) {
    console.error("UPDATE HSN CLASSIFICATION ERROR:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * GET /api/admin/settings/gst/tcs-ledger
 * Query TCS ledger under Section 52
 */
export const getTcsLedger = async (req: Request, res: Response) => {
  try {
    const { month, sellerId, status } = req.query;

    const where: any = {};
    if (month) where.taxPeriodMonth = String(month);
    if (sellerId) where.sellerId = String(sellerId);
    if (status) where.remittedStatus = String(status);

    const records = await prisma.gstTcsLedger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            shop: { select: { name: true, gstNumber: true, gstRegistered: true } }
          }
        }
      }
    });

    return res.status(200).json({
      count: records.length,
      records
    });
  } catch (error: any) {
    console.error("GET TCS LEDGER ERROR:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
