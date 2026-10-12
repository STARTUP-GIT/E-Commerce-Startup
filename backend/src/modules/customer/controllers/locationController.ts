import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { ServiceabilityService } from "../../../services/location/serviceability.service.js";

export const getEnabledStates = async (req: Request, res: Response) => {
    try {
        const states = await prisma.state.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });

        return res.status(200).json(states.map(s => ({
            id: s.id,
            name: s.name,
        })));
    } catch (error: any) {
        console.error("GET ENABLED STATES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getEnabledDistricts = async (req: Request, res: Response) => {
    try {
        const stateId = req.query.stateId as string;
        const stateName = req.query.state as string;

        if (!stateId && !stateName) {
            return res.status(400).json({ message: "stateId or state query parameter is required" });
        }

        let state: { id: string; name: string } | null = null;

        if (stateId) {
            state = await prisma.state.findUnique({
                where: { id: stateId },
                select: { id: true, name: true },
            });
        } else if (stateName) {
            state = await prisma.state.findFirst({
                where: { name: { equals: stateName.trim(), mode: "insensitive" } },
                select: { id: true, name: true },
            });
        }

        if (!state) {
            return res.status(404).json({ message: "State not found" });
        }

        const districts = await prisma.city.findMany({
            where: {
                state: { equals: state.name, mode: "insensitive" },
                isActive: true,
            },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });

        return res.status(200).json(districts.map(d => ({
            id: d.id,
            name: d.name,
            stateId: state!.id,
        })));
    } catch (error: any) {
        console.error("GET ENABLED DISTRICTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * POST /customer/location/check-serviceability
 * Check if the marketplace currently serves the given location
 */
export const checkLocationServiceability = async (req: Request, res: Response) => {
    try {
        const { state, district, city, postalCode, latitude, longitude } = req.body;

        const result = await ServiceabilityService.checkServiceability({
            state,
            district,
            city,
            postalCode,
            latitude: latitude !== undefined ? Number(latitude) : undefined,
            longitude: longitude !== undefined ? Number(longitude) : undefined,
        });

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("CHECK LOCATION SERVICEABILITY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * POST /customer/location/notify-me
 * Subscribe to Coming Soon notification updates
 */
export const subscribeLocationNotifyMe = async (req: Request, res: Response) => {
    try {
        const customerId = (req as any).customerId;
        const { email, state, district, city, postalCode, latitude, longitude, consent } = req.body;

        if (!consent) {
            return res.status(400).json({
                message: "Explicit consent is required to register for availability alerts."
            });
        }

        let userEmail = email;
        if (customerId && !userEmail) {
            const customer = await prisma.customer.findUnique({
                where: { id: customerId },
                select: { email: true }
            });
            userEmail = customer?.email;
        }

        const result = await ServiceabilityService.subscribeNotifyMe({
            customerId,
            email: userEmail,
            state,
            district,
            city,
            postalCode,
            latitude: latitude !== undefined ? Number(latitude) : undefined,
            longitude: longitude !== undefined ? Number(longitude) : undefined,
            consent: Boolean(consent)
        });

        return res.status(201).json(result);
    } catch (error: any) {
        console.error("SUBSCRIBE NOTIFY ME ERROR:", error);
        return res.status(400).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * DELETE /customer/location/notify-me/:id
 * Withdraw a subscription
 */
export const withdrawLocationNotifyMe = async (req: Request, res: Response) => {
    try {
        const customerId = (req as any).customerId;
        const id = req.params.id as string;

        const result = await ServiceabilityService.withdrawSubscription(id, customerId);
        return res.status(200).json(result);
    } catch (error: any) {
        console.error("WITHDRAW NOTIFY ME ERROR:", error);
        return res.status(400).json({ message: error.message || "Internal Server Error" });
    }
};
