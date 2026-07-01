import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

// Helper to get or create a wishlist
const getOrCreateWishlist = async (customerId: string) => {
    let wishlist = await prisma.wishlist.findUnique({
        where: { customerId },
        include: {
            items: {
                include: {
                    product: true,
                    productVariant: true
                }
            }
        }
    });

    if (!wishlist) {
        wishlist = await prisma.wishlist.create({
            data: { customerId },
            include: {
                items: {
                    include: {
                        product: true,
                        productVariant: true
                    }
                }
            }
        });
    }
    return wishlist;
};

export const getWishlist = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const wishlist = await getOrCreateWishlist(customerId);

        return res.status(200).json({
            wishlist
        });

    } catch (error) {
        console.error("GET WISHLIST ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const addToWishlist = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const { productId, productVariantId } = req.body;

        if (!productId) {
            return res.status(400).json({
                message: "Product ID is required"
            });
        }

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product || product.isDeleted || product.status !== "ACTIVE") {
            return res.status(404).json({
                message: "Product not found or inactive"
            });
        }

        if (productVariantId) {
            const variant = await prisma.productVariant.findUnique({
                where: { id: productVariantId }
            });
            if (!variant || !variant.isActive) {
                return res.status(404).json({
                    message: "Product variant not found or inactive"
                });
            }
        }

        const wishlist = await getOrCreateWishlist(customerId);

        const existingItem = await prisma.wishlistItem.findFirst({
            where: {
                wishlistId: wishlist.id,
                productId,
                productVariantId: productVariantId || null
            }
        });

        if (existingItem) {
            return res.status(400).json({
                message: "Item already exists in wishlist"
            });
        }

        const createdItem = await prisma.wishlistItem.create({
            data: {
                wishlistId: wishlist.id,
                productId,
                productVariantId: productVariantId || null
            }
        });

        return res.status(201).json({
            message: "Item added to wishlist successfully",
            item: createdItem
        });

    } catch (error) {
        console.error("ADD TO WISHLIST ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const removeFromWishlist = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const itemId = req.params.itemId as string;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!itemId) {
            return res.status(400).json({
                message: "Wishlist Item ID is required"
            });
        }

        const wishlistItem = await prisma.wishlistItem.findUnique({
            where: { id: itemId },
            include: { wishlist: true }
        });

        if (!wishlistItem || wishlistItem.wishlist.customerId !== customerId) {
            return res.status(404).json({
                message: "Wishlist item not found"
            });
        }

        await prisma.wishlistItem.delete({
            where: { id: itemId }
        });

        return res.status(200).json({
            message: "Item removed from wishlist successfully"
        });

    } catch (error) {
        console.error("REMOVE FROM WISHLIST ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const clearWishlist = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const wishlist = await prisma.wishlist.findUnique({
            where: { customerId }
        });

        if (wishlist) {
            await prisma.wishlistItem.deleteMany({
                where: { wishlistId: wishlist.id }
            });
        }

        return res.status(200).json({
            message: "Wishlist cleared successfully"
        });

    } catch (error) {
        console.error("CLEAR WISHLIST ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};
