import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

// Helper to seed default delivery methods if none exist
export const ensureDefaultDeliveryMethods = async () => {
    try {
        const count = await prisma.deliveryMethodSetting.count();
        if (count === 0) {
            await prisma.deliveryMethodSetting.createMany({
                data: [
                    {
                        code: "PORTAL_DELIVERY",
                        name: "Portal Delivery",
                        description: "Delivered using Aura logistics",
                        enabled: true,
                        displayOrder: 1,
                    },
                    {
                        code: "SELLER_DELIVERY",
                        name: "Seller Delivery",
                        description: "Delivered directly by seller",
                        enabled: true,
                        displayOrder: 2,
                    },
                ],
                skipDuplicates: true,
            });
        } else {
            // Update existing defaults if they exist with legacy descriptions
            await prisma.deliveryMethodSetting.updateMany({
                where: { code: "PORTAL_DELIVERY" },
                data: { name: "Portal Delivery", description: "Delivered using Aura logistics" },
            });
            await prisma.deliveryMethodSetting.updateMany({
                where: { code: "SELLER_DELIVERY" },
                data: { name: "Seller Delivery", description: "Delivered directly by seller" },
            });
            await prisma.deliveryMethodSetting.updateMany({
                where: { code: "SELF_DELIVERY" },
                data: { name: "Seller Delivery", description: "Delivered directly by seller" },
            });
        }
    } catch (error) {
        console.error("Error seeding default delivery methods:", error);
    }
};

// Helper to count active products using a delivery method
const getActiveProductCountForMethod = async (code: string): Promise<number> => {
    try {
        const upperCode = code.toUpperCase();
        if (upperCode === "PORTAL_DELIVERY") {
            return await prisma.product.count({
                where: {
                    isDeleted: false,
                    deliveryMethod: { in: ["PORTAL_DELIVERY", "BOTH"] },
                },
            });
        } else if (upperCode === "SELLER_DELIVERY" || upperCode === "SELF_DELIVERY") {
            return await prisma.product.count({
                where: {
                    isDeleted: false,
                    deliveryMethod: { in: ["SELF_DELIVERY", "BOTH"] },
                },
            });
        }
        return 0;
    } catch {
        return 0;
    }
};

export const getDeliveryMethods = async (req: Request, res: Response) => {
    try {
        await ensureDefaultDeliveryMethods();
        const methods = await prisma.deliveryMethodSetting.findMany({
            orderBy: { displayOrder: "asc" },
        });

        const methodsWithCounts = await Promise.all(
            methods.map(async (m) => {
                const activeProductCount = await getActiveProductCountForMethod(m.code);
                return {
                    ...m,
                    activeProductCount,
                };
            })
        );

        return res.status(200).json({ deliveryMethods: methodsWithCounts });
    } catch (error: any) {
        console.error("GET DELIVERY METHODS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const createDeliveryMethod = async (req: Request, res: Response) => {
    try {
        const { name, code, description, enabled, displayOrder } = req.body;

        if (!name || !code) {
            return res.status(400).json({ message: "Name and Code are required" });
        }

        const normalizedCode = code.trim().toUpperCase();

        const existing = await prisma.deliveryMethodSetting.findUnique({
            where: { code: normalizedCode },
        });

        if (existing) {
            return res.status(400).json({ message: `Delivery method with code '${normalizedCode}' already exists.` });
        }

        const newMethod = await prisma.deliveryMethodSetting.create({
            data: {
                name: name.trim(),
                code: normalizedCode,
                description: description?.trim() || null,
                enabled: enabled !== undefined ? !!enabled : true,
                displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
            },
        });

        return res.status(201).json({ message: "Delivery method created successfully", deliveryMethod: newMethod });
    } catch (error: any) {
        console.error("CREATE DELIVERY METHOD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateDeliveryMethod = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, description, enabled, displayOrder } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Delivery Method ID is required" });
        }

        const method = await prisma.deliveryMethodSetting.findUnique({ where: { id } });
        if (!method) {
            return res.status(404).json({ message: "Delivery method not found" });
        }

        const updated = await prisma.deliveryMethodSetting.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && { description: description.trim() }),
                ...(enabled !== undefined && { enabled: !!enabled }),
                ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
            },
        });

        const activeProductCount = await getActiveProductCountForMethod(updated.code);

        return res.status(200).json({
            message: "Delivery method updated successfully",
            deliveryMethod: {
                ...updated,
                activeProductCount,
            },
        });
    } catch (error: any) {
        console.error("UPDATE DELIVERY METHOD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const toggleDeliveryMethodStatus = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const allowed = req.body.allowed !== undefined ? req.body.allowed : req.body.enabled;

        console.log('[PATCH /api/admin/delivery-methods/:id] reached');
        console.log('[PATCH] req.params:', req.params);
        console.log('[PATCH] req.body:', req.body);
        console.log('[PATCH] resolved allowed:', allowed);

        if (!id) {
            return res.status(400).json({ message: "Delivery Method ID is required" });
        }

        const method = await prisma.deliveryMethodSetting.findUnique({ where: { id } });
        if (!method) {
            console.error('[PATCH] Delivery method not found in DB for id:', id);
            return res.status(404).json({ message: "Delivery method not found" });
        }

        const newEnabled = allowed !== undefined ? !!allowed : !method.enabled;
        console.log('[PATCH] updating enabled to:', newEnabled);

        const updated = await prisma.deliveryMethodSetting.update({
            where: { id },
            data: { enabled: newEnabled },
        });

        const activeProductCount = await getActiveProductCountForMethod(updated.code);
        console.log('[PATCH] Prisma updated record:', updated);

        return res.status(200).json({
            message: `Delivery method ${newEnabled ? "enabled" : "disabled"} successfully`,
            deliveryMethod: {
                ...updated,
                activeProductCount,
            },
        });
    } catch (error: any) {
        console.error("TOGGLE DELIVERY METHOD STATUS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteDeliveryMethod = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({ message: "Delivery Method ID is required" });
        }

        const method = await prisma.deliveryMethodSetting.findUnique({ where: { id } });
        if (!method) {
            return res.status(404).json({ message: "Delivery method not found" });
        }

        const isBuiltIn = ["PORTAL_DELIVERY", "SELLER_DELIVERY", "SELF_DELIVERY"].includes(method.code.toUpperCase());
        if (isBuiltIn) {
            return res.status(400).json({ message: `Built-in delivery method '${method.name}' cannot be deleted.` });
        }

        const activeProductCount = await getActiveProductCountForMethod(method.code);
        if (activeProductCount > 0) {
            return res.status(400).json({
                message: `Cannot delete delivery method '${method.name}' because it is assigned to ${activeProductCount} active product(s). Disable it instead.`,
            });
        }

        await prisma.deliveryMethodSetting.delete({ where: { id } });

        return res.status(200).json({ message: "Delivery method deleted successfully" });
    } catch (error: any) {
        console.error("DELETE DELIVERY METHOD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
