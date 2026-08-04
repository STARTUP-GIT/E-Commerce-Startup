// =============================================================================
// PLATFORM SECURITY CONTROLLER
// =============================================================================

import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { auditRequest } from "../utils/auditLogger.js";
import { getPlatformSettings, updatePlatformSettings } from "../services/settingsService.js";
import { listVersions } from "../services/registryService.js";

export const getSecuritySettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();
    return res.status(200).json({ security: settings.security });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateRateLimits = async (req: Request, res: Response) => {
  try {
    const previous = await getPlatformSettings();
    const settings = await updatePlatformSettings({ security: { ...previous.security, ...req.body } });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "RATE_LIMITS_UPDATED",
      module: "security",
      targetType: "PlatformSetting",
      targetId: "security.rateLimits",
      description: "Updated platform rate limiting configuration",
      previousValue: previous.security,
      newValue: settings.security,
    });
    return res.status(200).json({ message: "Rate limits updated", security: settings.security });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const getBlockedIps = async (_req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();
    return res.status(200).json({ blockedIps: settings.security.blockedIps || [] });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const addBlockedIp = async (req: Request, res: Response) => {
  try {
    const { ip } = req.body;
    if (!ip || typeof ip !== "string") {
      return res.status(400).json({ message: "ip is required" });
    }
    const previous = await getPlatformSettings();
    const current = previous.security.blockedIps || [];
    if (current.includes(ip)) {
      return res.status(409).json({ message: "IP already blocked" });
    }
    const settings = await updatePlatformSettings({
      security: { ...previous.security, blockedIps: [...current, ip] },
    });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "IP_BLOCKED",
      module: "security",
      targetType: "BlockedIp",
      targetId: ip,
      description: `Blocked IP address ${ip}`,
      newValue: { ip },
    });
    return res.status(200).json({ message: "IP blocked", blockedIps: settings.security.blockedIps });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const removeBlockedIp = async (req: Request, res: Response) => {
  try {
    const ip = req.params.ip as string;
    const previous = await getPlatformSettings();
    const settings = await updatePlatformSettings({
      security: { ...previous.security, blockedIps: (previous.security.blockedIps || []).filter((i) => i !== ip) },
    });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "IP_UNBLOCKED",
      module: "security",
      targetType: "BlockedIp",
      targetId: ip,
      description: `Unblocked IP address ${ip}`,
      newValue: { ip },
    });
    return res.status(200).json({ message: "IP unblocked", blockedIps: settings.security.blockedIps });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const getSessions = async (_req: Request, res: Response) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: { userType: "PLATFORM", revoked: false },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return res.status(200).json({ sessions });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const revokeSession = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const session = await prisma.refreshToken.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ message: "Session not found" });

    await prisma.refreshToken.update({ where: { id }, data: { revoked: true } });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "SESSION_REVOKED",
      module: "security",
      targetType: "Session",
      targetId: id,
      description: `Revoked platform session ${id}`,
    });

    return res.status(200).json({ message: "Session revoked" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Version History (shared with Release Management) ────────────────────────

export const getVersionHistory = async (_req: Request, res: Response) => {
  try {
    const versions = await listVersions();
    return res.status(200).json({ versions });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
