import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getAllDeliveries = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status } = req.query as any;
    const where: any = {};
    if (status) where.status = status;
    const deliveries = await prisma.delivery.findMany({ where, skip: (page - 1) * limit, take: Number(limit), orderBy: { createdAt: "desc" } });
    return res.status(200).json({ count: deliveries.length, deliveries });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getDelivery = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) return res.status(400).json({ message: "id required" });
    const delivery = await prisma.delivery.findUnique({ where: { id } });
    if (!delivery) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ delivery });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const cancelDelivery = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) return res.status(400).json({ message: "id required" });
    const delivery = await prisma.delivery.update({ where: { id }, data: { status: "CANCELLED", failedAt: new Date() } });
    await prisma.orderTimelineEvent.create({ data: { entityType: "DELIVERY", deliveryId: id, status: "CANCELLED", title: "Delivery Cancelled by Admin" } });
    return res.status(200).json({ delivery });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const reassignDelivery = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { provider } = req.body;
    if (!id || !provider) return res.status(400).json({ message: "Missing fields" });
    
    const delivery = await prisma.delivery.findUnique({ where: { id } });
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    const notes = delivery.notes ? JSON.parse(delivery.notes) : {};
    notes.provider = provider;

    const updated = await prisma.delivery.update({ where: { id }, data: { notes: JSON.stringify(notes) } });
    await prisma.orderTimelineEvent.create({ data: { entityType: "DELIVERY", deliveryId: id, status: "REASSIGNED", title: "Delivery Reassigned", description: `Provider changed to ${provider}` } });
    return res.status(200).json({ delivery: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deliveryAnalytics = async (req: Request, res: Response) => {
  try {
    const total = await prisma.delivery.count();
    const pending = await prisma.delivery.count({ where: { status: "ASSIGNED" } });
    const active = await prisma.delivery.count({ where: { status: { in: ["ASSIGNED", "ACCEPTED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } } });
    const delivered = await prisma.delivery.count({ where: { status: "DELIVERED" } });
    return res.status(200).json({ total, pending, active, delivered });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getLiveDeliveries = async (req: Request, res: Response) => {
  try {
    const live = await prisma.delivery.findMany({ where: { status: { in: ["ASSIGNED", "ACCEPTED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } }, orderBy: { updatedAt: "desc" } });
    return res.status(200).json({ count: live.length, live });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const changeDeliveryShare = async (req: Request, res: Response) => {
  try {
    const { customerDeliveryShare, sellerDeliveryShare } = req.body;
    if (typeof customerDeliveryShare === "undefined" || typeof sellerDeliveryShare === "undefined") return res.status(400).json({ message: "Both shares required" });
    const setting = await prisma.platformDeliverySetting.upsert({ where: { id: 1 }, update: { customerDeliveryShare, sellerDeliveryShare }, create: { id: 1, customerDeliveryShare, sellerDeliveryShare } });
    await prisma.orderTimelineEvent.create({ data: { entityType: "ORDER", status: "MARKETPLACE_SETTINGS_UPDATED", title: "Delivery Share Updated", description: `Customer ${customerDeliveryShare}% | Seller ${sellerDeliveryShare}%` } });
    return res.status(200).json({ setting });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const changeDeliveryProvider = async (req: Request, res: Response) => {
  try {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ message: "provider required" });
    const setting = await prisma.platformDeliverySetting.upsert({ where: { id: 1 }, update: { defaultProvider: provider }, create: { id: 1, defaultProvider: provider } });
    return res.status(200).json({ setting });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
