import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getActiveCities = async (req: Request, res: Response) => {
    try {
        const cities = await prisma.city.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" }
        });
        return res.status(200).json({ cities });
    } catch (error: any) {
        console.error("GET ACTIVE CITIES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
