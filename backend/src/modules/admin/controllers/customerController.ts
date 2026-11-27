import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";
import { sanitizeCustomer } from "../../../utils/sanitize.js";

export const getCustomers = async (req: Request, res: Response) => {
    try {
        const { search, status, state, district, unassigned, page = 1, limit = 10 } = req.query;

        const andConditions: any[] = [];
        const cleanStatus = status && typeof status === "string" ? status.trim().toUpperCase() : "";

        if (cleanStatus === "DELETED") {
            andConditions.push({ isDeactivated: true });
        } else {
            andConditions.push({ isDeactivated: false });
            if (cleanStatus === "BANNED") {
                andConditions.push({ isBanned: true });
            } else if (cleanStatus === "ACTIVE") {
                andConditions.push({ isBanned: false });
            }
        }

        if (search) {
            const searchStr = String(search).trim();
            andConditions.push({
                OR: [
                    { email: { contains: searchStr, mode: "insensitive" } },
                    { firstName: { contains: searchStr, mode: "insensitive" } },
                    { lastName: { contains: searchStr, mode: "insensitive" } },
                    { username: { contains: searchStr, mode: "insensitive" } },
                    { phone: { contains: searchStr, mode: "insensitive" } }
                ]
            });
        }

        const isUnassigned = unassigned === "true" || state === "UNASSIGNED";
        const stateStr = typeof state === "string" ? state.trim() : "";
        const districtStr = typeof district === "string" ? district.trim() : "";

        if (isUnassigned) {
            andConditions.push({
                addresses: {
                    none: { state: { not: "" } }
                }
            });
        } else if (stateStr || districtStr) {
            const addressCond: any = {};
            if (stateStr) {
                addressCond.state = { equals: stateStr, mode: "insensitive" };
            }
            if (districtStr) {
                addressCond.district = { equals: districtStr, mode: "insensitive" };
            }
            andConditions.push({
                addresses: {
                    some: addressCond
                }
            });
        }

        const whereClause = { AND: andConditions };

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [customers, total] = await prisma.$transaction([
            prisma.customer.findMany({
                where: whereClause,
                include: {
                    addresses: {
                        orderBy: { isDefault: "desc" },
                        take: 1,
                        select: {
                            state: true,
                            district: true,
                            city: true
                        }
                    },
                    _count: {
                        select: { orders: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.customer.count({ where: whereClause })
        ]);

        return res.status(200).json({
            customers: customers.map(sanitizeCustomer),
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        console.error("GET CUSTOMERS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getCustomer = async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id);

        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                addresses: true,
                orders: { take: 5, orderBy: { createdAt: "desc" } },
                payments: { take: 5, orderBy: { createdAt: "desc" } }
            }
        });

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        return res.status(200).json({ customer: sanitizeCustomer(customer) });
    } catch (error: any) {
        console.error("GET CUSTOMER DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const banCustomer = async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body ?? {};

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ success: false, message: "Reason is required." });
        }
        if (reason.trim().length < 5 || reason.trim().length > 500) {
            return res.status(400).json({ success: false, message: "Reason must be between 5 and 500 characters." });
        }

        const customer = await prisma.customer.findUnique({ where: { id: customerId } });

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                isBanned: true,
                bannedAt: new Date(),
                banReason: reason
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.CUSTOMER_BANNED,
            targetType: "Customer",
            targetId: customerId,
            description: `Customer ${customer.username} banned. Reason: ${reason}`,
            previousValue: { isBanned: customer.isBanned },
            newValue: { isBanned: true, banReason: reason }
        });

        return res.status(200).json({ message: "Customer banned successfully", customer: sanitizeCustomer(updatedCustomer) });
    } catch (error: any) {
        console.error("BAN CUSTOMER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const unbanCustomer = async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id);
        const adminId = req.adminId!;

        const customer = await prisma.customer.findUnique({ where: { id: customerId } });

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: { isBanned: false, bannedAt: null, banReason: null }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.CUSTOMER_UNBANNED,
            targetType: "Customer",
            targetId: customerId,
            description: `Customer ${customer.username} unbanned`,
            previousValue: { isBanned: customer.isBanned },
            newValue: { isBanned: false }
        });

        return res.status(200).json({ message: "Customer unbanned successfully", customer: sanitizeCustomer(updatedCustomer) });
    } catch (error: any) {
        console.error("UNBAN CUSTOMER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteCustomer = async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body ?? {};

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ success: false, message: "Reason is required." });
        }
        if (reason.trim().length < 5 || reason.trim().length > 500) {
            return res.status(400).json({ success: false, message: "Reason must be between 5 and 500 characters." });
        }

        const customer = await prisma.customer.findUnique({ where: { id: customerId } });

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        // Soft delete customer
        await prisma.customer.update({
            where: { id: customerId },
            data: { isDeactivated: true, deactivatedAt: new Date() }
        });

        // Revoke all customer refresh tokens
        await prisma.customerRefreshToken.deleteMany({
            where: { customerId }
        });

        // Clear active cart and wishlist
        await prisma.cart.deleteMany({
            where: { customerId }
        });
        await prisma.wishlist.deleteMany({
            where: { customerId }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.CUSTOMER_BANNED,
            targetType: "Customer",
            targetId: customerId,
            description: `Customer ${customer.username} soft-deleted by admin. Reason: ${reason.trim()}`,
            previousValue: { isDeactivated: customer.isDeactivated },
            newValue: { isDeactivated: true }
        });

        return res.status(200).json({ success: true, message: "Customer deleted successfully" });
    } catch (error: any) {
        console.error("DELETE CUSTOMER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getCustomerOrders = async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id);
        const orders = await prisma.order.findMany({
            where: { customerId },
            include: { sellerOrders: true },
            orderBy: { createdAt: "desc" }
        });
        return res.status(200).json({ orders });
    } catch (error: any) {
        console.error("GET CUSTOMER ORDERS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getCustomerPayments = async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id);
        const payments = await prisma.payment.findMany({
            where: { customerId },
            orderBy: { createdAt: "desc" }
        });
        return res.status(200).json({ payments });
    } catch (error: any) {
        console.error("GET CUSTOMER PAYMENTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
