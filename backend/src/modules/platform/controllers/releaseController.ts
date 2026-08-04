// =============================================================================
// PLATFORM RELEASE MANAGEMENT CONTROLLER
// =============================================================================

import type { Request, Response } from "express";
import { auditRequest } from "../utils/auditLogger.js";
import {
  listVersions,
  createVersion,
  updateVersion,
  deleteVersion,
} from "../services/registryService.js";

export const getVersions = async (_req: Request, res: Response) => {
  try {
    const versions = await listVersions();
    return res.status(200).json({ versions });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const addVersion = async (req: Request, res: Response) => {
  try {
    const { version, name, notes, status } = req.body;
    if (!version || !name) {
      return res.status(400).json({ message: "version and name are required" });
    }
    const versions = await createVersion({ version, name, notes: notes || "", status });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "RELEASE_CREATED",
      module: "release",
      targetType: "Release",
      description: `Recorded release ${version} (${name})`,
      newValue: { version, name, status },
    });
    return res.status(201).json({ message: "Release recorded", versions });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const patchVersion = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const versions = await updateVersion(id, req.body);
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "RELEASE_UPDATED",
      module: "release",
      targetType: "Release",
      targetId: id,
      description: "Updated release",
      newValue: req.body,
    });
    return res.status(200).json({ message: "Release updated", versions });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const removeVersion = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const versions = await deleteVersion(id);
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "RELEASE_DELETED",
      module: "release",
      targetType: "Release",
      targetId: id,
      description: "Deleted release record",
    });
    return res.status(200).json({ message: "Release deleted", versions });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
