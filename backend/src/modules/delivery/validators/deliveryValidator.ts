import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

const createSchema = z.object({ sellerOrderId: z.string().min(1) });
const assignSchema = z.object({ name: z.string().min(1), phone: z.string().min(7), vehicleNumber: z.string().optional() });
const statusSchema = z.object({ status: z.string().min(1) });
const pickupSchema = z.object({ deliveryId: z.string().min(1) });
const proofSchema = z.object({ deliveryId: z.string().min(1), proofImage: z.string().min(1) });
const calculateSchema = z.object({ deliveryCost: z.number() });

export const validateCreateDelivery = (req: Request, res: Response, next: NextFunction) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: result.error.issues.map((e: any) => e.message).join(", ") });
  return next();
};

export const validateAssignDriver = (req: Request, res: Response, next: NextFunction) => {
  const result = assignSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: result.error.issues.map((e: any) => e.message).join(", ") });
  return next();
};

export const validateUpdateStatus = (req: Request, res: Response, next: NextFunction) => {
  const result = statusSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: result.error.issues.map((e: any) => e.message).join(", ") });
  return next();
};

export const validatePickup = (req: Request, res: Response, next: NextFunction) => {
  const result = pickupSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: result.error.issues.map((e: any) => e.message).join(", ") });
  return next();
};

export const validateProof = (req: Request, res: Response, next: NextFunction) => {
  const result = proofSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: result.error.issues.map((e: any) => e.message).join(", ") });
  return next();
};

export const validateCalculate = (req: Request, res: Response, next: NextFunction) => {
  const result = calculateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: result.error.issues.map((e: any) => e.message).join(", ") });
  return next();
};
