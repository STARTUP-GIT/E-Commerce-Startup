// =============================================================================
// PLATFORM SETTINGS CONTROLLER
// =============================================================================

import type { Request, Response } from "express";
import { auditRequest } from "../utils/auditLogger.js";
import {
  getPlatformSettings,
  updatePlatformSettings,
  type PaymentProviderConfig,
  type StorageProviderConfig,
} from "../services/settingsService.js";

export const getSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();
    return res.status(200).json({ settings });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateMarketplace = async (req: Request, res: Response) => {
  try {
    const previous = await getPlatformSettings();
    const settings = await updatePlatformSettings({ marketplace: req.body });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "MARKETPLACE_CONFIGURATION_UPDATED",
      module: "marketplace",
      targetType: "PlatformSetting",
      targetId: "marketplace",
      description: "Updated marketplace configuration",
      previousValue: previous.marketplace,
      newValue: settings.marketplace,
    });
    return res.status(200).json({ message: "Marketplace configuration updated", settings });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateCommission = async (req: Request, res: Response) => {
  try {
    const previous = await getPlatformSettings();
    const settings = await updatePlatformSettings({ commission: req.body });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "COMMISSION_ENGINE_UPDATED",
      module: "commission",
      targetType: "PlatformSetting",
      targetId: "commission",
      description: "Updated commission engine configuration",
      previousValue: previous.commission,
      newValue: settings.commission,
    });
    return res.status(200).json({ message: "Commission engine updated", settings });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateMaintenance = async (req: Request, res: Response) => {
  try {
    const previous = await getPlatformSettings();
    const settings = await updatePlatformSettings({ maintenance: req.body });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: req.body.maintenanceMode ? "MAINTENANCE_ENABLED" : "MAINTENANCE_DISABLED",
      module: "maintenance",
      targetType: "PlatformSetting",
      targetId: "maintenance",
      description: `Maintenance mode ${req.body.maintenanceMode ? "enabled" : "disabled"}`,
      previousValue: previous.maintenance,
      newValue: settings.maintenance,
    });
    return res.status(200).json({ message: "Maintenance settings updated", settings });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updatePaymentProviders = async (req: Request, res: Response) => {
  try {
    const previous = await getPlatformSettings();
    const providers = req.body.providers as PaymentProviderConfig[];
    if (!Array.isArray(providers)) {
      return res.status(400).json({ message: "providers array is required" });
    }
    const settings = await updatePlatformSettings({ paymentProviders: providers });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "PAYMENT_PROVIDERS_UPDATED",
      module: "payments",
      targetType: "PlatformSetting",
      targetId: "paymentProviders",
      description: "Updated enabled payment providers",
      previousValue: previous.paymentProviders,
      newValue: settings.paymentProviders,
    });
    return res.status(200).json({ message: "Payment providers updated", settings });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateStorage = async (req: Request, res: Response) => {
  try {
    const previous = await getPlatformSettings();
    const storage = req.body.storage as StorageProviderConfig;
    if (!storage?.provider) {
      return res.status(400).json({ message: "storage.provider is required" });
    }
    const settings = await updatePlatformSettings({
      storage: { ...previous.storage, ...storage, enabled: true },
    });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "STORAGE_PROVIDER_UPDATED",
      module: "storage",
      targetType: "PlatformSetting",
      targetId: "storage",
      description: `Active storage provider set to ${storage.provider}`,
      previousValue: previous.storage,
      newValue: settings.storage,
    });
    return res.status(200).json({ message: "Storage provider updated", settings });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateEmailProviders = async (req: Request, res: Response) => {
  try {
    const previous = await getPlatformSettings();
    const providers = req.body.providers;
    if (!Array.isArray(providers)) {
      return res.status(400).json({ message: "providers array is required" });
    }
    const settings = await updatePlatformSettings({ emailProviders: providers });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "EMAIL_PROVIDERS_UPDATED",
      module: "email",
      targetType: "PlatformSetting",
      targetId: "emailProviders",
      description: "Updated email providers",
      previousValue: previous.emailProviders,
      newValue: settings.emailProviders,
    });
    return res.status(200).json({ message: "Email providers updated", settings });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateOAuthProviders = async (req: Request, res: Response) => {
  try {
    const previous = await getPlatformSettings();
    const providers = req.body.providers;
    if (!Array.isArray(providers)) {
      return res.status(400).json({ message: "providers array is required" });
    }
    const settings = await updatePlatformSettings({ oauthProviders: providers });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "OAUTH_PROVIDERS_UPDATED",
      module: "oauth",
      targetType: "PlatformSetting",
      targetId: "oauthProviders",
      description: "Updated OAuth providers",
      previousValue: previous.oauthProviders,
      newValue: settings.oauthProviders,
    });
    return res.status(200).json({ message: "OAuth providers updated", settings });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateRazorpay = async (req: Request, res: Response) => {
  try {
    const previous = await getPlatformSettings();
    const { enabled, keyId, keySecret } = req.body;
    const settings = await updatePlatformSettings({
      razorpay: {
        enabled: enabled ?? previous.razorpay.enabled,
        keyId: keyId ?? previous.razorpay.keyId,
        keySecretMasked: keySecret
          ? `${String(keySecret).slice(0, 4)}****${String(keySecret).slice(-4)}`
          : previous.razorpay.keySecretMasked,
      },
    });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "RAZORPAY_UPDATED",
      module: "payments",
      targetType: "PlatformSetting",
      targetId: "razorpay",
      description: "Updated Razorpay configuration",
      previousValue: previous.razorpay,
      newValue: settings.razorpay,
    });
    return res.status(200).json({ message: "Razorpay configuration updated", settings });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
