import type { Request, Response } from "express";
import { AdminActionType, ContentPlacement, ContentStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";

const isPlacement = (value: unknown): value is ContentPlacement =>
    typeof value === "string" &&
    (Object.values(ContentPlacement) as string[]).includes(value);

const isStatus = (value: unknown): value is ContentStatus =>
    typeof value === "string" && (Object.values(ContentStatus) as string[]).includes(value);

type ParsedDate = { ok: true; value: Date | null | undefined } | { ok: false };

const parseDate = (value: unknown): ParsedDate => {
    if (value === undefined) return { ok: true, value: undefined };
    if (value === null || value === "") return { ok: true, value: null };
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return { ok: false };
    return { ok: true, value: date };
};

export const getBlocks = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const placement =
            typeof req.query.placement === "string" && req.query.placement
                ? req.query.placement
                : undefined;
        if (placement !== undefined && !isPlacement(placement)) {
            return res.status(400).json({ message: "Invalid placement" });
        }

        const status =
            typeof req.query.status === "string" && req.query.status
                ? req.query.status
                : undefined;
        if (status !== undefined && !isStatus(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const search =
            typeof req.query.search === "string" ? req.query.search.trim() : "";

        const where: Prisma.ContentBlockWhereInput = {
            ...(placement ? { placement: placement as ContentPlacement } : {}),
            ...(status ? { status: status as ContentStatus } : {}),
            ...(search
                ? {
                      OR: [
                          { title: { contains: search, mode: "insensitive" } },
                          { body: { contains: search, mode: "insensitive" } }
                      ]
                  }
                : {})
        };

        const [blocks, total] = await prisma.$transaction([
            prisma.contentBlock.findMany({
                where,
                orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
                skip,
                take: limit
            }),
            prisma.contentBlock.count({ where })
        ]);

        return res.status(200).json({
            blocks,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET CONTENT BLOCKS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const createBlock = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const {
            title,
            subtitle,
            body,
            imageUrl,
            linkUrl,
            placement,
            status,
            sortOrder,
            visibleFrom,
            visibleTo
        } = req.body;

        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ message: "title is required" });
        }
        if (placement !== undefined && !isPlacement(placement)) {
            return res.status(400).json({ message: "Invalid placement" });
        }
        if (status !== undefined && !isStatus(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        if (sortOrder !== undefined && Number.isNaN(Number(sortOrder))) {
            return res.status(400).json({ message: "sortOrder must be a number" });
        }

        const from = parseDate(visibleFrom);
        const to = parseDate(visibleTo);
        if (!from.ok || !to.ok) {
            return res.status(400).json({ message: "Invalid visibleFrom / visibleTo date" });
        }

        const block = await prisma.contentBlock.create({
            data: {
                title: title.trim(),
                subtitle: typeof subtitle === "string" ? subtitle : null,
                body: typeof body === "string" ? body : null,
                imageUrl: typeof imageUrl === "string" ? imageUrl : null,
                linkUrl: typeof linkUrl === "string" ? linkUrl : null,
                placement: (placement as ContentPlacement) ?? undefined,
                status: (status as ContentStatus) ?? undefined,
                sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
                visibleFrom: from.value ?? null,
                visibleTo: to.value ?? null,
                createdById: adminId
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.CONTENT_CREATED,
            targetType: "ContentBlock",
            targetId: block.id,
            description: `Content block '${block.title}' created`,
            previousValue: null,
            newValue: { title: block.title, placement: block.placement, status: block.status },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({ block });
    } catch (error: any) {
        console.error("CREATE CONTENT BLOCK ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateBlock = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const blockId = String(req.params.id);

        const existing = await prisma.contentBlock.findUnique({ where: { id: blockId } });
        if (!existing) return res.status(404).json({ message: "Content block not found." });

        const {
            title,
            subtitle,
            body,
            imageUrl,
            linkUrl,
            placement,
            status,
            sortOrder,
            visibleFrom,
            visibleTo
        } = req.body;

        if (title !== undefined && (typeof title !== "string" || !title.trim())) {
            return res.status(400).json({ message: "title must be a non-empty string" });
        }
        if (placement !== undefined && !isPlacement(placement)) {
            return res.status(400).json({ message: "Invalid placement" });
        }
        if (status !== undefined && !isStatus(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        if (sortOrder !== undefined && Number.isNaN(Number(sortOrder))) {
            return res.status(400).json({ message: "sortOrder must be a number" });
        }

        const from = parseDate(visibleFrom);
        const to = parseDate(visibleTo);
        if (!from.ok || !to.ok) {
            return res.status(400).json({ message: "Invalid visibleFrom / visibleTo date" });
        }

        const data: Prisma.ContentBlockUpdateInput = {};
        if (title !== undefined) data.title = String(title).trim();
        if (subtitle !== undefined) data.subtitle = typeof subtitle === "string" ? subtitle : null;
        if (body !== undefined) data.body = typeof body === "string" ? body : null;
        if (imageUrl !== undefined) data.imageUrl = typeof imageUrl === "string" ? imageUrl : null;
        if (linkUrl !== undefined) data.linkUrl = typeof linkUrl === "string" ? linkUrl : null;
        if (placement !== undefined) data.placement = placement as ContentPlacement;
        if (status !== undefined) data.status = status as ContentStatus;
        if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
        if (from.value !== undefined) data.visibleFrom = from.value;
        if (to.value !== undefined) data.visibleTo = to.value;

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ message: "No updatable fields provided" });
        }

        const block = await prisma.contentBlock.update({ where: { id: blockId }, data });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.CONTENT_UPDATED,
            targetType: "ContentBlock",
            targetId: block.id,
            description: `Content block '${block.title}' updated`,
            previousValue: {
                title: existing.title,
                placement: existing.placement,
                status: existing.status,
                sortOrder: existing.sortOrder
            },
            newValue: {
                title: block.title,
                placement: block.placement,
                status: block.status,
                sortOrder: block.sortOrder
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ block });
    } catch (error: any) {
        console.error("UPDATE CONTENT BLOCK ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateBlockStatus = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const blockId = String(req.params.id);
        const { status } = req.body;

        if (!isStatus(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const existing = await prisma.contentBlock.findUnique({ where: { id: blockId } });
        if (!existing) return res.status(404).json({ message: "Content block not found." });

        const block = await prisma.contentBlock.update({
            where: { id: blockId },
            data: { status: status as ContentStatus }
        });

        await logAdminAction({
            adminId,
            actionType:
                status === "PUBLISHED"
                    ? AdminActionType.CONTENT_PUBLISHED
                    : AdminActionType.CONTENT_UPDATED,
            targetType: "ContentBlock",
            targetId: block.id,
            description:
                status === "PUBLISHED"
                    ? `Content block '${block.title}' published`
                    : `Content block '${block.title}' status changed to ${block.status}`,
            previousValue: { status: existing.status },
            newValue: { status: block.status },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ block });
    } catch (error: any) {
        console.error("UPDATE CONTENT BLOCK STATUS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteBlock = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const blockId = String(req.params.id);

        const existing = await prisma.contentBlock.findUnique({ where: { id: blockId } });
        if (!existing) return res.status(404).json({ message: "Content block not found." });

        await prisma.contentBlock.delete({ where: { id: blockId } });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.CONTENT_DELETED,
            targetType: "ContentBlock",
            targetId: blockId,
            description: `Content block '${existing.title}' deleted`,
            previousValue: {
                title: existing.title,
                placement: existing.placement,
                status: existing.status
            },
            newValue: null,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ message: "Content block deleted" });
    } catch (error: any) {
        console.error("DELETE CONTENT BLOCK ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getPublicBlocks = async (req: Request, res: Response) => {
    try {
        const placement =
            typeof req.query.placement === "string" && req.query.placement
                ? req.query.placement
                : undefined;
        if (placement !== undefined && !isPlacement(placement)) {
            return res.status(400).json({ message: "Invalid placement" });
        }

        const now = new Date();

        const blocks = await prisma.contentBlock.findMany({
            where: {
                status: "PUBLISHED",
                ...(placement ? { placement: placement as ContentPlacement } : {}),
                AND: [
                    { OR: [{ visibleFrom: null }, { visibleFrom: { lte: now } }] },
                    { OR: [{ visibleTo: null }, { visibleTo: { gte: now } }] }
                ]
            },
            orderBy: { sortOrder: "asc" },
            take: 50,
            select: {
                id: true,
                title: true,
                subtitle: true,
                body: true,
                imageUrl: true,
                linkUrl: true,
                placement: true,
                sortOrder: true
            }
        });

        res.setHeader("Cache-Control", "public, max-age=60");
        return res.status(200).json({ blocks });
    } catch (error: any) {
        console.error("GET PUBLIC CONTENT BLOCKS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
