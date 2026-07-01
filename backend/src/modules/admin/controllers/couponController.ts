import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";

export const getCoupons = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [coupons, total] = await prisma.$transaction([
            prisma.coupon.findMany({
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.coupon.count()
        ]);

        return res.status(200).json({
            coupons,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (error: any) {
        console.error("GET COUPONS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const createCoupon = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const {
            code,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscount,
            usageLimit,
            perCustomerLimit,
            expiresAt,
            startsAt,
            isActive,
            description,
            sellerId
        } = req.body;

        if (!code || !discountType || discountValue === undefined) {
            return res.status(400).json({ message: "code, discountType, and discountValue are required" });
        }

        const existingCoupon = await prisma.coupon.findUnique({ where: { code } });
        if (existingCoupon) return res.status(409).json({ message: "Coupon code already exists" });

        const coupon = await prisma.coupon.create({
            data: {
                code: code.trim().toUpperCase(),
                discountType,
                discountValue,
                minOrderAmount: minOrderAmount ?? 0,
                maxDiscount: maxDiscount ?? null,
                usageLimit: usageLimit ?? null,
                perCustomerLimit: perCustomerLimit ?? 1,
                usageCount: 0,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                startsAt: startsAt ? new Date(startsAt) : null,
                isActive: isActive ?? true,
                description: description ?? null,
                sellerId: sellerId ?? null,
                createdByAdminId: adminId
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Coupon",
            targetId: coupon.id,
            description: `Coupon '${code}' created by admin`,
            previousValue: null,
            newValue: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue }
        });

        return res.status(201).json({ message: "Coupon created successfully", coupon });
    } catch (error: any) {
        console.error("CREATE COUPON ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateCoupon = async (req: Request, res: Response) => {
    try {
        const couponId = String(req.params.id);
        const adminId = req.adminId!;

        const existing = await prisma.coupon.findUnique({ where: { id: couponId } });
        if (!existing) return res.status(404).json({ message: "Coupon not found" });

        const {
            code,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscount,
            usageLimit,
            perCustomerLimit,
            expiresAt,
            startsAt,
            isActive,
            description,
            sellerId
        } = req.body;

        const coupon = await prisma.coupon.update({
            where: { id: couponId },
            data: {
                ...(code && { code: code.trim().toUpperCase() }),
                ...(discountType && { discountType }),
                ...(discountValue !== undefined && { discountValue }),
                ...(minOrderAmount !== undefined && { minOrderAmount }),
                ...(maxDiscount !== undefined && { maxDiscount }),
                ...(usageLimit !== undefined && { usageLimit }),
                ...(perCustomerLimit !== undefined && { perCustomerLimit }),
                ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
                ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
                ...(isActive !== undefined && { isActive }),
                ...(description !== undefined && { description }),
                ...(sellerId !== undefined && { sellerId })
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Coupon",
            targetId: couponId,
            description: `Coupon '${existing.code}' updated by admin`,
            previousValue: { code: existing.code, isActive: existing.isActive },
            newValue: { code: coupon.code, isActive: coupon.isActive }
        });

        return res.status(200).json({ message: "Coupon updated successfully", coupon });
    } catch (error: any) {
        console.error("UPDATE COUPON ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteCoupon = async (req: Request, res: Response) => {
    try {
        const couponId = String(req.params.id);
        const adminId = req.adminId!;

        const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
        if (!coupon) return res.status(404).json({ message: "Coupon not found" });

        await prisma.coupon.delete({ where: { id: couponId } });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.COUPON_DEACTIVATED,
            targetType: "Coupon",
            targetId: couponId,
            description: `Coupon '${coupon.code}' deleted by admin`,
            previousValue: { code: coupon.code },
            newValue: null
        });

        return res.status(200).json({ message: "Coupon deleted successfully" });
    } catch (error: any) {
        console.error("DELETE COUPON ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
