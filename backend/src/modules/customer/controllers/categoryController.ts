import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: "asc" }
        });
        return res.status(200).json({ categories });
    } catch (error: any) {
        console.error("GET PUBLIC CATEGORIES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getAllowedCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" }
        });
        return res.status(200).json({ categories });
    } catch (error: any) {
        console.error("GET ALLOWED CATEGORIES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
