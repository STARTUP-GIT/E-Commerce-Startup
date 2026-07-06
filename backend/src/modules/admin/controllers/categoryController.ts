import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

// Helper to generate a slug
const generateSlug = (name: string) => {
    return name
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, description, isActive, sortOrder, imageUrl } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ message: "Category name is required" });
        }

        const normalized = name.trim();
        const slug = generateSlug(normalized);

        const existing = await prisma.category.findUnique({ where: { slug } });
        if (existing) {
            return res.status(400).json({ message: "Category with this name already exists" });
        }

        const category = await prisma.category.create({
            data: {
                name: normalized,
                slug,
                description: description ? description.trim() : null,
                imageUrl: imageUrl || null,
                sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
                isActive: isActive !== undefined ? !!isActive : true
            }
        });

        return res.status(201).json({ message: "Category created successfully", category });
    } catch (error: any) {
        console.error("CREATE CATEGORY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
        });
        return res.status(200).json({ categories });
    } catch (error: any) {
        console.error("GET CATEGORIES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, description, isActive, sortOrder, imageUrl } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Category ID is required" });
        }

        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Category not found" });
        }

        const data: any = {};
        if (name?.trim()) {
            const normalized = name.trim();
            const slug = generateSlug(normalized);
            const duplicate = await prisma.category.findFirst({ where: { slug, NOT: { id } } });
            if (duplicate) {
                return res.status(400).json({ message: "Another category with this name already exists" });
            }
            data.name = normalized;
            data.slug = slug;
        }

        if (description !== undefined) {
            data.description = description ? description.trim() : null;
        }

        if (isActive !== undefined) {
            data.isActive = !!isActive;
        }

        if (sortOrder !== undefined) {
            data.sortOrder = Number(sortOrder);
        }

        if (imageUrl !== undefined) {
            data.imageUrl = imageUrl || null;
        }

        const updated = await prisma.category.update({
            where: { id },
            data
        });

        return res.status(200).json({ message: "Category updated successfully", category: updated });
    } catch (error: any) {
        console.error("UPDATE CATEGORY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateCategoryStatus = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { isActive } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Category ID is required" });
        }

        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Category not found" });
        }

        if (isActive === undefined) {
            return res.status(400).json({ message: "Status isActive is required" });
        }

        const updated = await prisma.category.update({
            where: { id },
            data: { isActive: !!isActive }
        });

        return res.status(200).json({ message: "Category status updated successfully", category: updated });
    } catch (error: any) {
        console.error("PATCH CATEGORY STATUS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        if (!id) {
            return res.status(400).json({ message: "Category ID is required" });
        }

        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Category not found" });
        }

        const productCount = await prisma.product.count({ where: { categoryId: id } });
        if (productCount > 0) {
            return res.status(400).json({ message: "Cannot delete category with associated products. Please disallow it instead." });
        }

        await prisma.category.delete({ where: { id } });
        return res.status(200).json({ message: "Category deleted successfully" });
    } catch (error: any) {
        console.error("DELETE CATEGORY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
