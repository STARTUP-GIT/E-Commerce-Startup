import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

// Validation helper for coordinate boundaries
export const validateCoordinatePair = (latitude: any, longitude: any): { valid: boolean; message?: string; lat: number | null; lng: number | null } => {
    const latProvided = latitude !== undefined && latitude !== null && String(latitude).trim() !== '';
    const lngProvided = longitude !== undefined && longitude !== null && String(longitude).trim() !== '';

    if (!latProvided && !lngProvided) {
        return { valid: true, lat: null, lng: null };
    }

    if (!latProvided || !lngProvided) {
        return { valid: false, message: "Both latitude and longitude must be provided together, or both must be empty.", lat: null, lng: null };
    }

    const nLat = Number(latitude);
    const nLng = Number(longitude);

    if (isNaN(nLat) || isNaN(nLng)) {
        return { valid: false, message: "Latitude and longitude must be valid numeric values.", lat: null, lng: null };
    }

    if (nLat < -90 || nLat > 90) {
        return { valid: false, message: "Latitude must be between -90 and 90.", lat: null, lng: null };
    }

    if (nLng < -180 || nLng > 180) {
        return { valid: false, message: "Longitude must be between -180 and 180.", lat: null, lng: null };
    }

    return { valid: true, lat: nLat, lng: nLng };
};

/**
 * GET /customer/addresses
 * Returns all saved addresses for the authenticated customer
 */
export const getAddresses = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const addresses = await prisma.customerAddress.findMany({
            where: {
                customerId,
                OR: [
                    { label: null },
                    { label: { not: "ARCHIVED_HISTORICAL_ORDER" } }
                ]
            },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
        });

        return res.status(200).json({
            addresses: addresses.map(addr => ({
                id: addr.id,
                customerId: addr.customerId,
                fullName: addr.fullName,
                phone: addr.phone,
                type: addr.type,
                label: addr.label,
                addressLine1: addr.addressLine1,
                addressLine2: addr.addressLine2,
                city: addr.city,
                district: addr.district || addr.city,
                state: addr.state,
                postalCode: addr.postalCode,
                country: addr.country,
                latitude: addr.latitude ? Number(addr.latitude) : null,
                longitude: addr.longitude ? Number(addr.longitude) : null,
                formattedAddress: addr.formattedAddress,
                placeId: addr.placeId,
                isDefault: addr.isDefault,
                createdAt: addr.createdAt,
                updatedAt: addr.updatedAt
            }))
        });
    } catch (error: any) {
        console.error("GET CUSTOMER ADDRESSES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * GET /customer/addresses/:id
 * Retrieve a specific address
 */
export const getAddressById = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const id = req.params.id as string;

        if (!customerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const address = await prisma.customerAddress.findUnique({
            where: { id }
        });

        if (!address || address.label === "ARCHIVED_HISTORICAL_ORDER") {
            return res.status(404).json({ message: "Address not found" });
        }

        if (address.customerId !== customerId) {
            return res.status(403).json({ message: "Unauthorized to access this address" });
        }

        return res.status(200).json({
            address: {
                ...address,
                district: address.district || address.city,
                latitude: address.latitude ? Number(address.latitude) : null,
                longitude: address.longitude ? Number(address.longitude) : null,
            }
        });
    } catch (error: any) {
        console.error("GET ADDRESS BY ID ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * POST /customer/addresses
 * Add a new delivery address
 */
export const createAddress = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const {
            fullName,
            phone,
            type,
            label,
            addressLine1,
            addressLine2,
            city,
            district,
            state,
            postalCode,
            country = "India",
            latitude,
            longitude,
            formattedAddress,
            placeId,
            isDefault = false
        } = req.body;

        if (!fullName?.trim()) {
            return res.status(400).json({ message: "Full Name is required" });
        }
        if (!phone?.trim()) {
            return res.status(400).json({ message: "Phone number is required" });
        }
        if (!addressLine1?.trim()) {
            return res.status(400).json({ message: "Address Line 1 is required" });
        }
        if (!state?.trim()) {
            return res.status(400).json({ message: "State is required" });
        }
        if (!postalCode?.trim()) {
            return res.status(400).json({ message: "Postal Code is required" });
        }

        const resolvedCity = (city || district || "").trim();
        const resolvedDistrict = (district || city || "").trim();

        // Validate coordinate bounds if supplied
        const coordValidation = validateCoordinatePair(latitude, longitude);
        if (!coordValidation.valid) {
            return res.status(400).json({ message: coordValidation.message });
        }
        const validLat = coordValidation.lat;
        const validLng = coordValidation.lng;

        const existingCount = await prisma.customerAddress.count({ where: { customerId } });
        const shouldBeDefault = Boolean(isDefault) || existingCount === 0;

        const newAddress = await prisma.$transaction(async (tx) => {
            if (shouldBeDefault) {
                await tx.customerAddress.updateMany({
                    where: { customerId },
                    data: { isDefault: false }
                });
            }

            return tx.customerAddress.create({
                data: {
                    customerId,
                    fullName: fullName.trim(),
                    phone: phone.trim(),
                    type: type || "HOME",
                    label: label?.trim() || null,
                    addressLine1: addressLine1.trim(),
                    addressLine2: addressLine2?.trim() || null,
                    city: resolvedCity,
                    district: resolvedDistrict,
                    state: state.trim(),
                    postalCode: postalCode.trim(),
                    country: country?.trim() || "India",
                    latitude: validLat,
                    longitude: validLng,
                    formattedAddress: formattedAddress?.trim() || null,
                    placeId: placeId?.trim() || null,
                    isDefault: shouldBeDefault
                }
            });
        });

        return res.status(201).json({
            success: true,
            message: "Address added successfully",
            address: {
                ...newAddress,
                latitude: newAddress.latitude ? Number(newAddress.latitude) : null,
                longitude: newAddress.longitude ? Number(newAddress.longitude) : null,
            }
        });
    } catch (error: any) {
        console.error("CREATE CUSTOMER ADDRESS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * PUT /customer/addresses/:id
 * Update an existing delivery address (retains the existing ID)
 */
export const updateAddress = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const id = req.params.id as string;

        if (!customerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const existingAddress = await prisma.customerAddress.findUnique({
            where: { id }
        });

        if (!existingAddress) {
            return res.status(404).json({ message: "Address not found" });
        }

        // Strict customer ownership enforcement
        if (existingAddress.customerId !== customerId) {
            return res.status(403).json({ message: "Unauthorized to modify this address" });
        }

        const {
            fullName,
            phone,
            type,
            label,
            addressLine1,
            addressLine2,
            city,
            district,
            state,
            postalCode,
            country,
            latitude,
            longitude,
            formattedAddress,
            placeId,
            isDefault
        } = req.body;

        // Coordinate processing: do not silently erase existing coordinates if incoming is undefined
        let updatedLat = existingAddress.latitude !== null && existingAddress.latitude !== undefined
            ? Number(existingAddress.latitude)
            : null;
        let updatedLng = existingAddress.longitude !== null && existingAddress.longitude !== undefined
            ? Number(existingAddress.longitude)
            : null;

        if (latitude !== undefined || longitude !== undefined) {
            const coordValidation = validateCoordinatePair(latitude, longitude);
            if (!coordValidation.valid) {
                return res.status(400).json({ message: coordValidation.message });
            }
            updatedLat = coordValidation.lat;
            updatedLng = coordValidation.lng;
        }

        // Check if this address is attached to completed historical orders
        const completedHistoricalOrders = await prisma.order.findMany({
            where: {
                OR: [
                    { shippingAddressId: id },
                    { billingAddressId: id }
                ],
                status: { in: ["DELIVERED", "CANCELLED", "REFUNDED"] }
            },
            select: { id: true, shippingAddressId: true, billingAddressId: true }
        });

        const updatedAddress = await prisma.$transaction(async (tx) => {
            // If historical completed orders reference this address, snapshot the old address for them
            if (completedHistoricalOrders.length > 0) {
                const historicalCopy = await tx.customerAddress.create({
                    data: {
                        customerId,
                        fullName: existingAddress.fullName,
                        phone: existingAddress.phone,
                        type: existingAddress.type,
                        label: "ARCHIVED_HISTORICAL_ORDER",
                        addressLine1: existingAddress.addressLine1,
                        addressLine2: existingAddress.addressLine2,
                        city: existingAddress.city,
                        district: existingAddress.district,
                        state: existingAddress.state,
                        postalCode: existingAddress.postalCode,
                        country: existingAddress.country,
                        latitude: existingAddress.latitude,
                        longitude: existingAddress.longitude,
                        formattedAddress: existingAddress.formattedAddress,
                        placeId: existingAddress.placeId,
                        isDefault: false
                    }
                });

                const shippingOrderIds = completedHistoricalOrders.filter(o => o.shippingAddressId === id).map(o => o.id);
                const billingOrderIds = completedHistoricalOrders.filter(o => o.billingAddressId === id).map(o => o.id);

                if (shippingOrderIds.length > 0) {
                    await tx.order.updateMany({
                        where: { id: { in: shippingOrderIds } },
                        data: { shippingAddressId: historicalCopy.id }
                    });
                }
                if (billingOrderIds.length > 0) {
                    await tx.order.updateMany({
                        where: { id: { in: billingOrderIds } },
                        data: { billingAddressId: historicalCopy.id }
                    });
                }
            }

            if (isDefault) {
                await tx.customerAddress.updateMany({
                    where: { customerId, NOT: { id } },
                    data: { isDefault: false }
                });
            }

            return tx.customerAddress.update({
                where: { id },
                data: {
                    fullName: fullName?.trim() ?? existingAddress.fullName,
                    phone: phone?.trim() ?? existingAddress.phone,
                    type: type ?? existingAddress.type,
                    label: label !== undefined ? (label?.trim() || null) : existingAddress.label,
                    addressLine1: addressLine1?.trim() ?? existingAddress.addressLine1,
                    addressLine2: addressLine2 !== undefined ? (addressLine2?.trim() || null) : existingAddress.addressLine2,
                    city: city?.trim() ?? existingAddress.city,
                    district: district?.trim() ?? (city?.trim() ?? existingAddress.district),
                    state: state?.trim() ?? existingAddress.state,
                    postalCode: postalCode?.trim() ?? existingAddress.postalCode,
                    country: country?.trim() ?? existingAddress.country,
                    latitude: updatedLat,
                    longitude: updatedLng,
                    formattedAddress: formattedAddress !== undefined ? (formattedAddress?.trim() || null) : existingAddress.formattedAddress,
                    placeId: placeId !== undefined ? (placeId?.trim() || null) : existingAddress.placeId,
                    isDefault: isDefault !== undefined ? Boolean(isDefault) : existingAddress.isDefault
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: "Address updated successfully",
            address: {
                ...updatedAddress,
                latitude: updatedAddress.latitude ? Number(updatedAddress.latitude) : null,
                longitude: updatedAddress.longitude ? Number(updatedAddress.longitude) : null,
            }
        });
    } catch (error: any) {
        console.error("UPDATE CUSTOMER ADDRESS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * DELETE /customer/addresses/:id
 * Delete a customer address
 */
export const deleteAddress = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const id = req.params.id as string;

        if (!customerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const address = await prisma.customerAddress.findUnique({
            where: { id }
        });

        if (!address) {
            return res.status(404).json({ message: "Address not found" });
        }

        if (address.customerId !== customerId) {
            return res.status(403).json({ message: "Unauthorized to delete this address" });
        }

        // Check if address is attached to historical orders
        const ordersCount = await prisma.order.count({
            where: {
                OR: [
                    { shippingAddressId: id },
                    { billingAddressId: id }
                ]
            }
        });

        if (ordersCount > 0) {
            return res.status(400).json({
                message: "Cannot delete this address because it is associated with completed orders. You can add a new address or edit existing details."
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.customerAddress.delete({ where: { id } });

            // If deleted address was default, promote another address to default
            if (address.isDefault) {
                const nextAddress = await tx.customerAddress.findFirst({
                    where: { customerId },
                    orderBy: { createdAt: "desc" }
                });
                if (nextAddress) {
                    await tx.customerAddress.update({
                        where: { id: nextAddress.id },
                        data: { isDefault: true }
                    });
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: "Address deleted successfully"
        });
    } catch (error: any) {
        console.error("DELETE CUSTOMER ADDRESS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * PATCH /customer/addresses/:id/default
 * Set an address as the default delivery address
 */
export const setDefaultAddress = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const id = req.params.id as string;

        if (!customerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const address = await prisma.customerAddress.findUnique({
            where: { id }
        });

        if (!address) {
            return res.status(404).json({ message: "Address not found" });
        }

        if (address.customerId !== customerId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await prisma.$transaction([
            prisma.customerAddress.updateMany({
                where: { customerId, NOT: { id } },
                data: { isDefault: false }
            }),
            prisma.customerAddress.update({
                where: { id },
                data: { isDefault: true }
            })
        ]);

        return res.status(200).json({
            success: true,
            message: "Default address updated successfully",
            addressId: id
        });
    } catch (error: any) {
        console.error("SET DEFAULT ADDRESS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
