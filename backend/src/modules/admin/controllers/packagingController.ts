import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

/**
 * List packaging options with filtering, searching, and pagination
 */
export const getAdminPackagingOptions = async (req: Request, res: Response) => {
    try {
        const {
            status,
            shopId,
            search,
            page = "1",
            limit = "20"
        } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const where: any = {};

        if (status && status !== "ALL") {
            where.status = status;
        }

        if (shopId) {
            where.shopId = String(shopId);
        }

        if (search) {
            const searchStr = String(search).trim();
            where.OR = [
                { name: { contains: searchStr, mode: "insensitive" } },
                { description: { contains: searchStr, mode: "insensitive" } },
                { shop: { name: { contains: searchStr, mode: "insensitive" } } },
                { shop: { seller: { firstName: { contains: searchStr, mode: "insensitive" } } } },
                { shop: { seller: { lastName: { contains: searchStr, mode: "insensitive" } } } },
                { shop: { seller: { email: { contains: searchStr, mode: "insensitive" } } } }
            ];
        }

        const [total, items, pendingCount, approvedCount, rejectedCount] = await Promise.all([
            prisma.packagingOption.count({ where }),
            prisma.packagingOption.findMany({
                where,
                include: {
                    shop: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            status: true,
                            seller: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    phone: true
                                }
                            }
                        }
                    },
                    reviewedByAdmin: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    }
                },
                orderBy: [
                    { createdAt: "desc" }
                ],
                skip,
                take: limitNum
            }),
            prisma.packagingOption.count({ where: { status: "PENDING" } }),
            prisma.packagingOption.count({ where: { status: "APPROVED" } }),
            prisma.packagingOption.count({ where: { status: "REJECTED" } })
        ]);

        return res.status(200).json({
            packagingOptions: items,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            },
            counts: {
                pending: pendingCount,
                approved: approvedCount,
                rejected: rejectedCount,
                total: pendingCount + approvedCount + rejectedCount
            }
        });
    } catch (error: any) {
        console.error("GET ADMIN PACKAGING OPTIONS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * Approve a packaging option
 */
export const approvePackagingOption = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const adminId = (req as any).adminId || (req as any).user?.id;

        const option = await prisma.packagingOption.findUnique({
            where: { id },
            include: { shop: true }
        });

        if (!option) {
            return res.status(404).json({ message: "Packaging option not found" });
        }

        const updated = await prisma.packagingOption.update({
            where: { id },
            data: {
                status: "APPROVED",
                rejectionReason: null,
                reviewedByAdminId: adminId || null,
                reviewedAt: new Date(),
                isActive: true
            },
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        seller: { select: { id: true, firstName: true, lastName: true, email: true } }
                    }
                }
            }
        });

        // Audit log
        try {
            if (adminId) {
                await prisma.adminAction.create({
                    data: {
                        adminId: String(adminId),
                        actionType: "SHOP_APPROVED",
                        targetType: "PACKAGING_OPTION",
                        targetId: id.slice(0, 30),
                        description: `Approved packaging option "${option.name}" (₹${Number(option.price)}) for shop ${option.shop.name}`,
                        newValue: {
                            packagingName: option.name,
                            price: Number(option.price),
                            shopName: option.shop.name
                        }
                    }
                });
            }
        } catch (auditErr) {
            console.warn("Audit log creation skipped:", auditErr);
        }

        return res.status(200).json({
            message: `Packaging option "${updated.name}" approved successfully`,
            packagingOption: updated
        });
    } catch (error: any) {
        console.error("APPROVE PACKAGING OPTION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * Reject a packaging option with a reason
 */
export const rejectPackagingOption = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { reason } = req.body;
        const adminId = (req as any).adminId || (req as any).user?.id;

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ message: "Rejection reason is required" });
        }

        const option = await prisma.packagingOption.findUnique({
            where: { id },
            include: { shop: true }
        });

        if (!option) {
            return res.status(404).json({ message: "Packaging option not found" });
        }

        const updated = await prisma.packagingOption.update({
            where: { id },
            data: {
                status: "REJECTED",
                rejectionReason: reason.trim(),
                reviewedByAdminId: adminId || null,
                reviewedAt: new Date(),
                isActive: false
            },
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        seller: { select: { id: true, firstName: true, lastName: true, email: true } }
                    }
                }
            }
        });

        try {
            if (adminId) {
                await prisma.adminAction.create({
                    data: {
                        adminId: String(adminId),
                        actionType: "SHOP_REJECTED",
                        targetType: "PACKAGING_OPTION",
                        targetId: id.slice(0, 30),
                        description: `Rejected packaging option "${option.name}": ${reason.trim()}`,
                        newValue: {
                            packagingName: option.name,
                            reason: reason.trim(),
                            shopName: option.shop.name
                        }
                    }
                });
            }
        } catch (auditErr) {
            console.warn("Audit log creation skipped:", auditErr);
        }

        return res.status(200).json({
            message: `Packaging option "${updated.name}" rejected`,
            packagingOption: updated
        });
    } catch (error: any) {
        console.error("REJECT PACKAGING OPTION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * Request changes from the seller
 */
export const requestChangesPackagingOption = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { reason } = req.body;
        const adminId = (req as any).adminId || (req as any).user?.id;

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ message: "Reason explaining requested changes is required" });
        }

        const option = await prisma.packagingOption.findUnique({
            where: { id },
            include: { shop: true }
        });

        if (!option) {
            return res.status(404).json({ message: "Packaging option not found" });
        }

        const updated = await prisma.packagingOption.update({
            where: { id },
            data: {
                status: "CHANGES_REQUESTED",
                rejectionReason: reason.trim(),
                reviewedByAdminId: adminId || null,
                reviewedAt: new Date()
            },
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        seller: { select: { id: true, firstName: true, lastName: true, email: true } }
                    }
                }
            }
        });

        return res.status(200).json({
            message: `Changes requested for packaging option "${updated.name}"`,
            packagingOption: updated
        });
    } catch (error: any) {
        console.error("REQUEST CHANGES PACKAGING OPTION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * Suspend an approved packaging option
 */
export const suspendPackagingOption = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { reason } = req.body;
        const adminId = (req as any).adminId || (req as any).user?.id;

        const option = await prisma.packagingOption.findUnique({
            where: { id },
            include: { shop: true }
        });

        if (!option) {
            return res.status(404).json({ message: "Packaging option not found" });
        }

        const updated = await prisma.packagingOption.update({
            where: { id },
            data: {
                status: "SUSPENDED",
                isActive: false,
                rejectionReason: reason?.trim() || "Suspended by Administrator",
                reviewedByAdminId: adminId || null,
                reviewedAt: new Date()
            },
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        seller: { select: { id: true, firstName: true, lastName: true, email: true } }
                    }
                }
            }
        });

        return res.status(200).json({
            message: `Packaging option "${updated.name}" has been suspended`,
            packagingOption: updated
        });
    } catch (error: any) {
        console.error("SUSPEND PACKAGING OPTION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
