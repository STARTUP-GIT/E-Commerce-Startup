import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const createCity = async (req: Request, res: Response) => {
    try {
        const { name, state, isActive } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ message: "City name is required" });
        }

        const normalized = name.trim();
        const existing = await prisma.city.findUnique({ where: { name: normalized } });
        if (existing) {
            return res.status(400).json({ message: "City already exists" });
        }

        const city = await prisma.city.create({
            data: {
                name: normalized,
                state: state?.trim() || "Karnataka",
                isActive: isActive !== undefined ? !!isActive : true
            }
        });

        return res.status(201).json({ message: "City created successfully", city });
    } catch (error: any) {
        console.error("CREATE CITY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getCities = async (req: Request, res: Response) => {
    try {
        const cities = await prisma.city.findMany({
            orderBy: { name: "asc" }
        });
        return res.status(200).json({ cities });
    } catch (error: any) {
        console.error("GET CITIES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateCity = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, state, isActive } = req.body;

        if (!id) {
            return res.status(400).json({ message: "City ID is required" });
        }

        const existing = await prisma.city.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "City not found" });
        }

        const data: any = {};
        if (name?.trim()) {
            const normalized = name.trim();
            const duplicate = await prisma.city.findFirst({ where: { name: normalized, NOT: { id } } });
            if (duplicate) {
                return res.status(400).json({ message: "Another city with this name already exists" });
            }
            data.name = normalized;
        }

        if (state?.trim()) {
            data.state = state.trim();
        }

        if (isActive !== undefined) {
            data.isActive = !!isActive;
        }

        const updated = await prisma.city.update({
            where: { id },
            data
        });

        return res.status(200).json({ message: "City updated successfully", city: updated });
    } catch (error: any) {
        console.error("UPDATE CITY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteCity = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        if (!id) {
            return res.status(400).json({ message: "City ID is required" });
        }

        const existing = await prisma.city.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "City not found" });
        }

        await prisma.city.delete({ where: { id } });
        return res.status(200).json({ message: "City deleted successfully" });
    } catch (error: any) {
        console.error("DELETE CITY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
