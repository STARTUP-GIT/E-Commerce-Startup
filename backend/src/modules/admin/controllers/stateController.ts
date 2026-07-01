import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const createState = async (req: Request, res: Response) => {
    try {
        const { name, isActive } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ message: "State name is required" });
        }

        const normalized = name.trim();
        const existing = await prisma.state.findUnique({ where: { name: normalized } });
        if (existing) {
            return res.status(400).json({ message: "State already exists" });
        }

        const state = await prisma.state.create({
            data: {
                name: normalized,
                isActive: isActive !== undefined ? !!isActive : true
            }
        });

        return res.status(201).json({ message: "State created successfully", state });
    } catch (error: any) {
        console.error("CREATE STATE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getStates = async (req: Request, res: Response) => {
    try {
        const states = await prisma.state.findMany({
            orderBy: { name: "asc" }
        });
        return res.status(200).json({ states });
    } catch (error: any) {
        console.error("GET STATES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateState = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, isActive } = req.body;

        if (!id) {
            return res.status(400).json({ message: "State ID is required" });
        }

        const existing = await prisma.state.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "State not found" });
        }

        const data: any = {};
        if (name?.trim()) {
            const normalized = name.trim();
            const duplicate = await prisma.state.findFirst({ where: { name: normalized, NOT: { id } } });
            if (duplicate) {
                return res.status(400).json({ message: "Another state with this name already exists" });
            }
            data.name = normalized;
        }

        if (isActive !== undefined) {
            data.isActive = !!isActive;
        }

        const updated = await prisma.state.update({
            where: { id },
            data
        });

        return res.status(200).json({ message: "State updated successfully", state: updated });
    } catch (error: any) {
        console.error("UPDATE STATE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteState = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        if (!id) {
            return res.status(400).json({ message: "State ID is required" });
        }

        const existing = await prisma.state.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "State not found" });
        }

        await prisma.state.delete({ where: { id } });
        return res.status(200).json({ message: "State deleted successfully" });
    } catch (error: any) {
        console.error("DELETE STATE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
