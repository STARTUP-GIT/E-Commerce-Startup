import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getEnabledStates = async (req: Request, res: Response) => {
    try {
        const states = await prisma.state.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });

        return res.status(200).json({
            states: states.map(s => ({ id: s.id, name: s.name })),
        });
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

        return res.status(200).json({
            districts: districts.map(d => ({
                id: d.id,
                name: d.name,
                stateId: state.id,
            })),
        });
    } catch (error: any) {
        console.error("GET ENABLED DISTRICTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
