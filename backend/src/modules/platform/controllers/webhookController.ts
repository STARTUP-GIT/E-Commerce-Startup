// =============================================================================
// PLATFORM WEBHOOK CONTROLLER
// =============================================================================

import type { Request, Response } from "express";
import { auditRequest } from "../utils/auditLogger.js";
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
} from "../services/registryService.js";

export const getWebhooks = async (_req: Request, res: Response) => {
  try {
    const webhooks = await listWebhooks();
    return res.status(200).json({ webhooks });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const addWebhook = async (req: Request, res: Response) => {
  try {
    const { name, url, events } = req.body;
    if (!name || !url) {
      return res.status(400).json({ message: "name and url are required" });
    }
    const webhooks = await createWebhook({ name, url, events: Array.isArray(events) ? events : [] });
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "WEBHOOK_CREATED",
      module: "webhooks",
      targetType: "Webhook",
      description: `Created webhook ${name} -> ${url}`,
      newValue: { name, url },
    });
    return res.status(201).json({ message: "Webhook created", webhooks });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const patchWebhook = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const webhooks = await updateWebhook(id, req.body);
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "WEBHOOK_UPDATED",
      module: "webhooks",
      targetType: "Webhook",
      targetId: id,
      description: "Updated webhook",
      newValue: req.body,
    });
    return res.status(200).json({ message: "Webhook updated", webhooks });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const removeWebhook = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const webhooks = await deleteWebhook(id);
    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "WEBHOOK_DELETED",
      module: "webhooks",
      targetType: "Webhook",
      targetId: id,
      description: "Deleted webhook",
    });
    return res.status(200).json({ message: "Webhook deleted", webhooks });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
