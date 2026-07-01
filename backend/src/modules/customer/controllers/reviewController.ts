import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getProductReviews = async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId as string;

        if (!productId) {
            return res.status(400).json({
                message: "Product ID is required"
            });
        }

        const reviews = await prisma.review.findMany({
            where: {
                productId,
                isPublished: true
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            count: reviews.length,
            reviews
        });

    } catch (error) {
        console.error("GET PRODUCT REVIEWS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const addReview = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const { productId, orderItemId, rating, title, comment } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!productId || !orderItemId || rating === undefined) {
            return res.status(400).json({
                message: "Product ID, Order Item ID, and rating are required"
            });
        }

        if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
            return res.status(400).json({
                message: "Rating must be an integer between 1 and 5"
            });
        }

        const orderItem = await prisma.orderItem.findUnique({
            where: { id: orderItemId },
            include: {
                sellerOrder: {
                    include: {
                        order: true
                    }
                }
            }
        });

        if (!orderItem || orderItem.sellerOrder.order.customerId !== customerId) {
            return res.status(404).json({
                message: "Purchased order item not found"
            });
        }

        if (orderItem.productId !== productId) {
            return res.status(400).json({
                message: "Order item does not match the product ID"
            });
        }

        if (orderItem.sellerOrder.status !== "DELIVERED") {
            return res.status(400).json({
                message: "You can only review items after they are delivered"
            });
        }

        const existingReview = await prisma.review.findUnique({
            where: { orderItemId }
        });

        if (existingReview) {
            return res.status(400).json({
                message: "You have already reviewed this item"
            });
        }

        const review = await prisma.review.create({
            data: {
                customerId,
                productId,
                orderItemId,
                rating,
                title: title?.trim() || null,
                comment: comment?.trim() || null
            }
        });

        return res.status(201).json({
            message: "Review submitted successfully",
            review
        });

    } catch (error) {
        console.error("ADD REVIEW ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const editReview = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const reviewId = req.params.reviewId as string;
        const { rating, title, comment } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!reviewId) {
            return res.status(400).json({
                message: "Review ID is required"
            });
        }

        const review = await prisma.review.findUnique({
            where: { id: reviewId }
        });

        if (!review || review.customerId !== customerId) {
            return res.status(404).json({
                message: "Review not found"
            });
        }

        const updateData: any = {};
        if (rating !== undefined) {
            if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
                return res.status(400).json({
                    message: "Rating must be an integer between 1 and 5"
                });
            }
            updateData.rating = rating;
        }

        if (title !== undefined) {
            updateData.title = title?.trim() || null;
        }

        if (comment !== undefined) {
            updateData.comment = comment?.trim() || null;
        }

        const updatedReview = await prisma.review.update({
            where: { id: reviewId },
            data: updateData
        });

        return res.status(200).json({
            message: "Review updated successfully",
            review: updatedReview
        });

    } catch (error) {
        console.error("EDIT REVIEW ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const deleteReview = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const reviewId = req.params.reviewId as string;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!reviewId) {
            return res.status(400).json({
                message: "Review ID is required"
            });
        }

        const review = await prisma.review.findUnique({
            where: { id: reviewId }
        });

        if (!review || review.customerId !== customerId) {
            return res.status(404).json({
                message: "Review not found"
            });
        }

        await prisma.review.delete({
            where: { id: reviewId }
        });

        return res.status(200).json({
            message: "Review deleted successfully"
        });

    } catch (error) {
        console.error("DELETE REVIEW ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};
