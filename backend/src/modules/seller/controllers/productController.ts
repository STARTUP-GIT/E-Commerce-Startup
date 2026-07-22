import type { Request, Response } from "express";

import { prisma } from "../../../config/prisma.js";


interface Products {
    productname: string
    productquantity: number
    productprice: number
    imageUrl: string;
    categoryId?: string;
}

export const addProducts = async (req: Request, res: Response) => {
    try {

        const {
            productname,
            productquantity,
            productprice,
            imageUrl,
            categoryId,
        }: Products = req.body;

        const sellerId = req.sellerId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (
            !productname?.trim() ||
            !imageUrl?.trim() ||
            productquantity === undefined ||
            productprice === undefined
        ) {
            return res.status(400).json({
                message: "Enter all fields"
            });
        }

        if (productquantity <= 0) {
            return res.status(400).json({
                message:
                    "Product quantity cannot be less than one"
            });
        }

        if (productprice <= 0) {
            return res.status(400).json({
                message:
                    "Product price must be greater than 0"
            });
        }

        const shop = await prisma.shop.findUnique({
            where: {
                sellerId
            }
        });

        if (!shop) {
            return res.status(400).json({
                message:
                    "Create a shop first"
            });
        }

        if (shop.status !== "APPROVED") {
            return res.status(403).json({
                message:
                    "Shop is not approved"
            });
        }

        const normalizedName =
            productname.trim().toLowerCase();

        const products =
            await prisma.product.findMany({
                where: {
                    sellerId,
                    isDeleted: false
                },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    deletedAt: true,
                    isDeleted: true,
                    sellerId: true
                }
            });

        const existingProduct =
            products.find(
                product =>
                    product.name
                        .trim()
                        .toLowerCase() === normalizedName
            );

        if (existingProduct) {
            console.warn("DUPLICATE PRODUCT CREATION ATTEMPTED:", {
                productId: existingProduct.id,
                status: existingProduct.status,
                deletedAt: existingProduct.deletedAt,
                isDeleted: existingProduct.isDeleted,
                shopId: shop.id,
                sellerId: existingProduct.sellerId
            });
            return res.status(400).json({
                message:
                    "Product already exists"
            });
        }

        if (categoryId) {
            const cat = await prisma.category.findFirst({ where: { id: categoryId, isActive: true } });
            if (!cat) {
                return res.status(400).json({ message: "Invalid or inactive category selected" });
            }
        }

        const productadded =
            await prisma.product.create({
                data: {
                    name: productname.trim(),
                    stockQuantity: productquantity,
                    price: productprice,
                    imageUrl: imageUrl.trim(),
                    categoryId: categoryId || null,
                    sellerId: sellerId
                }
            });

        return res.status(201).json({
            message:
                "Product added successfully",
            product: productadded
        });

    } catch (error) {

        console.error(
            "ADD PRODUCT ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Internal Server Error"
        });
    }
};

export const getProducts = async (req: Request, res: Response) => {
    try {

        const sellerId = req.sellerId!;

        const seller = await prisma.seller.findUnique({
            where: {
                id: sellerId
            }
        });

        if (!seller) {
            return res.status(404).json({
                message: "Seller not found"
            });
        }

        const products = await prisma.product.findMany({
            where: {
                sellerId,
                isDeleted: false
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            count: products.length,
            products
        });

    } catch (error) {

        console.error(
            "GET PRODUCTS ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Internal Server Error"
        });
    }
}

export const EditProduct = async (req: Request, res: Response) => {
    try {

        const sellerId = req.sellerId!;
        const productId = req.params.productId;

        if (!productId) {
            return res.status(400).json({
                message: "Product ID is required"
            });
        }

        const {
            productquantity,
            productprice,
            imageUrl,
            categoryId,
        } = req.body;

        if (
            productquantity === undefined &&
            productprice === undefined &&
            imageUrl === undefined &&
            categoryId === undefined
        ) {
            return res.status(400).json({
                message:
                    "Provide quantity, price, image or category to update"
            });
        }

        if (
            productquantity !== undefined &&
            productquantity <= 0
        ) {
            return res.status(400).json({
                message:
                    "Product quantity cannot be less than one"
            });
        }

        if (
            productprice !== undefined &&
            productprice <= 0
        ) {
            return res.status(400).json({
                message:
                    "Product price must be greater than 0"
            });
        }

        if (categoryId) {
            const cat = await prisma.category.findFirst({ where: { id: categoryId, isActive: true } });
            if (!cat) {
                return res.status(400).json({ message: "Invalid or inactive category selected" });
            }
        }

        const product = await prisma.product.findUnique({
            where: {
                id: productId as string
            }
        });

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (product.sellerId !== sellerId) {
            return res.status(403).json({
                message:
                    "You can only edit your own products"
            });
        }

        const updatedProduct =
            await prisma.product.update({
                where: {
                    id: productId as string
                },
                data: {
                    ...(productquantity !== undefined && {
                        stockQuantity: productquantity
                    }),

                    ...(productprice !== undefined && {
                        price: productprice
                    }),

                    ...(imageUrl !== undefined && {
                        imageUrl: imageUrl.trim()
                    }),

                    ...(categoryId !== undefined && {
                        categoryId: categoryId || null
                    }),
                }
            });

        return res.status(200).json({
            message:
                "Product updated successfully",
            product: updatedProduct
        });

    } catch (error) {

        console.error(
            "EDIT PRODUCT ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Internal Server Error"
        });
    }
};


export const removeProducts = async (req: Request, res: Response) => {
    try {

        const sellerId = req.sellerId;
        const productId = req.params.productId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!productId) {
            return res.status(400).json({
                message: "Product ID is required"
            });
        }

        const product = await prisma.product.findUnique({
            where: {
                id: productId as string
            }
        });

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (product.sellerId !== sellerId) {
            return res.status(403).json({
                message:
                    "You can only delete your own products"
            });
        }

        if (product.isDeleted) {
            return res.status(400).json({
                message:
                    "Product already deleted"
            });
        }

        await prisma.product.update({
            where: {
                id: productId as string
            },
            data: {
                isDeleted: true,
                deletedAt: new Date()
            }
        });

        return res.status(200).json({
            message:
                "Product deleted successfully"
        });

    } catch (error) {

        console.error(
            "DELETE PRODUCT ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Internal Server Error"
        });
    }
};

export const restoreDeletedProduct = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const productId = req.params.productId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!productId) {
            return res.status(400).json({
                message: "Product ID is required"
            });
        }

        const product = await prisma.product.findUnique({
            where: {
                id: productId as string
            }
        });

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (product.sellerId !== sellerId) {
            return res.status(403).json({
                message: "You can only restore your own products"
            });
        }

        if (!product.isDeleted) {
            return res.status(400).json({
                message: "Product is not deleted"
            });
        }

        const restoredProduct = await prisma.product.update({
            where: {
                id: productId as string
            },
            data: {
                isDeleted: false,
                deletedAt: null
            }
        });

        return res.status(200).json({
            message: "Product restored successfully",
            product: restoredProduct
        });

    } catch (error) {
        console.error("RESTORE PRODUCT ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const updateProductStock = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const productId = req.params.productId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!productId) {
            return res.status(400).json({
                message: "Product ID is required"
            });
        }

        const { stockQuantity, quantity } = req.body;
        const targetStock = stockQuantity !== undefined ? stockQuantity : quantity;

        if (targetStock === undefined || typeof targetStock !== "number" || targetStock < 0 || !Number.isInteger(targetStock)) {
            return res.status(400).json({
                message: "Stock quantity must be a non-negative integer"
            });
        }

        const product = await prisma.product.findUnique({
            where: {
                id: productId as string
            }
        });

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (product.sellerId !== sellerId) {
            return res.status(403).json({
                message: "You can only update stock for your own products"
            });
        }

        if (product.isDeleted) {
            return res.status(400).json({
                message: "Cannot update stock for a deleted product"
            });
        }

        const updatedProduct = await prisma.product.update({
            where: {
                id: productId as string
            },
            data: {
                stockQuantity: targetStock
            }
        });

        return res.status(200).json({
            message: "Product stock updated successfully",
            product: updatedProduct
        });

    } catch (error) {
        console.error("UPDATE STOCK ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getLowStockProducts = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const thresholdParam = req.query.threshold as string;
        const threshold = thresholdParam !== undefined ? parseInt(thresholdParam, 10) : 10;

        if (isNaN(threshold) || threshold < 0) {
            return res.status(400).json({
                message: "Threshold must be a non-negative integer"
            });
        }

        const products = await prisma.product.findMany({
            where: {
                sellerId,
                isDeleted: false,
                stockQuantity: {
                    lte: threshold
                }
            },
            orderBy: {
                stockQuantity: "asc"
            }
        });

        return res.status(200).json({
            count: products.length,
            products
        });

    } catch (error) {
        console.error("GET LOW STOCK PRODUCTS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};