// =============================================================================
// PLATFORM MONITORING CONTROLLER
// =============================================================================

import type { Request, Response } from "express";
import os from "os";
import { prisma } from "../../../config/prisma.js";

const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

const getMemory = () => {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    totalBytes: total,
    freeBytes: free,
    usedBytes: total - free,
    usedPercent: Math.round(((total - free) / total) * 100),
  };
};

export const getHealth = async (_req: Request, res: Response) => {
  try {
    let database = "unknown";
    let databaseLatencyMs: number | null = null;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      databaseLatencyMs = Date.now() - start;
      database = "healthy";
    } catch {
      database = "down";
    }

    const cpu = os.cpus();
    const load = os.loadavg();

    const uptimeSeconds = process.uptime();

    const [totalFeatures, enabledFeatures] = await Promise.all([
      prisma.feature.count(),
      prisma.feature.count({ where: { enabled: true } }),
    ]);

    const health = {
      status: database === "healthy" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: formatUptime(uptimeSeconds),
      uptimeSeconds,
      hostname: os.hostname(),
      platform: `${process.platform} ${os.arch()}`,
      nodeVersion: process.version,
      cpu: {
        cores: cpu.length,
        model: cpu[0]?.model || "unknown",
        load1m: Number(load[0]?.toFixed(2) ?? 0),
        load5m: Number(load[1]?.toFixed(2) ?? 0),
        load15m: Number(load[2]?.toFixed(2) ?? 0),
      },
      memory: getMemory(),
      storage: {
        freeBytes: os.freemem(),
        totalBytes: os.totalmem(),
      },
      database: { status: database, latencyMs: databaseLatencyMs },
      featureFlags: { total: totalFeatures, enabled: enabledFeatures },
    };

    return res.status(200).json({ health });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const getOverview = async (_req: Request, res: Response) => {
  try {
    const [userCount, flagCount, enabledFlagCount, roleCount, auditCount, settings] = await Promise.all([
      prisma.platformUser.count(),
      prisma.feature.count(),
      prisma.feature.count({ where: { enabled: true } }),
      prisma.platformRole.count(),
      prisma.auditTrail.count(),
      prisma.platformSetting.findUnique({ where: { id: 2 } }),
    ]);

    const settingsData = settings?.data as any;
    const maintenanceMode = settingsData?.maintenance?.maintenanceMode ?? false;
    const activePaymentProviders = (settingsData?.paymentProviders || []).filter((p: any) => p.enabled).length;

    const memory = getMemory();
    const cpuLoad = os.loadavg()[0];

    return res.status(200).json({
      overview: {
        platformUsers: userCount,
        featureFlags: flagCount,
        enabledFeatureFlags: enabledFlagCount,
        roles: roleCount,
        auditEntries: auditCount,
        maintenanceMode,
        activePaymentProviders,
        cpuLoad1m: Number(cpuLoad?.toFixed(2) ?? 0),
        memoryUsedPercent: memory.usedPercent,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const getLogs = async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const take = Math.min(Number(limit) || 50, 200);

    const logs = await prisma.auditTrail.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        email: true,
        action: true,
        module: true,
        description: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    return res.status(200).json({ logs });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const { search, action, module: moduleFilter, email } = req.query as Record<string, string | undefined>;

    const where: any = {
      ...(action ? { action } : {}),
      ...(moduleFilter ? { module: moduleFilter } : {}),
      ...(email ? { email: { contains: email, mode: "insensitive" } } : {}),
      ...(search
        ? { OR: [{ description: { contains: search, mode: "insensitive" } }, { action: { contains: search, mode: "insensitive" } }] }
        : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditTrail.count({ where }),
      prisma.auditTrail.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.status(200).json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const getCache = async (_req: Request, res: Response) => {
  try {
    const cache = {
      provider: "in-memory",
      featureFlagEntries: 0,
      ttlSeconds: 30,
      enabled: true,
    };
    return res.status(200).json({ cache });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
