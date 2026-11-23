import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const isThirdPartyDeliveryConfigured = (): boolean => {
    return Boolean(
        process.env.THIRD_PARTY_DELIVERY_API_KEY ||
        process.env.SHIPROCKET_API_KEY ||
        process.env.PORTER_API_KEY ||
        process.env.DUNZO_API_KEY
    );
};

// Helper to seed default delivery methods (3 distinct methods)
export const ensureDefaultDeliveryMethods = async () => {
    try {
        const defaultMethods = [
            {
                code: "THIRD_PARTY_DELIVERY",
                name: "Third-Party Online Delivery",
                description: "Delivery fulfilled through an external delivery platform or delivery partner.",
                enabled: false,
                displayOrder: 1,
            },
            {
                code: "ATLASBASKET_DELIVERY",
                name: "AtlasBasket Delivery",
                description: "Deliveries fulfilled by our own AtlasBasket rider network.",
                enabled: true,
                displayOrder: 2,
            },
            {
                code: "SELLER_DELIVERY",
                name: "Seller Delivery",
                description: "The seller handles delivery independently.",
                enabled: true,
                displayOrder: 3,
            },
        ];

        for (const def of defaultMethods) {
            const existing = await prisma.deliveryMethodSetting.findUnique({
                where: { code: def.code },
            });

            if (!existing) {
                // If legacy code exists, upgrade it seamlessly
                if (def.code === "ATLASBASKET_DELIVERY") {
                    const legacyPortal = await prisma.deliveryMethodSetting.findUnique({
                        where: { code: "PORTAL_DELIVERY" },
                    });
                    if (legacyPortal) {
                        await prisma.deliveryMethodSetting.update({
                            where: { code: "PORTAL_DELIVERY" },
                            data: {
                                code: "ATLASBASKET_DELIVERY",
                                name: def.name,
                                description: def.description,
                                displayOrder: def.displayOrder,
                            },
                        });
                        continue;
                    }
                }

                if (def.code === "SELLER_DELIVERY") {
                    const legacySelf = await prisma.deliveryMethodSetting.findUnique({
                        where: { code: "SELF_DELIVERY" },
                    });
                    if (legacySelf) {
                        await prisma.deliveryMethodSetting.update({
                            where: { code: "SELF_DELIVERY" },
                            data: {
                                code: "SELLER_DELIVERY",
                                name: def.name,
                                description: def.description,
                                displayOrder: def.displayOrder,
                            },
                        });
                        continue;
                    }
                }

                await prisma.deliveryMethodSetting.create({
                    data: def,
                });
            } else {
                // Keep name and description up to date
                await prisma.deliveryMethodSetting.update({
                    where: { code: def.code },
                    data: {
                        name: def.name,
                        description: def.description,
                        displayOrder: def.displayOrder,
                    },
                });
            }
        }
    } catch (error) {
        console.error("Error seeding default delivery methods:", error);
    }
};

export const getDeliveryMethods = async (req: Request, res: Response) => {
    try {
        await ensureDefaultDeliveryMethods();
        const methods = await prisma.deliveryMethodSetting.findMany({
            orderBy: { displayOrder: "asc" },
        });

        const { DeliverySettingsService } = await import("../../delivery/services/deliverySettings.service.js");
        const coverage = await DeliverySettingsService.getOperationalDeliveryCoverage();
        const isThirdPartyConfigured = isThirdPartyDeliveryConfigured();

        const enrichedMethods = methods.map((m) => {
            const code = m.code.toUpperCase();
            if (code === "THIRD_PARTY_DELIVERY" || code === "THIRD_PARTY_ONLINE") {
                return {
                    ...m,
                    isConfigured: isThirdPartyConfigured,
                    isOperational: isThirdPartyConfigured && m.enabled,
                    statusNote: isThirdPartyConfigured
                        ? "Third-party platform integration operational."
                        : "Developer Configuration Required — Integration credentials not configured in environment.",
                    providerType: "EXTERNAL_PLATFORM",
                };
            }
            if (code === "ATLASBASKET_DELIVERY" || code === "PORTAL_DELIVERY") {
                return {
                    ...m,
                    isConfigured: true,
                    isOperational: coverage.isCoverageOperational && m.enabled,
                    statusNote: coverage.isCoverageOperational
                        ? `Operational across ${coverage.totalOperationalDistricts} district(s), ${coverage.totalOperationalTowns} town(s), and ${coverage.totalOperationalServiceAreas} service area(s).`
                        : "No operational delivery coverage active in database. Enable delivery in Districts / Cities to activate.",
                    providerType: "IN_HOUSE_FLEET",
                    coverageSummary: {
                        primaryCity: coverage.primaryActiveCity,
                        totalDistricts: coverage.totalOperationalDistricts,
                        totalTowns: coverage.totalOperationalTowns,
                        totalServiceAreas: coverage.totalOperationalServiceAreas,
                        activeLocations: coverage.activeLocations,
                    },
                };
            }
            if (code === "SELLER_DELIVERY" || code === "SELF_DELIVERY") {
                return {
                    ...m,
                    isConfigured: true,
                    isOperational: m.enabled,
                    statusNote: "Direct seller fulfillment. Orders are fulfilled independently by each seller.",
                    providerType: "SELLER_FULFILLMENT",
                };
            }
            return {
                ...m,
                isConfigured: true,
                isOperational: m.enabled,
                statusNote: m.description || "",
                providerType: "STANDARD",
            };
        });

        return res.status(200).json({ deliveryMethods: enrichedMethods });
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

        // Audit log
        const adminId = (req as any).adminId || (req as any).user?.id || "SYSTEM_ADMIN";
        try {
            await prisma.deliverySettingsAuditLog.create({
                data: {
                    adminId: String(adminId),
                    settingKey: `deliveryMethod.${method.code}`,
                    previousValue: JSON.stringify({ enabled: method.enabled, name: method.name }),
                    newValue: JSON.stringify({ enabled: updated.enabled, name: updated.name }),
                    reason: `Admin updated delivery method '${method.name}' (${method.code})`,
                },
            });
        } catch (auditErr) {
            console.error("Failed to write delivery settings audit log:", auditErr);
        }

        return res.status(200).json({
            message: "Delivery method updated successfully",
            deliveryMethod: updated,
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

        if (!id) {
            return res.status(400).json({ message: "Delivery Method ID is required" });
        }

        const method = await prisma.deliveryMethodSetting.findUnique({ where: { id } });
        if (!method) {
            console.error('[PATCH] Delivery method not found in DB for id:', id);
            return res.status(404).json({ message: "Delivery method not found" });
        }

        const newEnabled = allowed !== undefined ? !!allowed : !method.enabled;

        const updated = await prisma.deliveryMethodSetting.update({
            where: { id },
            data: { enabled: newEnabled },
        });

        // Sync legacy code aliases if present
        if (method.code === "ATLASBASKET_DELIVERY" || method.code === "PORTAL_DELIVERY") {
            await prisma.deliveryMethodSetting.updateMany({
                where: { code: { in: ["ATLASBASKET_DELIVERY", "PORTAL_DELIVERY"] } },
                data: { enabled: newEnabled },
            });
        } else if (method.code === "SELLER_DELIVERY" || method.code === "SELF_DELIVERY") {
            await prisma.deliveryMethodSetting.updateMany({
                where: { code: { in: ["SELLER_DELIVERY", "SELF_DELIVERY"] } },
                data: { enabled: newEnabled },
            });
        }

        // Write audit log
        const adminId = (req as any).adminId || (req as any).user?.id || "SYSTEM_ADMIN";
        try {
            await prisma.deliverySettingsAuditLog.create({
                data: {
                    adminId: String(adminId),
                    settingKey: `deliveryMethod.${method.code}.enabled`,
                    previousValue: String(method.enabled),
                    newValue: String(newEnabled),
                    reason: `Admin toggled delivery method '${method.name}' (${method.code}) to ${newEnabled ? "ENABLED" : "DISABLED"}`,
                },
            });
        } catch (auditErr) {
            console.error("Failed to write delivery settings audit log:", auditErr);
        }

        return res.status(200).json({
            message: `Delivery method '${method.name}' ${newEnabled ? "enabled" : "disabled"} successfully`,
            deliveryMethod: updated,
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

        const isBuiltIn = [
            "PORTAL_DELIVERY",
            "ATLASBASKET_DELIVERY",
            "SELLER_DELIVERY",
            "SELF_DELIVERY",
            "THIRD_PARTY_DELIVERY",
            "THIRD_PARTY_ONLINE",
        ].includes(method.code.toUpperCase());

        if (isBuiltIn) {
            return res.status(400).json({ message: `Built-in delivery method '${method.name}' cannot be deleted. Disable it instead.` });
        }

        const orderCount = await prisma.sellerOrder.count({
            where: { selectedDeliveryMethod: method.code },
        });

        if (orderCount > 0) {
            return res.status(400).json({
                message: `Cannot delete delivery method '${method.name}' because it has been used in ${orderCount} order(s). Disable it instead.`,
            });
        }

        await prisma.deliveryMethodSetting.delete({ where: { id } });

        return res.status(200).json({ message: "Delivery method deleted successfully" });
    } catch (error: any) {
        console.error("DELETE DELIVERY METHOD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
