// =============================================================================
// PLATFORM QUEUE / BACKGROUND JOB CONTROLLER
// =============================================================================

import type { Request, Response } from "express";
import { auditRequest } from "../utils/auditLogger.js";

export const getQueues = async (_req: Request, res: Response) => {
  try {
    const queues = [
      { name: "email", pending: 0, processing: 0, failed: 0, status: "idle" },
      { name: "notifications", pending: 0, processing: 0, failed: 0, status: "idle" },
      { name: "webhooks", pending: 0, processing: 0, failed: 0, status: "idle" },
      { name: "payouts", pending: 0, processing: 0, failed: 0, status: "idle" },
    ];
    return res.status(200).json({ queues });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const getJobs = async (_req: Request, res: Response) => {
  try {
    const jobs = [
      { name: "cron-scheduler", schedule: "* * * * *", lastRun: null, status: "idle" },
      { name: "payout-processor", schedule: "0 */6 * * *", lastRun: null, status: "idle" },
      { name: "notification-digest", schedule: "0 9 * * *", lastRun: null, status: "idle" },
    ];
    return res.status(200).json({ jobs });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const runJob = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "JOB_TRIGGERED",
      module: "queues",
      targetType: "BackgroundJob",
      targetId: name,
      description: `Manually triggered background job ${name}`,
    });

    return res.status(200).json({ message: `Job ${name} triggered`, job: { name, status: "queued" } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
