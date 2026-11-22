import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { ServiceabilityService } from "../../../services/location/serviceability.service.js";

/**
 * POST /api/locations/resolve
 * Reverse geocodes coordinates (or verifies provided state/district) and checks serviceability
 */
export const resolveLocation = async (req: Request, res: Response) => {
    try {
        const {
            latitude,
            longitude,
            districtId,
            townId,
            serviceAreaId,
            stateId,
            state,
            district,
            city,
            town,
            serviceArea,
            postalCode: inputPostalCode,
            userRole,
            role
        } = req.body ?? {};

        const effectiveRole = (userRole || role || "CUSTOMER").toUpperCase() as "CUSTOMER" | "SELLER" | "GUEST";

        let resolvedState = state?.trim();
        let resolvedDistrict = district?.trim();
        let resolvedCity = city?.trim();
        let resolvedTown = town?.trim();
        let resolvedServiceArea = serviceArea?.trim();
        let postalCode = inputPostalCode?.trim();
        let formattedAddress: string | undefined = undefined;

        if (latitude !== undefined && longitude !== undefined && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
            const geocodeResult = await ServiceabilityService.resolveCoordinates(
                Number(latitude),
                Number(longitude)
            );
            resolvedState = resolvedState || geocodeResult.state;
            resolvedDistrict = resolvedDistrict || geocodeResult.district;
            resolvedCity = resolvedCity || geocodeResult.city;
            resolvedServiceArea = resolvedServiceArea || geocodeResult.serviceArea;
            postalCode = postalCode || geocodeResult.postalCode;
            formattedAddress = geocodeResult.formattedAddress;
        }

        const serviceability = await ServiceabilityService.checkServiceability({
            districtId,
            townId,
            serviceAreaId,
            stateId,
            state: resolvedState,
            district: resolvedDistrict,
            city: resolvedCity,
            town: resolvedTown,
            serviceArea: resolvedServiceArea,
            postalCode,
            latitude: latitude !== undefined ? Number(latitude) : undefined,
            longitude: longitude !== undefined ? Number(longitude) : undefined,
            userRole: effectiveRole
        });

        const hasResolvedLocation = Boolean(resolvedState && (resolvedDistrict || resolvedCity));

        return res.status(200).json({
            resolvedLocation: hasResolvedLocation ? {
                districtId: serviceability.districtId || districtId,
                townId: serviceability.townId || townId,
                serviceAreaId: serviceability.serviceAreaId || serviceAreaId,
                state: resolvedState!,
                district: (resolvedDistrict || resolvedCity)!,
                city: (resolvedCity || resolvedDistrict)!,
                town: resolvedTown,
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
 * Also supports query params when called as GET
 */
export const checkServiceability = async (req: Request, res: Response) => {
    try {
        const source = req.method === "GET" ? req.query : req.body ?? {};
        const {
            districtId,
            townId,
            serviceAreaId,
            stateId,
            state,
            district,
            city,
            town,
            serviceArea,
            postalCode,
            latitude,
            longitude,
            lat,
            lng,
            userRole,
            role
        } = source;

        const effectiveRole = (userRole || role || "CUSTOMER").toString().toUpperCase() as "CUSTOMER" | "SELLER" | "GUEST";
        const effectiveLat = latitude !== undefined ? Number(latitude) : (lat !== undefined ? Number(lat) : undefined);
        const effectiveLng = longitude !== undefined ? Number(longitude) : (lng !== undefined ? Number(lng) : undefined);

        const result = await ServiceabilityService.checkServiceability({
            districtId: districtId ? String(districtId).trim() : undefined,
            townId: townId ? String(townId).trim() : undefined,
            serviceAreaId: serviceAreaId ? String(serviceAreaId).trim() : undefined,
            stateId: stateId ? String(stateId).trim() : undefined,
            state: state ? String(state).trim() : undefined,
            district: district ? String(district).trim() : undefined,
            city: city ? String(city).trim() : undefined,
            town: town ? String(town).trim() : undefined,
            serviceArea: serviceArea ? String(serviceArea).trim() : undefined,
            postalCode: postalCode ? String(postalCode).trim() : undefined,
            latitude: effectiveLat !== undefined && !isNaN(effectiveLat) ? effectiveLat : undefined,
            longitude: effectiveLng !== undefined && !isNaN(effectiveLng) ? effectiveLng : undefined,
            userRole: effectiveRole
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
 * Supports ?role=CUSTOMER (default) and ?role=SELLER
 */
export const getAvailableCities = async (req: Request, res: Response) => {
    try {
        const role = (req.query.role || req.query.userRole || "CUSTOMER").toString().toUpperCase();

        const activeStates = await prisma.state.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        });

        const districtWhere: any = {
            isActive: true,
            maintenanceMode: false,
            launchStatus: "LAUNCHED",
        };

        if (activeStates.length > 0) {
            districtWhere.state = { in: activeStates.map(s => s.name) };
        }

        if (role === "CUSTOMER") {
            districtWhere.isCustomerEnabled = true;
        } else if (role === "SELLER") {
            districtWhere.isSellerEnabled = true;
        }

        const activeDistricts = await prisma.city.findMany({
            where: districtWhere,
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
            longitude,
            notes
        } = req.body ?? {};

        let customerId = (req as any).customerId;
        let sellerId = (req as any).sellerId;

        if (!customerId && req.cookies?.customer_session) {
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
            notes
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
