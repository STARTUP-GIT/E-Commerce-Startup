import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";

export const getReviews = async (req: Request, res: Response) => {
    try {
        const { published, page = 1, limit = 10 } = req.query;
        const whereClause: any = {};

        // Filter by isPublished if provided
        if (published !== undefined) {
            whereClause.isPublished = published === "true";
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [reviews, total] = await prisma.$transaction([
            prisma.review.findMany({
                where: whereClause,
                include: {
                    customer: { select: { id: true, username: true, email: true } },
                    product: { select: { id: true, name: true } }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.review.count({ where: whereClause })
        ]);

        return res.status(200).json({
            reviews,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (error: any) {
        console.error("GET REVIEWS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteReview = async (req: Request, res: Response) => {
    try {
        const reviewId = String(req.params.id);
        const adminId = req.adminId!;

        const review = await prisma.review.findUnique({ where: { id: reviewId } });
        if (!review) return res.status(404).json({ message: "Review not found" });

        await prisma.review.delete({ where: { id: reviewId } });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Review",
            targetId: reviewId,
            description: `Review ${reviewId} deleted by admin.`,
            previousValue: { rating: review.rating, comment: review.comment },
            newValue: null
        });

        return res.status(200).json({ message: "Review deleted successfully" });
    } catch (error: any) {
        console.error("DELETE REVIEW ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const hideReview = async (req: Request, res: Response) => {
    try {
        const reviewId = String(req.params.id);
        const adminId = req.adminId!;

        const review = await prisma.review.findUnique({ where: { id: reviewId } });
        if (!review) return res.status(404).json({ message: "Review not found" });

        const updatedReview = await prisma.review.update({
            where: { id: reviewId },
            data: { isPublished: false }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Review",
            targetId: reviewId,
            description: `Review ${reviewId} hidden (unpublished) by admin.`,
            previousValue: { isPublished: review.isPublished },
            newValue: { isPublished: false }
        });

        return res.status(200).json({ message: "Review hidden successfully", review: updatedReview });
    } catch (error: any) {
        console.error("HIDE REVIEW ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const restoreReview = async (req: Request, res: Response) => {
    try {
        const reviewId = String(req.params.id);
        const adminId = req.adminId!;

        const review = await prisma.review.findUnique({ where: { id: reviewId } });
        if (!review) return res.status(404).json({ message: "Review not found" });

        const updatedReview = await prisma.review.update({
            where: { id: reviewId },
            data: { isPublished: true }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Review",
            targetId: reviewId,
            description: `Review ${reviewId} restored/re-published by admin.`,
            previousValue: { isPublished: review.isPublished },
            newValue: { isPublished: true }
        });

        return res.status(200).json({ message: "Review restored successfully", review: updatedReview });
    } catch (error: any) {
        console.error("RESTORE REVIEW ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
