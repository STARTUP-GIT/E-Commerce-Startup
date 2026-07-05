import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

// Helper to get or create a cart
const getOrCreateCart = async (customerId: string) => {
    let cart = await prisma.cart.findUnique({
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

    if (!cart) {
        cart = await prisma.cart.create({
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
    return cart;
};

export const getCart = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const cart = await getOrCreateCart(customerId);

        return res.status(200).json({
            cart
        });

    } catch (error) {
        console.error("GET CART ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const addToCart = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const { productId, productVariantId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({
                message: "Product ID is required"
            });
        }

        if (quantity <= 0 || !Number.isInteger(quantity)) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                seller: true,
                variants: {
                    where: productVariantId ? { id: productVariantId } : undefined
                }
            }
        });

        if (!product || product.isDeleted || product.status !== "ACTIVE") {
            return res.status(404).json({
                message: "Product not found or inactive"
            });
        }

        if (product.seller.isBanned || product.seller.status !== "ACTIVE") {
            return res.status(403).json({
                message: "Seller is not active or approved"
            });
        }

        let availableStock = product.stockQuantity;

        if (productVariantId) {
            const variant = product.variants.find((v) => v.id === productVariantId);
            if (!variant) {
                return res.status(404).json({
                    message: "Product variant not found"
                });
            }
            if (!variant.isActive) {
                return res.status(400).json({
                    message: "Product variant is inactive"
                });
            }
            availableStock = variant.stockQuantity;
        }

        if (availableStock < quantity) {
            return res.status(400).json({
                message: `Only ${availableStock} items are available in stock`
            });
        }

        const cart = await getOrCreateCart(customerId);

        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId,
                productVariantId: productVariantId || null
            }
        });

        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (availableStock < newQuantity) {
                return res.status(400).json({
                    message: `Cannot add more. Total in cart (${newQuantity}) exceeds stock (${availableStock}).`
                });
            }

            await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: newQuantity }
            });
        } else {
            await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId,
                    productVariantId: productVariantId || null,
                    quantity
                }
            });
        }

        const updatedCart = await getOrCreateCart(customerId);

        return res.status(200).json({
            message: "Item added to cart successfully",
            cart: updatedCart
        });

    } catch (error) {
        console.error("ADD TO CART ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const updateCartQuantity = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const itemId = req.params.itemId as string;
        const { quantity } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!itemId) {
            return res.status(400).json({
                message: "Cart Item ID is required"
            });
        }

        if (quantity <= 0 || !Number.isInteger(quantity)) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        const cartItem = await prisma.cartItem.findUnique({
            where: { id: itemId },
            include: {
                cart: true,
                product: true,
                productVariant: true
            }
        });

        if (!cartItem || cartItem.cart.customerId !== customerId) {
            return res.status(404).json({
                message: "Cart item not found"
            });
        }

        let availableStock = cartItem.product.stockQuantity;
        if (cartItem.productVariant) {
            availableStock = cartItem.productVariant.stockQuantity;
        }

        if (availableStock < quantity) {
            return res.status(400).json({
                message: `Only ${availableStock} items are available in stock`
            });
        }

        const updatedItem = await prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity },
            include: {
                product: true,
                productVariant: true
            }
        });

        return res.status(200).json({
            message: "Cart quantity updated successfully",
            item: updatedItem
        });

    } catch (error) {
        console.error("UPDATE CART QUANTITY ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const removeCartItem = async (req: Request, res: Response) => {
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
                message: "Cart Item ID is required"
            });
        }

        const cartItem = await prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { cart: true }
        });

        if (!cartItem || cartItem.cart.customerId !== customerId) {
            return res.status(404).json({
                message: "Cart item not found"
            });
        }

        await prisma.cartItem.delete({
            where: { id: itemId }
        });

        return res.status(200).json({
            message: "Item removed from cart successfully"
        });

    } catch (error) {
        console.error("REMOVE CART ITEM ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const clearCart = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const cart = await prisma.cart.findUnique({
            where: { customerId }
        });

        if (cart) {
            await prisma.cartItem.deleteMany({
                where: { cartId: cart.id }
            });
        }

        return res.status(200).json({
            message: "Cart cleared successfully"
        });

    } catch (error) {
        console.error("CLEAR CART ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const moveToWishlist = async (req: Request, res: Response) => {
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
                message: "Cart Item ID is required"
            });
        }

        const cartItem = await prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { cart: true }
        });

        if (!cartItem || cartItem.cart.customerId !== customerId) {
            return res.status(404).json({
                message: "Cart item not found"
            });
        }

        // Get or create wishlist
        let wishlist = await prisma.wishlist.findUnique({
            where: { customerId }
        });

        if (!wishlist) {
            wishlist = await prisma.wishlist.create({
                data: { customerId }
            });
        }

        // Verify if already in wishlist
        const existingWishlistItem = await prisma.wishlistItem.findFirst({
            where: {
                wishlistId: wishlist.id,
                productId: cartItem.productId,
                productVariantId: cartItem.productVariantId || null
            }
        });

        if (!existingWishlistItem) {
            await prisma.wishlistItem.create({
                data: {
                    wishlistId: wishlist.id,
                    productId: cartItem.productId,
                    productVariantId: cartItem.productVariantId || null
                }
            });
        }

        // Delete from cart
        await prisma.cartItem.delete({
            where: { id: itemId }
        });

        return res.status(200).json({
            message: "Item moved to wishlist successfully"
        });

    } catch (error) {
        console.error("MOVE TO WISHLIST ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};
