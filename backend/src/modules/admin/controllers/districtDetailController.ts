import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { invalidatePublicCache } from "../../../middleware/cache.js";
import { AUTHORITATIVE_LOCATION_CATALOGUE } from "../../../services/location/locationCatalogueData.js";

// Helper to record an audit log
const logAudit = async (
    req: Request,
    entityType: "STATE" | "DISTRICT" | "CITY_TOWN" | "SERVICE_AREA",
    entityId: string,
    action: string,
    previousValues?: any,
    newValues?: any
) => {
    try {
        const adminId = (req as any).adminId;
        let adminEmail: string | undefined;
        let adminName: string | undefined;

        if (adminId) {
            const admin = await prisma.admin.findUnique({
                where: { id: adminId },
                select: { email: true, firstName: true, lastName: true }
            });
            if (admin) {
                adminEmail = admin.email;
                adminName = `${admin.firstName} ${admin.lastName || ""}`.trim();
            }
        }

        await prisma.locationAuditLog.create({
            data: {
                adminId: adminId || null,
                adminEmail: adminEmail || null,
                adminName: adminName || null,
                entityType,
                entityId,
                action,
                previousValues: previousValues ? JSON.parse(JSON.stringify(previousValues)) : null,
                newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
            }
        });
    } catch (err) {
        console.error("[LocationAuditLog] Failed to record audit log:", err);
    }
};

/**
 * Automatically ensures that all towns and service areas from the authoritative catalogue
 * exist in the database for the given district, defaulting to DISABLED.
 * Existing records and statuses are preserved.
 */
export async function ensureDistrictLocationsPopulated(districtId: string, districtName: string) {
    try {
        let catalogueItems: Array<{ cityTown: string; serviceArea: string | null; postalCode: string }> = [];
        try {
            catalogueItems = await prisma.locationCatalogue.findMany({
                where: { district: { equals: districtName, mode: "insensitive" } },
                select: { cityTown: true, serviceArea: true, postalCode: true }
            });
        } catch {
            // fallback if table query fails
        }

        if (!catalogueItems || catalogueItems.length === 0) {
            const matches = AUTHORITATIVE_LOCATION_CATALOGUE.filter(
                c => c.district.toLowerCase() === districtName.toLowerCase()
            );
            catalogueItems = matches.map(c => ({
                cityTown: c.cityTown,
                serviceArea: c.serviceArea,
                postalCode: c.postalCode
            }));

            // Also seed into locationCatalogue table if empty
            if (matches.length > 0) {
                try {
                    for (const m of matches) {
                        const exists = await prisma.locationCatalogue.findFirst({
                            where: {
                                district: m.district,
                                cityTown: m.cityTown,
                                serviceArea: m.serviceArea,
                                postalCode: m.postalCode
                            }
                        });
                        if (!exists) {
                            await prisma.locationCatalogue.create({
                                data: {
                                    state: m.state,
                                    district: m.district,
                                    cityTown: m.cityTown,
                                    serviceArea: m.serviceArea,
                                    postalCode: m.postalCode
                                }
                            });
                        }
                    }
                } catch {
                    // Ignore duplicate key or migration pending
                }
            }
        }

        if (!catalogueItems || catalogueItems.length === 0) return;

        // 1. Ensure all unique towns exist in city_towns table
        const uniqueTownNames = Array.from(new Set(catalogueItems.map(c => c.cityTown.trim()))).filter(Boolean);
        const existingTowns = await prisma.cityTown.findMany({
            where: { districtId }
        });
        const townMap = new Map<string, any>();
        for (const t of existingTowns) {
            townMap.set(t.name.toLowerCase(), t);
        }

        for (const townName of uniqueTownNames) {
            if (!townMap.has(townName.toLowerCase())) {
                try {
                    const createdTown = await prisma.cityTown.create({
                        data: {
                            districtId,
                            name: townName,
                            displayName: townName,
                            isActive: false, // Default to disabled!
                            launchStatus: "COMING_SOON"
                        }
                    });
                    townMap.set(townName.toLowerCase(), createdTown);
                } catch {
                    // Handle concurrency race
                }
            }
        }

        // 2. Ensure all service areas exist in service_areas table with parent town and postal codes
        const areaMap = new Map<string, { name: string; cityTown: string; postalCodes: Set<string> }>();
        for (const item of catalogueItems) {
            if (!item.serviceArea?.trim()) continue;
            const areaName = item.serviceArea.trim();
            const key = areaName.toLowerCase();
            const existing = areaMap.get(key);
            if (existing) {
                if (item.postalCode?.trim()) existing.postalCodes.add(item.postalCode.trim());
            } else {
                areaMap.set(key, {
                    name: areaName,
                    cityTown: item.cityTown.trim(),
                    postalCodes: new Set(item.postalCode?.trim() ? [item.postalCode.trim()] : [])
                });
            }
        }

        const existingAreas = await prisma.serviceArea.findMany({
            where: { districtId }
        });
        const existingAreaMap = new Map<string, any>();
        for (const a of existingAreas) {
            existingAreaMap.set(a.name.toLowerCase(), a);
        }

        for (const [key, areaData] of areaMap.entries()) {
            const parentTown = townMap.get(areaData.cityTown.toLowerCase());
            const cityTownId = parentTown ? parentTown.id : null;
            const postalCodesArray = Array.from(areaData.postalCodes);

            if (!existingAreaMap.has(key)) {
                try {
                    await prisma.serviceArea.create({
                        data: {
                            districtId,
                            cityTownId,
                            name: areaData.name,
                            postalCodes: postalCodesArray,
                            isActive: false, // Default to disabled!
                            deliveryEligible: false
                        }
                    });
                } catch {
                    // Handle concurrency race
                }
            } else {
                const existing = existingAreaMap.get(key);
                const updates: any = {};
                if (!existing.cityTownId && cityTownId) {
                    updates.cityTownId = cityTownId;
                }
                const currentPins = new Set(existing.postalCodes || []);
                let hasNewPins = false;
                for (const pin of postalCodesArray) {
                    if (!currentPins.has(pin)) {
                        currentPins.add(pin);
                        hasNewPins = true;
                    }
                }
                if (hasNewPins) {
                    updates.postalCodes = Array.from(currentPins);
                }
                if (Object.keys(updates).length > 0) {
                    await prisma.serviceArea.update({
                        where: { id: existing.id },
                        data: updates
                    });
                }
            }
        }
    } catch (err) {
        console.error(`[ensureDistrictLocationsPopulated] Error populating locations for district ${districtName}:`, err);
    }
}

/**
 * GET /api/admin/cities/:id/details
 * Fetch full district details, overview stats, child cities/towns, service areas, and requests
 */
export const getDistrictDetails = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        if (!id) return res.status(400).json({ message: "District ID is required" });

        const districtBasic = await prisma.city.findUnique({
            where: { id },
            select: { id: true, name: true }
        });

        if (!districtBasic) {
            return res.status(404).json({ message: "District not found" });
        }

        // Auto-populate towns and service areas from database catalogue if needed
        await ensureDistrictLocationsPopulated(districtBasic.id, districtBasic.name);

        const district = await prisma.city.findUnique({
            where: { id },
            include: {
                cityTowns: { orderBy: { name: "asc" } },
                serviceAreas: {
                    include: { cityTown: { select: { id: true, name: true, displayName: true, isActive: true } } },
                    orderBy: { name: "asc" }
                }
            }
        });

        if (!district) {
            return res.status(404).json({ message: "District not found" });
        }

        // Fetch parent state status
        const stateRecord = await prisma.state.findFirst({
            where: { name: { equals: district.state, mode: "insensitive" } }
        });
        const isParentStateActive = stateRecord ? stateRecord.isActive : true;

        // Fetch counts for overview
        const [
            customerCount,
            sellerCount,
            activeShopsCount,
            ordersCount,
            requestsCount
        ] = await Promise.all([
            prisma.customerAddress.count({
                where: {
                    OR: [
                        { district: { equals: district.name, mode: "insensitive" } },
                        { city: { equals: district.name, mode: "insensitive" } }
                    ]
                }
            }),
            prisma.sellerAddress.count({
                where: {
                    OR: [
                        { district: { equals: district.name, mode: "insensitive" } },
                        { city: { equals: district.name, mode: "insensitive" } }
                    ]
                }
            }),
            prisma.shop.count({
                where: {
                    status: "APPROVED",
                    defaultPickupAddress: {
                        OR: [
                            { district: { equals: district.name, mode: "insensitive" } },
                            { city: { equals: district.name, mode: "insensitive" } }
                        ]
                    }
                }
            }),
            prisma.order.count({
                where: {
                    shippingAddress: {
                        OR: [
                            { district: { equals: district.name, mode: "insensitive" } },
                            { city: { equals: district.name, mode: "insensitive" } }
                        ]
                    }
                }
            }).catch(() => 0),
            prisma.locationRequest.count({
                where: {
                    state: { equals: district.state, mode: "insensitive" },
                    district: { equals: district.name, mode: "insensitive" }
                }
            })
        ]);

        return res.status(200).json({
            district,
            parentState: stateRecord,
            isParentStateActive,
            overview: {
                districtName: district.displayName || district.name,
                canonicalName: district.name,
                state: district.state,
                isActive: district.isActive,
                isParentStateActive,
                effectiveStatus: (!isParentStateActive)
                    ? "DISABLED_BY_STATE"
                    : (!district.isActive)
                        ? "DISABLED_BY_DISTRICT"
                        : district.maintenanceMode
                            ? "MAINTENANCE"
                            : district.launchStatus,
                townsCount: district.cityTowns.length,
                activeTownsCount: district.cityTowns.filter(t => t.isActive).length,
                serviceAreasCount: district.serviceAreas.length,
                activeServiceAreasCount: district.serviceAreas.filter(a => a.isActive).length,
                customerCount,
                sellerCount,
                activeShopsCount,
                ordersCount,
                requestsCount
            }
        });
    } catch (error: any) {
        console.error("GET DISTRICT DETAILS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * PUT /api/admin/cities/:id/general-settings
 */
export const updateDistrictGeneralSettings = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const {
            displayName,
            description,
            launchStatus,
            displayOrder,
            maintenanceMode,
            isActive,
            isCustomerEnabled,
            isSellerEnabled
        } = req.body;

        const existing = await prisma.city.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "District not found" });

        const updated = await prisma.$transaction(async (tx) => {
            const city = await tx.city.update({
                where: { id },
                data: {
                    displayName: displayName !== undefined ? displayName?.trim() || null : existing.displayName,
                    description: description !== undefined ? description?.trim() || null : existing.description,
                    launchStatus: launchStatus || existing.launchStatus,
                    displayOrder: displayOrder !== undefined ? Number(displayOrder) : existing.displayOrder,
                    maintenanceMode: maintenanceMode !== undefined ? Boolean(maintenanceMode) : existing.maintenanceMode,
                    isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
                    isCustomerEnabled: isCustomerEnabled !== undefined ? Boolean(isCustomerEnabled) : existing.isCustomerEnabled,
                    isSellerEnabled: isSellerEnabled !== undefined ? Boolean(isSellerEnabled) : existing.isSellerEnabled,
                }
            });

            if (isActive !== undefined) {
                await tx.serviceArea.updateMany({
                    where: { districtId: id },
                    data: {
                        isActive: Boolean(isActive),
                        deliveryEligible: Boolean(isActive)
                    }
                });
                await tx.cityTown.updateMany({
                    where: { districtId: id },
                    data: { isActive: Boolean(isActive) }
                });
            }

            return city;
        });

        await logAudit(req, "DISTRICT", id, "UPDATE_GENERAL_SETTINGS", existing, updated);
        invalidatePublicCache();

        return res.status(200).json({ message: "District general settings updated", district: updated });
    } catch (error: any) {
        console.error("UPDATE DISTRICT GENERAL SETTINGS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * PUT /api/admin/cities/:id/master-toggle
 * Universal district master availability control
 * Enables or disables district and all child service areas transactionally
 */
export const toggleDistrictMaster = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { isActive } = req.body;

        if (isActive === undefined) {
            return res.status(400).json({ message: "isActive status boolean is required" });
        }

        const targetActive = Boolean(isActive);

        const existing = await prisma.city.findUnique({
            where: { id },
            select: { id: true, name: true, displayName: true, isActive: true }
        });
        if (!existing) return res.status(404).json({ message: "District not found" });

        // Update district and all child service areas in a single database transaction
        const updated = await prisma.$transaction(async (tx) => {
            const city = await tx.city.update({
                where: { id },
                data: { isActive: targetActive }
            });

            await tx.serviceArea.updateMany({
                where: { districtId: id },
                data: {
                    isActive: targetActive,
                    deliveryEligible: targetActive
                }
            });

            await tx.cityTown.updateMany({
                where: { districtId: id },
                data: { isActive: targetActive }
            });

            return city;
        });

        const districtName = existing.displayName || existing.name;
        const actionMessage = `All service areas in ${districtName} have been ${targetActive ? "enabled" : "disabled"}.`;

        await logAudit(req, "DISTRICT", id, "MASTER_TOGGLE", existing, updated);
        invalidatePublicCache();

        return res.status(200).json({
            message: actionMessage,
            district: updated
        });
    } catch (error: any) {
        console.error("TOGGLE DISTRICT MASTER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * PUT /api/admin/cities/:id/customer-settings
 */
export const updateDistrictCustomerSettings = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const {
            isCustomerEnabled,
            allowCustomerBrowsing,
            allowCustomerOrdering,
            customerNoticeMessage
        } = req.body;

        const existing = await prisma.city.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "District not found" });

        const updated = await prisma.city.update({
            where: { id },
            data: {
                isCustomerEnabled: isCustomerEnabled !== undefined ? Boolean(isCustomerEnabled) : existing.isCustomerEnabled,
                allowCustomerBrowsing: allowCustomerBrowsing !== undefined ? Boolean(allowCustomerBrowsing) : existing.allowCustomerBrowsing,
                allowCustomerOrdering: allowCustomerOrdering !== undefined ? Boolean(allowCustomerOrdering) : existing.allowCustomerOrdering,
                customerNoticeMessage: customerNoticeMessage !== undefined ? customerNoticeMessage?.trim() || null : existing.customerNoticeMessage,
            }
        });

        await logAudit(req, "DISTRICT", id, "UPDATE_CUSTOMER_SETTINGS", existing, updated);
        invalidatePublicCache();

        return res.status(200).json({ message: "Customer availability settings updated", district: updated });
    } catch (error: any) {
        console.error("UPDATE DISTRICT CUSTOMER SETTINGS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * PUT /api/admin/cities/:id/seller-settings
 */
export const updateDistrictSellerSettings = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const {
            isSellerEnabled,
            allowSellerRegistration,
            allowShopCreation,
            sellerNoticeMessage
        } = req.body;

        const existing = await prisma.city.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "District not found" });

        const updated = await prisma.city.update({
            where: { id },
            data: {
                isSellerEnabled: isSellerEnabled !== undefined ? Boolean(isSellerEnabled) : existing.isSellerEnabled,
                allowSellerRegistration: allowSellerRegistration !== undefined ? Boolean(allowSellerRegistration) : existing.allowSellerRegistration,
                allowShopCreation: allowShopCreation !== undefined ? Boolean(allowShopCreation) : existing.allowShopCreation,
                sellerNoticeMessage: sellerNoticeMessage !== undefined ? sellerNoticeMessage?.trim() || null : existing.sellerNoticeMessage,
            }
        });

        await logAudit(req, "DISTRICT", id, "UPDATE_SELLER_SETTINGS", existing, updated);
        invalidatePublicCache();

        return res.status(200).json({ message: "Seller availability settings updated", district: updated });
    } catch (error: any) {
        console.error("UPDATE DISTRICT SELLER SETTINGS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * PUT /api/admin/cities/:id/delivery-settings
 */
export const updateDistrictDeliverySettings = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { isDeliveryEnabled } = req.body;

        const existing = await prisma.city.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "District not found" });

        const updated = await prisma.city.update({
            where: { id },
            data: {
                isDeliveryEnabled: isDeliveryEnabled !== undefined ? Boolean(isDeliveryEnabled) : existing.isDeliveryEnabled
            }
        });

        await logAudit(req, "DISTRICT", id, "UPDATE_DELIVERY_SETTINGS", existing, updated);
        invalidatePublicCache();

        return res.status(200).json({ message: "Delivery settings updated", district: updated });
    } catch (error: any) {
        console.error("UPDATE DISTRICT DELIVERY SETTINGS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * PUT /api/admin/cities/:id/launch-config
 */
export const updateDistrictLaunchConfig = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const {
            comingSoonMessage,
            launchAnnouncement,
            expectedLaunchDate,
            bannerUrl,
            displayOrder
        } = req.body;

        const existing = await prisma.city.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "District not found" });

        const updated = await prisma.city.update({
            where: { id },
            data: {
                comingSoonMessage: comingSoonMessage !== undefined ? comingSoonMessage?.trim() || null : existing.comingSoonMessage,
                launchAnnouncement: launchAnnouncement !== undefined ? launchAnnouncement?.trim() || null : existing.launchAnnouncement,
                expectedLaunchDate: expectedLaunchDate ? new Date(expectedLaunchDate) : null,
                bannerUrl: bannerUrl !== undefined ? bannerUrl?.trim() || null : existing.bannerUrl,
                displayOrder: displayOrder !== undefined ? Number(displayOrder) : existing.displayOrder,
            }
        });

        await logAudit(req, "DISTRICT", id, "UPDATE_LAUNCH_CONFIG", existing, updated);
        invalidatePublicCache();

        return res.status(200).json({ message: "Launch configuration updated", district: updated });
    } catch (error: any) {
        console.error("UPDATE DISTRICT LAUNCH CONFIG ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Child Cities / Towns ───────────────────────────────────────────────────

export const listCityTowns = async (req: Request, res: Response) => {
    try {
        const districtId = req.params.id as string;
        const district = await prisma.city.findUnique({
            where: { id: districtId },
            select: { id: true, name: true }
        });
        if (district) {
            await ensureDistrictLocationsPopulated(district.id, district.name);
        }
        const towns = await prisma.cityTown.findMany({
            where: { districtId },
            include: { serviceAreas: { select: { id: true, name: true, isActive: true } } },
            orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
        });
        return res.status(200).json({ towns });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const createCityTown = async (req: Request, res: Response) => {
    try {
        const districtId = req.params.id as string;
        const { name, displayName, isActive, launchStatus, info, displayOrder } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ message: "Town / City name is required" });
        }

        const normalizedName = name.trim();
        const existing = await prisma.cityTown.findFirst({
            where: { districtId, name: { equals: normalizedName, mode: "insensitive" } }
        });

        if (existing) {
            return res.status(400).json({ message: "A town with this name already exists in this district" });
        }

        const town = await prisma.cityTown.create({
            data: {
                districtId,
                name: normalizedName,
                displayName: displayName?.trim() || null,
                isActive: isActive !== undefined ? Boolean(isActive) : false,
                launchStatus: launchStatus || "COMING_SOON",
                info: info?.trim() || null,
                displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
            }
        });

        await logAudit(req, "CITY_TOWN", town.id, "CREATE_CITY_TOWN", null, town);
        invalidatePublicCache();

        return res.status(201).json({ message: "Town created successfully", town });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateCityTown = async (req: Request, res: Response) => {
    try {
        const { id, townId } = req.params as { id: string; townId: string };
        const { name, displayName, isActive, launchStatus, info, displayOrder } = req.body;

        const existing = await prisma.cityTown.findUnique({ where: { id: townId } });
        if (!existing || existing.districtId !== id) {
            return res.status(404).json({ message: "Town not found in this district" });
        }

        const data: any = {};
        if (name?.trim()) data.name = name.trim();
        if (displayName !== undefined) data.displayName = displayName?.trim() || null;
        if (isActive !== undefined) data.isActive = Boolean(isActive);
        if (launchStatus) data.launchStatus = launchStatus;
        if (info !== undefined) data.info = info?.trim() || null;
        if (displayOrder !== undefined) data.displayOrder = Number(displayOrder);

        const updated = await prisma.cityTown.update({
            where: { id: townId },
            data
        });

        await logAudit(req, "CITY_TOWN", townId, "UPDATE_CITY_TOWN", existing, updated);
        invalidatePublicCache();

        return res.status(200).json({ message: "Town updated successfully", town: updated });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteCityTown = async (req: Request, res: Response) => {
    try {
        const { id, townId } = req.params as { id: string; townId: string };
        const existing = await prisma.cityTown.findUnique({ where: { id: townId } });
        if (!existing || existing.districtId !== id) {
            return res.status(404).json({ message: "Town not found" });
        }

        await prisma.cityTown.delete({ where: { id: townId } });
        await logAudit(req, "CITY_TOWN", townId, "DELETE_CITY_TOWN", existing, null);
        invalidatePublicCache();

        return res.status(200).json({ message: "Town deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Service Areas ──────────────────────────────────────────────────────────

export const listServiceAreas = async (req: Request, res: Response) => {
    try {
        const districtId = req.params.id as string;
        const district = await prisma.city.findUnique({
            where: { id: districtId },
            select: { id: true, name: true }
        });
        if (district) {
            await ensureDistrictLocationsPopulated(district.id, district.name);
        }
        const serviceAreas = await prisma.serviceArea.findMany({
            where: { districtId },
            include: { cityTown: { select: { id: true, name: true, displayName: true, isActive: true } } },
            orderBy: { name: "asc" }
        });
        return res.status(200).json({ serviceAreas });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const createServiceArea = async (req: Request, res: Response) => {
    try {
        const districtId = req.params.id as string;
        const { name, cityTownId, postalCodes, boundaries, isActive, deliveryEligible } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ message: "Service area name is required" });
        }

        const normalizedName = name.trim();
        const existing = await prisma.serviceArea.findFirst({
            where: { districtId, name: { equals: normalizedName, mode: "insensitive" } }
        });

        if (existing) {
            return res.status(400).json({ message: "A service area with this name already exists in this district" });
        }

        const normalizedPostalCodes: string[] = Array.isArray(postalCodes)
            ? postalCodes.map((p: any) => String(p).trim()).filter(Boolean)
            : typeof postalCodes === "string"
                ? postalCodes.split(",").map(p => p.trim()).filter(Boolean)
                : [];

        const area = await prisma.serviceArea.create({
            data: {
                districtId,
                cityTownId: cityTownId || null,
                name: normalizedName,
                postalCodes: normalizedPostalCodes,
                boundaries: boundaries || null,
                isActive: isActive !== undefined ? Boolean(isActive) : false,
                deliveryEligible: deliveryEligible !== undefined ? Boolean(deliveryEligible) : false,
            }
        });

        await logAudit(req, "SERVICE_AREA", area.id, "CREATE_SERVICE_AREA", null, area);
        invalidatePublicCache();

        return res.status(201).json({ message: "Service area created successfully", serviceArea: area });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateServiceArea = async (req: Request, res: Response) => {
    try {
        const { id, areaId } = req.params as { id: string; areaId: string };
        const { name, cityTownId, postalCodes, boundaries, isActive, deliveryEligible } = req.body;

        const existing = await prisma.serviceArea.findUnique({ where: { id: areaId } });
        if (!existing || existing.districtId !== id) {
            return res.status(404).json({ message: "Service area not found in this district" });
        }

        const data: any = {};
        if (name?.trim()) data.name = name.trim();
        if (cityTownId !== undefined) data.cityTownId = cityTownId || null;
        if (postalCodes !== undefined) {
            data.postalCodes = Array.isArray(postalCodes)
                ? postalCodes.map((p: any) => String(p).trim()).filter(Boolean)
                : typeof postalCodes === "string"
                    ? postalCodes.split(",").map(p => p.trim()).filter(Boolean)
                    : [];
        }
        if (boundaries !== undefined) data.boundaries = boundaries;
        if (isActive !== undefined) data.isActive = Boolean(isActive);
        if (deliveryEligible !== undefined) data.deliveryEligible = Boolean(deliveryEligible);

        const updated = await prisma.serviceArea.update({
            where: { id: areaId },
            data
        });

        await logAudit(req, "SERVICE_AREA", areaId, "UPDATE_SERVICE_AREA", existing, updated);
        invalidatePublicCache();

        return res.status(200).json({ message: "Service area updated successfully", serviceArea: updated });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteServiceArea = async (req: Request, res: Response) => {
    try {
        const { id, areaId } = req.params as { id: string; areaId: string };
        const existing = await prisma.serviceArea.findUnique({ where: { id: areaId } });
        if (!existing || existing.districtId !== id) {
            return res.status(404).json({ message: "Service area not found" });
        }

        await prisma.serviceArea.delete({ where: { id: areaId } });
        await logAudit(req, "SERVICE_AREA", areaId, "DELETE_SERVICE_AREA", existing, null);
        invalidatePublicCache();

        return res.status(200).json({ message: "Service area deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── District Requests & Audit History ──────────────────────────────────────

export const getDistrictRequests = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const district = await prisma.city.findUnique({ where: { id } });
        if (!district) return res.status(404).json({ message: "District not found" });

        const requests = await prisma.locationRequest.findMany({
            where: {
                state: { equals: district.state, mode: "insensitive" },
                district: { equals: district.name, mode: "insensitive" }
            },
            include: {
                customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                seller: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
            },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
        });

        return res.status(200).json({ requests });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getDistrictAuditLogs = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const logs = await prisma.locationAuditLog.findMany({
            where: {
                OR: [
                    { entityId: id },
                    { entityType: "DISTRICT", entityId: id }
                ]
            },
            orderBy: { createdAt: "desc" },
            take: 100
        });

        return res.status(200).json({ logs });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * GET /api/admin/cities/:id/catalogue-towns
 * Returns available authoritative cities/towns from LocationCatalogue for this district.
 */
export const getCatalogueTowns = async (req: Request, res: Response) => {
    try {
        const districtId = req.params.id as string;
        const district = await prisma.city.findUnique({
            where: { id: districtId },
            include: { cityTowns: { select: { name: true } } }
        });

        if (!district) {
            return res.status(404).json({ message: "District not found" });
        }

        const existingTownNames = new Set(district.cityTowns.map(t => t.name.toLowerCase()));

        // Query database catalogue first
        let catalogueItems: Array<{ cityTown: string }> = [];
        try {
            catalogueItems = await prisma.locationCatalogue.findMany({
                where: {
                    district: { equals: district.name, mode: "insensitive" }
                },
                select: { cityTown: true },
                distinct: ["cityTown"],
                orderBy: { cityTown: "asc" }
            });
        } catch {
            // fallback if table not yet migrated
        }

        // If DB table is empty or unpopulated, use AUTHORITATIVE_LOCATION_CATALOGUE fallback
        let towns: string[] = [];
        if (catalogueItems && catalogueItems.length > 0) {
            towns = Array.from(new Set(catalogueItems.map(c => c.cityTown))).sort();
        } else {
            const matches = AUTHORITATIVE_LOCATION_CATALOGUE.filter(
                c => c.district.toLowerCase() === district.name.toLowerCase()
            );
            towns = Array.from(new Set(matches.map(m => m.cityTown))).sort();
        }

        const result = towns.map(townName => ({
            name: townName,
            displayName: townName,
            isAlreadyAdded: existingTownNames.has(townName.toLowerCase())
        }));

        return res.status(200).json({ towns: result });
    } catch (error: any) {
        console.error("GET CATALOGUE TOWNS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * GET /api/admin/cities/:id/catalogue-areas?townId=...&townName=...
 * Returns available authoritative service areas & PIN codes from LocationCatalogue for this district/town.
 */
export const getCatalogueAreas = async (req: Request, res: Response) => {
    try {
        const districtId = req.params.id as string;
        const { townId, townName } = req.query as { townId?: string; townName?: string };

        const district = await prisma.city.findUnique({
            where: { id: districtId },
            include: {
                cityTowns: { select: { id: true, name: true } },
                serviceAreas: { select: { name: true } }
            }
        });

        if (!district) {
            return res.status(404).json({ message: "District not found" });
        }

        let targetTownName = townName?.trim();
        if (townId && !targetTownName) {
            const matchedTown = district.cityTowns.find(t => t.id === townId);
            if (matchedTown) targetTownName = matchedTown.name;
        }

        const existingAreaNames = new Set(district.serviceAreas.map(a => a.name.toLowerCase()));

        // Query database catalogue first
        let catalogueItems: Array<{ serviceArea: string | null; postalCode: string; cityTown: string }> = [];
        try {
            const whereClause: any = {
                district: { equals: district.name, mode: "insensitive" }
            };
            if (targetTownName) {
                whereClause.cityTown = { equals: targetTownName, mode: "insensitive" };
            }
            catalogueItems = await prisma.locationCatalogue.findMany({
                where: whereClause,
                select: { serviceArea: true, postalCode: true, cityTown: true },
                orderBy: { serviceArea: "asc" }
            });
        } catch {
            // fallback if table not yet migrated
        }

        const areaMap = new Map<string, { serviceArea: string; postalCodes: Set<string>; cityTown: string }>();

        if (catalogueItems && catalogueItems.length > 0) {
            for (const item of catalogueItems) {
                if (!item.serviceArea) continue;
                const existing = areaMap.get(item.serviceArea.toLowerCase());
                if (existing) {
                    existing.postalCodes.add(item.postalCode);
                } else {
                    areaMap.set(item.serviceArea.toLowerCase(), {
                        serviceArea: item.serviceArea,
                        postalCodes: new Set([item.postalCode]),
                        cityTown: item.cityTown
                    });
                }
            }
        } else {
            const matches = AUTHORITATIVE_LOCATION_CATALOGUE.filter(c => {
                const districtMatch = c.district.toLowerCase() === district.name.toLowerCase();
                if (!districtMatch) return false;
                if (targetTownName) {
                    return c.cityTown.toLowerCase() === targetTownName.toLowerCase();
                }
                return true;
            });

            for (const item of matches) {
                if (!item.serviceArea) continue;
                const existing = areaMap.get(item.serviceArea.toLowerCase());
                if (existing) {
                    existing.postalCodes.add(item.postalCode);
                } else {
                    areaMap.set(item.serviceArea.toLowerCase(), {
                        serviceArea: item.serviceArea,
                        postalCodes: new Set([item.postalCode]),
                        cityTown: item.cityTown
                    });
                }
            }
        }

        const result = Array.from(areaMap.values()).map(entry => ({
            name: entry.serviceArea,
            cityTown: entry.cityTown,
            postalCodes: Array.from(entry.postalCodes),
            isAlreadyAdded: existingAreaNames.has(entry.serviceArea.toLowerCase())
        }));

        return res.status(200).json({ areas: result });
    } catch (error: any) {
        console.error("GET CATALOGUE AREAS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
