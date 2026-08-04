// =============================================================================
// PLATFORM API KEY CONTROLLER
// =============================================================================

import type { Request, Response } from "express";
import { auditRequest } from "../utils/auditLogger.js";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
} from "../services/registryService.js";

export const getApiKeys = async (_req: Request, res: Response) => {
  try {
    const apiKeys = await listApiKeys();
    return res.status(200).json({ apiKeys });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const createKey = async (req: Request, res: Response) => {
  try {
    const { name, scopes } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const { record, apiKey } = await createApiKey({
      name,
      scopes: Array.isArray(scopes) ? scopes : [],
    });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "API_KEY_CREATED",
      module: "api-keys",
      targetType: "ApiKey",
      targetId: record.id,
      description: `Created API key ${record.name}`,
      newValue: { name: record.name, prefix: record.prefix },
    });

    return res.status(201).json({
      message: "API key created. Store it now — it will not be shown again.",
      apiKey,
      record,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const revokeKey = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const apiKeys = await revokeApiKey(id);
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "API_KEY_REVOKED",
      module: "api-keys",
      targetType: "ApiKey",
      targetId: id,
      description: "Revoked API key",
    });
    return res.status(200).json({ message: "API key revoked", apiKeys });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const removeKey = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const apiKeys = await deleteApiKey(id);
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "API_KEY_DELETED",
      module: "api-keys",
      targetType: "ApiKey",
      targetId: id,
      description: "Deleted API key",
    });
    return res.status(200).json({ message: "API key deleted", apiKeys });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
