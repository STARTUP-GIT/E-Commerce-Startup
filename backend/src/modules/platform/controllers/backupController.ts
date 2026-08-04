// =============================================================================
// PLATFORM BACKUP CONTROLLER
// =============================================================================

import type { Request, Response } from "express";
import { auditRequest } from "../utils/auditLogger.js";
import { listBackups, createBackup, deleteBackup } from "../services/registryService.js";

export const getBackups = async (_req: Request, res: Response) => {
  try {
    const backups = await listBackups();
    return res.status(200).json({ backups });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const addBackup = async (req: Request, res: Response) => {
  try {
    const { label, location } = req.body;
    const backups = await createBackup({ label, location });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "BACKUP_CREATED",
      module: "backups",
      targetType: "Backup",
      description: `Started backup ${label || "manual"}`,
      newValue: { label, location },
    });

    return res.status(201).json({ message: "Backup started", backups });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const removeBackup = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const backups = await deleteBackup(id);
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "BACKUP_DELETED",
      module: "backups",
      targetType: "Backup",
      targetId: id,
      description: "Deleted backup record",
    });
    return res.status(200).json({ message: "Backup deleted", backups });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
