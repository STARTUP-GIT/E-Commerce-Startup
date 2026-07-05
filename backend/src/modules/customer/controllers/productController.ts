import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getProducts = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const skip = (page - 1) * limit;

        const sortBy = (req.query.sortBy as string) || "createdAt";
        const sortOrder = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

        const district = req.query.district as string;
        const state = req.query.state as string;

        const whereClause: any = {
            isDeleted: false,
            status: "ACTIVE"
        };

        if (district) {
            whereClause.seller = {
                shop: {
                    defaultPickupAddress: {
                        city: { equals: district.trim(), mode: "insensitive" }
                    }
                }
            };
        }

        if (state) {
            if (!whereClause.seller) {
                whereClause.seller = { shop: { defaultPickupAddress: {} } };
            }
            if (!whereClause.seller.shop) {
                whereClause.seller.shop = { defaultPickupAddress: {} };
            }
            if (!whereClause.seller.shop.defaultPickupAddress) {
                whereClause.seller.shop.defaultPickupAddress = {};
            }
            whereClause.seller.shop.defaultPickupAddress.state = { equals: state.trim(), mode: "insensitive" };
        }

        if (!whereClause.seller) {
            whereClause.seller = {};
        }
        whereClause.seller.isBanned = false;
        whereClause.seller.isDeactivated = false;
        if (!whereClause.seller.shop) {
            whereClause.seller.shop = {};
        }
        whereClause.seller.shop.status = "APPROVED";

        const products = await prisma.product.findMany({
            where: whereClause,
            orderBy: {
                [sortBy]: sortOrder
            },
            skip,
            take: limit
        });

        const total = await prisma.product.count({
            where: whereClause
        });

        return res.status(200).json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            products
        });

    } catch (error) {
        console.error("GET PRODUCTS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId;

        if (!productId) {
            return res.status(400).json({
                message: "Product ID is required"
            });
        }

        const product = await prisma.product.findUnique({
            where: {
                id: productId as string
            },
            include: {
                images: true,
                variants: true,
                attributes: true,
                category: true,
                seller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        isBanned: true,
                        isDeactivated: true,
                        status: true,
                        shop: true
                    }
                }
            }
        });

        if (
            !product || 
            product.isDeleted || 
            product.status !== "ACTIVE" || 
            product.seller.isBanned || 
            product.seller.isDeactivated || 
            !product.seller.shop || 
            product.seller.shop.status !== "APPROVED"
        ) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        return res.status(200).json({
            product
        });

    } catch (error) {
        console.error("GET PRODUCT ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const searchProducts = async (req: Request, res: Response) => {
    try {
        const q = req.query.q as string;
        const district = req.query.district as string;
        const state = req.query.state as string;

        if (!q?.trim()) {
            return res.status(400).json({
                message: "Search query 'q' is required"
            });
        }

        const whereClause: any = {
            isDeleted: false,
            status: "ACTIVE",
            OR: [
                { name: { contains: q.trim(), mode: "insensitive" } },
                { description: { contains: q.trim(), mode: "insensitive" } }
            ]
        };

        if (district) {
            whereClause.seller = {
                shop: {
                    defaultPickupAddress: {
                        city: { equals: district.trim(), mode: "insensitive" }
                    }
                }
            };
        }

        if (state) {
            if (!whereClause.seller) {
                whereClause.seller = { shop: { defaultPickupAddress: {} } };
            }
            if (!whereClause.seller.shop) {
                whereClause.seller.shop = { defaultPickupAddress: {} };
            }
            if (!whereClause.seller.shop.defaultPickupAddress) {
                whereClause.seller.shop.defaultPickupAddress = {};
            }
            whereClause.seller.shop.defaultPickupAddress.state = { equals: state.trim(), mode: "insensitive" };
        }

        if (!whereClause.seller) {
            whereClause.seller = {};
        }
        whereClause.seller.isBanned = false;
        whereClause.seller.isDeactivated = false;
        if (!whereClause.seller.shop) {
            whereClause.seller.shop = {};
        }
        whereClause.seller.shop.status = "APPROVED";

        const products = await prisma.product.findMany({
            where: whereClause
        });

        return res.status(200).json({
            count: products.length,
            products
        });

    } catch (error) {
        console.error("SEARCH PRODUCTS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const filterProducts = async (req: Request, res: Response) => {
    try {
        const { categoryId, minPrice, maxPrice, shopId, rating, district, state } = req.query;

        const where: any = {
            isDeleted: false,
            status: "ACTIVE"
        };

        if (district) {
            where.seller = {
                shop: {
                    defaultPickupAddress: {
                        city: { equals: String(district).trim(), mode: "insensitive" }
                    }
                }
            };
        }

        if (state) {
            if (!where.seller) {
                where.seller = { shop: { defaultPickupAddress: {} } };
            }
            if (!where.seller.shop) {
                where.seller.shop = { defaultPickupAddress: {} };
            }
            if (!where.seller.shop.defaultPickupAddress) {
                where.seller.shop.defaultPickupAddress = {};
            }
            where.seller.shop.defaultPickupAddress.state = { equals: String(state).trim(), mode: "insensitive" };
        }

        if (categoryId) {
            where.categoryId = categoryId as string;
        }

        if (shopId) {
            const shop = await prisma.shop.findFirst({
                where: {
                    OR: [
                        { id: shopId as string },
                        { slug: shopId as string }
                    ]
                }
            });
            if (shop) {
                where.sellerId = shop.sellerId;
            } else {
                where.sellerId = "non-existent-id";
            }
        }

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price.gte = parseFloat(minPrice as string);
            if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
        }

        if (rating) {
            const targetRating = parseFloat(rating as string);
            where.reviews = {
                some: {
                    rating: {
                        gte: targetRating
                    }
                }
            };
        }

        if (!where.seller) {
            where.seller = {};
        }
        where.seller.isBanned = false;
        where.seller.isDeactivated = false;
        where.seller.status = "ACTIVE";
        if (!where.seller.shop) {
            where.seller.shop = {};
        }
        where.seller.shop.status = "APPROVED";

        const products = await prisma.product.findMany({
            where,
            include: {
                category: true
            }
        });

        return res.status(200).json({
            count: products.length,
            products
        });

    } catch (error) {
        console.error("FILTER PRODUCTS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getProductsByCategory = async (req: Request, res: Response) => {
    try {
        const categoryId = req.params.categoryId as string;
        const district = req.query.district as string;
        const state = req.query.state as string;

        if (!categoryId) {
            return res.status(400).json({
                message: "Category ID is required"
            });
        }

        const whereClause: any = {
            categoryId,
            isDeleted: false,
            status: "ACTIVE"
        };

        if (district) {
            whereClause.seller = {
                shop: {
                    defaultPickupAddress: {
                        city: { equals: district.trim(), mode: "insensitive" }
                    }
                }
            };
        }

        if (state) {
            if (!whereClause.seller) {
                whereClause.seller = { shop: { defaultPickupAddress: {} } };
            }
            if (!whereClause.seller.shop) {
                whereClause.seller.shop = { defaultPickupAddress: {} };
            }
            if (!whereClause.seller.shop.defaultPickupAddress) {
                whereClause.seller.shop.defaultPickupAddress = {};
            }
            whereClause.seller.shop.defaultPickupAddress.state = { equals: state.trim(), mode: "insensitive" };
        }

        if (!whereClause.seller) {
            whereClause.seller = {};
        }
        whereClause.seller.isBanned = false;
        whereClause.seller.isDeactivated = false;
        if (!whereClause.seller.shop) {
            whereClause.seller.shop = {};
        }
        whereClause.seller.shop.status = "APPROVED";

        const products = await prisma.product.findMany({
            where: whereClause
        });

        return res.status(200).json({
            count: products.length,
            products
        });

    } catch (error) {
        console.error("GET PRODUCTS BY CATEGORY ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getFeaturedProducts = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const district = req.query.district as string;
        const state = req.query.state as string;

        const whereClause: any = {
            isDeleted: false,
            status: "ACTIVE"
        };

        if (district) {
            whereClause.seller = {
                shop: {
                    defaultPickupAddress: {
                        city: { equals: district.trim(), mode: "insensitive" }
                    }
                }
            };
        }

        if (state) {
            if (!whereClause.seller) {
                whereClause.seller = { shop: { defaultPickupAddress: {} } };
            }
            if (!whereClause.seller.shop) {
                whereClause.seller.shop = { defaultPickupAddress: {} };
            }
            if (!whereClause.seller.shop.defaultPickupAddress) {
                whereClause.seller.shop.defaultPickupAddress = {};
            }
            whereClause.seller.shop.defaultPickupAddress.state = { equals: state.trim(), mode: "insensitive" };
        }

        if (!whereClause.seller) {
            whereClause.seller = {};
        }
        whereClause.seller.isBanned = false;
        whereClause.seller.isDeactivated = false;
        if (!whereClause.seller.shop) {
            whereClause.seller.shop = {};
        }
        whereClause.seller.shop.status = "APPROVED";

        const products = await prisma.product.findMany({
            where: whereClause,
            orderBy: {
                price: "desc" // featured standard sorting
            },
            take: limit
        });

        return res.status(200).json({
            count: products.length,
            products
        });

    } catch (error) {
        console.error("GET FEATURED PRODUCTS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getRecommendedProducts = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const district = req.query.district as string;
        const state = req.query.state as string;

        let categoryIds: string[] = [];

        if (customerId) {
            // Find categories from past purchases
            const pastItems = await prisma.orderItem.findMany({
                where: {
                    sellerOrder: {
                        order: {
                            customerId
                        }
                    }
                },
                select: {
                    product: {
                        select: {
                            categoryId: true
                        }
                    }
                }
            });
            categoryIds = pastItems
                .map((item) => item.product?.categoryId)
                .filter(Boolean) as string[];
        }

        const whereClause: any = {
            isDeleted: false,
            status: "ACTIVE",
            ...(categoryIds.length > 0 && {
                categoryId: {
                    in: categoryIds
                }
            })
        };

        if (district) {
            whereClause.seller = {
                shop: {
                    defaultPickupAddress: {
                        city: { equals: district.trim(), mode: "insensitive" }
                    }
                }
            };
        }

        if (state) {
            if (!whereClause.seller) {
                whereClause.seller = { shop: { defaultPickupAddress: {} } };
            }
            if (!whereClause.seller.shop) {
                whereClause.seller.shop = { defaultPickupAddress: {} };
            }
            if (!whereClause.seller.shop.defaultPickupAddress) {
                whereClause.seller.shop.defaultPickupAddress = {};
            }
            whereClause.seller.shop.defaultPickupAddress.state = { equals: state.trim(), mode: "insensitive" };
        }

        if (!whereClause.seller) {
            whereClause.seller = {};
        }
        whereClause.seller.isBanned = false;
        whereClause.seller.isDeactivated = false;
        if (!whereClause.seller.shop) {
            whereClause.seller.shop = {};
        }
        whereClause.seller.shop.status = "APPROVED";

        const products = await prisma.product.findMany({
            where: whereClause,
            take: limit
        });

        return res.status(200).json({
            count: products.length,
            products
        });

    } catch (error) {
        console.error("GET RECOMMENDED PRODUCTS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getRecentlyViewedProducts = async (req: Request, res: Response) => {
    try {
        const idsParam = req.query.ids as string;

        if (!idsParam?.trim()) {
            return res.status(200).json({
                count: 0,
                products: []
            });
        }

        const ids = idsParam.split(",").map((id) => id.trim());

        const products = await prisma.product.findMany({
            where: {
                id: {
                    in: ids
                },
                isDeleted: false,
                status: "ACTIVE",
                seller: {
                    isBanned: false,
                    isDeactivated: false,
                    shop: {
                        status: "APPROVED"
                    }
                }
            }
        });

        // Maintain the order of IDs passed by the client
        const sortedProducts = ids
            .map((id) => products.find((p) => p.id === id))
            .filter(Boolean);

        return res.status(200).json({
            count: sortedProducts.length,
            products: sortedProducts
        });

    } catch (error) {
        console.error("GET RECENTLY VIEWED PRODUCTS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};
