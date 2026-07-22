import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

// Helper to seed default payment methods if none exist
export const ensureDefaultPaymentMethods = async () => {
    try {
        const count = await prisma.paymentMethodSetting.count();
        if (count === 0) {
            await prisma.paymentMethodSetting.createMany({
                data: [
                    {
                        code: "RAZORPAY",
                        name: "Razorpay",
                        description: "Online payments via Razorpay.",
                        enabled: true,
                        displayOrder: 1,
                    },
                    {
                        code: "COD",
                        name: "Cash on Delivery",
                        description: "Customer pays when order is delivered.",
                        enabled: true,
                        displayOrder: 2,
                    },
                ],
                skipDuplicates: true,
            });
        } else {
            // Update existing defaults if they exist with legacy names
            await prisma.paymentMethodSetting.updateMany({
                where: { code: "RAZORPAY", name: "Razorpay (Pay Online)" },
                data: { name: "Razorpay", description: "Online payments via Razorpay." },
            });
            await prisma.paymentMethodSetting.updateMany({
                where: { code: "COD", name: "Cash on Delivery (COD)" },
                data: { name: "Cash on Delivery", description: "Customer pays when order is delivered." },
            });
        }
    } catch (error) {
        console.error("Error seeding default payment methods:", error);
    }
};

export const getPaymentMethods = async (req: Request, res: Response) => {
    try {
        await ensureDefaultPaymentMethods();
        const methods = await prisma.paymentMethodSetting.findMany({
            orderBy: { displayOrder: "asc" },
        });
        return res.status(200).json({ paymentMethods: methods });
    } catch (error: any) {
        console.error("GET PAYMENT METHODS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const createPaymentMethod = async (req: Request, res: Response) => {
    try {
        const { name, code, description, enabled, displayOrder } = req.body;

        if (!name || !code) {
            return res.status(400).json({ message: "Name and Code are required" });
        }

        const normalizedCode = code.trim().toUpperCase();

        const existing = await prisma.paymentMethodSetting.findUnique({
            where: { code: normalizedCode },
        });

        if (existing) {
            return res.status(400).json({ message: `Payment method with code '${normalizedCode}' already exists.` });
        }

        const newMethod = await prisma.paymentMethodSetting.create({
            data: {
                name: name.trim(),
                code: normalizedCode,
                description: description?.trim() || null,
                enabled: enabled !== undefined ? !!enabled : true,
                displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
            },
        });

        return res.status(201).json({ message: "Payment method created successfully", paymentMethod: newMethod });
    } catch (error: any) {
        console.error("CREATE PAYMENT METHOD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updatePaymentMethod = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, description, enabled, displayOrder } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Payment Method ID is required" });
        }

        const method = await prisma.paymentMethodSetting.findUnique({ where: { id } });
        if (!method) {
            return res.status(404).json({ message: "Payment method not found" });
        }

        const updated = await prisma.paymentMethodSetting.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && { description: description.trim() }),
                ...(enabled !== undefined && { enabled: !!enabled }),
                ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
            },
        });

        return res.status(200).json({ message: "Payment method updated successfully", paymentMethod: updated });
    } catch (error: any) {
        console.error("UPDATE PAYMENT METHOD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const togglePaymentMethodStatus = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { enabled } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Payment Method ID is required" });
        }

        const method = await prisma.paymentMethodSetting.findUnique({ where: { id } });
        if (!method) {
            return res.status(404).json({ message: "Payment method not found" });
        }

        const newEnabled = enabled !== undefined ? !!enabled : !method.enabled;

        const updated = await prisma.paymentMethodSetting.update({
            where: { id },
            data: { enabled: newEnabled },
        });

        return res.status(200).json({ message: `Payment method ${newEnabled ? "enabled" : "disabled"} successfully`, paymentMethod: updated });
    } catch (error: any) {
        console.error("TOGGLE PAYMENT METHOD STATUS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deletePaymentMethod = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({ message: "Payment Method ID is required" });
        }

        const method = await prisma.paymentMethodSetting.findUnique({ where: { id } });
        if (!method) {
            return res.status(404).json({ message: "Payment method not found" });
        }

        // Check if orders exist using this payment method
        const orderCount = await prisma.order.count({
            where: { paymentMethod: method.code },
        });

        if (orderCount > 0) {
            return res.status(400).json({
                message: `Cannot delete payment method '${method.name}' because it has been used in ${orderCount} order(s). Disable it instead.`,
            });
        }

        await prisma.paymentMethodSetting.delete({ where: { id } });

        return res.status(200).json({ message: "Payment method deleted successfully" });
    } catch (error: any) {
        console.error("DELETE PAYMENT METHOD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
