import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";

export const getCustomers = async (req: Request, res: Response) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;

        const whereClause: any = { isDeactivated: false };

        if (search) {
            whereClause.OR = [
                { email: { contains: String(search), mode: "insensitive" } },
                { firstName: { contains: String(search), mode: "insensitive" } },
                { lastName: { contains: String(search), mode: "insensitive" } },
                { username: { contains: String(search), mode: "insensitive" } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [customers, total] = await prisma.$transaction([
            prisma.customer.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.customer.count({ where: whereClause })
        ]);

        return res.status(200).json({
            customers,
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

        return res.status(200).json({ customer });
    } catch (error: any) {
        console.error("GET CUSTOMER DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const banCustomer = async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body;

        const customer = await prisma.customer.findUnique({ where: { id: customerId } });

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                isBanned: true,
                bannedAt: new Date(),
                banReason: reason || "Violations of platform terms of service"
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

        return res.status(200).json({ message: "Customer banned successfully", customer: updatedCustomer });
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

        return res.status(200).json({ message: "Customer unbanned successfully", customer: updatedCustomer });
    } catch (error: any) {
        console.error("UNBAN CUSTOMER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteCustomer = async (req: Request, res: Response) => {
    try {
        const customerId = String(req.params.id);
        const adminId = req.adminId!;

        const customer = await prisma.customer.findUnique({ where: { id: customerId } });

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        await prisma.customer.update({
            where: { id: customerId },
            data: { isDeactivated: true, deactivatedAt: new Date() }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.CUSTOMER_BANNED,
            targetType: "Customer",
            targetId: customerId,
            description: `Customer ${customer.username} soft-deleted by admin`,
            previousValue: { isDeactivated: customer.isDeactivated },
            newValue: { isDeactivated: true }
        });

        return res.status(200).json({ message: "Customer deleted successfully" });
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
