import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getReviews = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const reviews = await prisma.review.findMany({
            where: {
                product: {
                    sellerId
                }
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
                },
                product: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true
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
        console.error("GET REVIEWS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const replyToReview = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const reviewId = req.params.reviewId;
        const { reply } = req.body;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!reviewId) {
            return res.status(400).json({
                message: "Review ID is required"
            });
        }

        if (!reply?.trim()) {
            return res.status(400).json({
                message: "Reply content is required"
            });
        }

        const review = await prisma.review.findUnique({
            where: {
                id: reviewId as string
            },
            include: {
                product: true
            }
        });

        if (!review) {
            return res.status(404).json({
                message: "Review not found"
            });
        }

        if (review.product.sellerId !== sellerId) {
            return res.status(403).json({
                message: "You can only reply to reviews on your own products"
            });
        }

        const updatedReview = await prisma.review.update({
            where: {
                id: reviewId as string
            },
            data: {
                reply: reply.trim()
            }
        });

        return res.status(200).json({
            message: "Reply added successfully",
            review: updatedReview
        });

    } catch (error) {
        console.error("REPLY TO REVIEW ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const deleteReply = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const reviewId = req.params.reviewId;

        if (!sellerId) {
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
            where: {
                id: reviewId as string
            },
            include: {
                product: true
            }
        });

        if (!review) {
            return res.status(404).json({
                message: "Review not found"
            });
        }

        if (review.product.sellerId !== sellerId) {
            return res.status(403).json({
                message: "You can only delete replies on your own products"
            });
        }

        const updatedReview = await prisma.review.update({
            where: {
                id: reviewId as string
            },
            data: {
                reply: null
            }
        });

        return res.status(200).json({
            message: "Reply deleted successfully",
            review: updatedReview
        });

    } catch (error) {
        console.error("DELETE REPLY ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};