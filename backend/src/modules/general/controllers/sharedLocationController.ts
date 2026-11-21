import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { ServiceabilityService } from "../../../services/location/serviceability.service.js";

/**
 * POST /api/locations/resolve
 * Reverse geocodes coordinates (or verifies provided state/district) and checks serviceability
 */
export const resolveLocation = async (req: Request, res: Response) => {
    try {
        const { latitude, longitude, state, district, city, userRole } = req.body ?? {};

        let resolvedState = state?.trim();
        let resolvedDistrict = district?.trim();
        let resolvedCity = city?.trim();
        let resolvedServiceArea: string | undefined = undefined;
        let postalCode: string | undefined = undefined;
        let formattedAddress: string | undefined = undefined;

        if (latitude !== undefined && longitude !== undefined && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
            const geocodeResult = await ServiceabilityService.resolveCoordinates(
                Number(latitude),
                Number(longitude)
            );
            resolvedState = resolvedState || geocodeResult.state;
            resolvedDistrict = resolvedDistrict || geocodeResult.district;
            resolvedCity = resolvedCity || geocodeResult.city;
            resolvedServiceArea = geocodeResult.serviceArea;
            postalCode = geocodeResult.postalCode;
            formattedAddress = geocodeResult.formattedAddress;
        }

        const serviceability = await ServiceabilityService.checkServiceability({
            state: resolvedState,
            district: resolvedDistrict,
            city: resolvedCity,
            serviceArea: resolvedServiceArea,
            postalCode,
            latitude: latitude !== undefined ? Number(latitude) : undefined,
            longitude: longitude !== undefined ? Number(longitude) : undefined,
            userRole: userRole || "CUSTOMER"
        });

        const hasResolvedLocation = Boolean(resolvedState && (resolvedDistrict || resolvedCity));

        return res.status(200).json({
            resolvedLocation: hasResolvedLocation ? {
                state: resolvedState!,
                district: (resolvedDistrict || resolvedCity)!,
                city: (resolvedCity || resolvedDistrict)!,
                serviceArea: resolvedServiceArea,
                postalCode,
                latitude: latitude !== undefined ? Number(latitude) : undefined,
                longitude: longitude !== undefined ? Number(longitude) : undefined,
                formattedAddress
            } : null,
            serviceability
        });
    } catch (error: any) {
        console.error("RESOLVE LOCATION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * POST /api/locations/check-serviceability
 */
export const checkServiceability = async (req: Request, res: Response) => {
    try {
        const { state, district, city, town, serviceArea, postalCode, latitude, longitude, userRole } = req.body ?? {};

        const result = await ServiceabilityService.checkServiceability({
            state,
            district,
            city,
            town,
            serviceArea,
            postalCode,
            latitude: latitude !== undefined ? Number(latitude) : undefined,
            longitude: longitude !== undefined ? Number(longitude) : undefined,
            userRole
        });

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("CHECK SERVICEABILITY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * GET /api/locations/available-cities
 * List all currently available and serviceable cities/districts dynamically from backend
 */
export const getAvailableCities = async (req: Request, res: Response) => {
    try {
        const activeStates = await prisma.state.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        });

        const activeDistricts = await prisma.city.findMany({
            where: {
                isActive: true,
                maintenanceMode: false,
                launchStatus: "LAUNCHED",
                state: { in: activeStates.map(s => s.name) }
            },
            select: {
                id: true,
                name: true,
                displayName: true,
                state: true,
                isCustomerEnabled: true,
                isSellerEnabled: true,
                isDeliveryEnabled: true,
                displayOrder: true,
            },
            orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
        });

        const cities = activeDistricts.map(d => ({
            id: d.id,
            name: d.displayName || d.name,
            canonicalName: d.name,
            state: d.state,
            isCustomerEnabled: d.isCustomerEnabled,
            isSellerEnabled: d.isSellerEnabled,
            isDeliveryEnabled: d.isDeliveryEnabled,
        }));

        return res.status(200).json({
            cities,
            states: activeStates,
            totalAvailable: cities.length
        });
    } catch (error: any) {
        console.error("GET AVAILABLE CITIES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * POST /api/locations/request
 * Submit a customer or seller request to launch in their city
 */
export const submitLocationRequest = async (req: Request, res: Response) => {
    try {
        const {
            requestType = "CUSTOMER",
            name,
            email,
            phone,
            state,
            district,
            city,
            postalCode,
            latitude,
            longitude
        } = req.body ?? {};

        // Extract user identity from session cookies or token if available
        let customerId = (req as any).customerId;
        let sellerId = (req as any).sellerId;

        if (!customerId && req.cookies?.customer_session) {
            // Check polymorphic or decode customer_session
            try {
                const { verifyAccessToken } = await import("../../../config/token.js");
                const decoded = verifyAccessToken(req.cookies.customer_session) as any;
                if (decoded?.id) customerId = decoded.id;
            } catch {}
        }

        if (!sellerId && req.cookies?.seller_session) {
            try {
                const { verifyAccessToken } = await import("../../../config/token.js");
                const decoded = verifyAccessToken(req.cookies.seller_session) as any;
                if (decoded?.id) sellerId = decoded.id;
            } catch {}
        }

        const result = await ServiceabilityService.submitLocationRequest({
            requestType: requestType === "SELLER" ? "SELLER" : "CUSTOMER",
            customerId,
            sellerId,
            name,
            email,
            phone,
            state,
            district,
            city,
            postalCode,
            latitude: latitude !== undefined ? Number(latitude) : undefined,
            longitude: longitude !== undefined ? Number(longitude) : undefined,
        });

        return res.status(201).json(result);
    } catch (error: any) {
        console.error("SUBMIT LOCATION REQUEST ERROR:", error);
        return res.status(400).json({ message: error.message || "Unable to submit location request" });
    }
};

/**
 * GET /api/locations/states
 */
export const getStatesList = async (req: Request, res: Response) => {
    try {
        const states = await prisma.state.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        });
        return res.status(200).json({ states });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * GET /api/locations/districts
 */
export const getDistrictsList = async (req: Request, res: Response) => {
    try {
        const stateName = req.query.state as string;
        if (!stateName) {
            return res.status(400).json({ message: "state query parameter is required" });
        }

        const districts = await prisma.city.findMany({
            where: {
                state: { equals: stateName.trim(), mode: "insensitive" },
                isActive: true
            },
            select: { id: true, name: true, displayName: true, state: true },
            orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
        });

        return res.status(200).json({ districts });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
