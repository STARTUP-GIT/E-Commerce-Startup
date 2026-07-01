import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

// Haversine formula to compute distance in km
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const getNearbyShops = async (req: Request, res: Response) => {
    try {
        const latParam = req.query.lat as string;
        const lngParam = req.query.lng as string;
        const radiusParam = req.query.radius as string;
        const district = req.query.district as string;
        const state = req.query.state as string;

        const lat1 = parseFloat(latParam);
        const lng1 = parseFloat(lngParam);
        const maxRadius = radiusParam ? parseFloat(radiusParam) : 100; // default 100km

        if (isNaN(lat1) || isNaN(lng1)) {
            return res.status(400).json({
                message: "Valid latitude and longitude query parameters are required"
            });
        }

        const whereClause: any = {
            isActive: true,
            isBanned: false,
            seller: {
                status: "APPROVED",
                isBanned: false
            }
        };

        if (district) {
            whereClause.defaultPickupAddress = {
                city: { equals: district.trim(), mode: "insensitive" }
            };
        }

        if (state) {
            if (!whereClause.defaultPickupAddress) {
                whereClause.defaultPickupAddress = {};
            }
            whereClause.defaultPickupAddress.state = { equals: state.trim(), mode: "insensitive" };
        }

        const shops = await prisma.shop.findMany({
            where: whereClause,
            include: {
                defaultPickupAddress: true
            }
        });

        const shopsWithDistance = shops
            .map((shop) => {
                const lat2 = shop.defaultPickupAddress?.latitude ? Number(shop.defaultPickupAddress.latitude) : null;
                const lng2 = shop.defaultPickupAddress?.longitude ? Number(shop.defaultPickupAddress.longitude) : null;
                const distance = lat2 !== null && lng2 !== null ? getDistance(lat1, lng1, lat2, lng2) : Infinity;
                return { ...shop, distance };
            })
            .filter((shop) => shop.distance <= maxRadius)
            .sort((a, b) => a.distance - b.distance);

        return res.status(200).json({
            count: shopsWithDistance.length,
            shops: shopsWithDistance
        });

    } catch (error) {
        console.error("GET NEARBY SHOPS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const searchShops = async (req: Request, res: Response) => {
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
            isActive: true,
            isBanned: false,
            seller: {
                status: "APPROVED",
                isBanned: false
            },
            OR: [
                { name: { contains: q.trim(), mode: "insensitive" } },
                { description: { contains: q.trim(), mode: "insensitive" } }
            ]
        };

        if (district) {
            whereClause.defaultPickupAddress = {
                city: { equals: district.trim(), mode: "insensitive" }
            };
        }

        if (state) {
            if (!whereClause.defaultPickupAddress) {
                whereClause.defaultPickupAddress = {};
            }
            whereClause.defaultPickupAddress.state = { equals: state.trim(), mode: "insensitive" };
        }

        const shops = await prisma.shop.findMany({
            where: whereClause,
            include: {
                defaultPickupAddress: true
            }
        });

        return res.status(200).json({
            count: shops.length,
            shops
        });

    } catch (error) {
        console.error("SEARCH SHOPS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getShopDetails = async (req: Request, res: Response) => {
    try {
        const shopId = req.params.shopId as string;

        if (!shopId) {
            return res.status(400).json({
                message: "Shop ID/Slug is required"
            });
        }

        const shop = await prisma.shop.findFirst({
            where: {
                isActive: true,
                isBanned: false,
                seller: {
                    status: "APPROVED",
                    isBanned: false
                },
                OR: [
                    { id: shopId },
                    { slug: shopId }
                ]
            },
            include: {
                defaultPickupAddress: true
            }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        return res.status(200).json({
            shop
        });

    } catch (error) {
        console.error("GET SHOP DETAILS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getActiveStates = async (req: Request, res: Response) => {
    try {
        const dbStates = await prisma.state.findMany({
            orderBy: { name: "asc" }
        });
        
        const allStates = dbStates.map(s => ({
            name: s.name,
            isEnabled: s.isActive
        }));
        
        const states = dbStates.filter(s => s.isActive).map(s => s.name);
        
        // Get settings
        const settingsRow = await prisma.platformSetting.findUnique({ where: { id: 1 } });
        const settings = settingsRow?.data as any;
        const districtRequired = settings?.districtRequired !== false;
        
        return res.status(200).json({ states, allStates, districtRequired });
    } catch (error: any) {
        console.error("GET ACTIVE STATES ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getShopCategories = async (req: Request, res: Response) => {
    try {
        const shopId = req.params.shopId as string;

        if (!shopId) {
            return res.status(400).json({
                message: "Shop ID/Slug is required"
            });
        }

        const shop = await prisma.shop.findFirst({
            where: {
                isActive: true,
                isBanned: false,
                seller: {
                    status: "APPROVED",
                    isBanned: false
                },
                OR: [
                    { id: shopId },
                    { slug: shopId }
                ]
            }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        const products = await prisma.product.findMany({
            where: {
                sellerId: shop.sellerId,
                isDeleted: false,
                status: "ACTIVE"
            },
            include: {
                category: true
            }
        });

        const categoriesMap = new Map();
        for (const p of products) {
            if (p.category) {
                categoriesMap.set(p.category.id, p.category);
            }
        }

        return res.status(200).json({
            count: categoriesMap.size,
            categories: Array.from(categoriesMap.values())
        });

    } catch (error) {
        console.error("GET SHOP CATEGORIES ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getShopProducts = async (req: Request, res: Response) => {
    try {
        const shopId = req.params.shopId as string;

        if (!shopId) {
            return res.status(400).json({
                message: "Shop ID/Slug is required"
            });
        }

        const shop = await prisma.shop.findFirst({
            where: {
                isActive: true,
                isBanned: false,
                seller: {
                    status: "APPROVED",
                    isBanned: false
                },
                OR: [
                    { id: shopId },
                    { slug: shopId }
                ]
            }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const skip = (page - 1) * limit;

        const sortBy = (req.query.sortBy as string) || "createdAt";
        const sortOrder = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

        const products = await prisma.product.findMany({
            where: {
                sellerId: shop.sellerId,
                isDeleted: false,
                status: "ACTIVE"
            },
            orderBy: {
                [sortBy]: sortOrder
            },
            skip,
            take: limit
        });

        const total = await prisma.product.count({
            where: {
                sellerId: shop.sellerId,
                isDeleted: false,
                status: "ACTIVE"
            }
        });

        return res.status(200).json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            products
        });

    } catch (error) {
        console.error("GET SHOP PRODUCTS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getFeaturedShops = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const district = req.query.district as string;
        const state = req.query.state as string;

        const whereClause: any = {
            isActive: true,
            isBanned: false,
            seller: {
                status: "APPROVED",
                isBanned: false
            }
        };

        if (district) {
            whereClause.defaultPickupAddress = {
                city: { equals: district.trim(), mode: "insensitive" }
            };
        }

        if (state) {
            if (!whereClause.defaultPickupAddress) {
                whereClause.defaultPickupAddress = {};
            }
            whereClause.defaultPickupAddress.state = { equals: state.trim(), mode: "insensitive" };
        }

        const shops = await prisma.shop.findMany({
            where: whereClause,
            include: {
                defaultPickupAddress: true
            },
            take: limit
        });

        return res.status(200).json({
            count: shops.length,
            shops
        });

    } catch (error) {
        console.error("GET FEATURED SHOPS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};
