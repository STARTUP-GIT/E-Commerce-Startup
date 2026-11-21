import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

/**
 * GET /api/admin/location-requests
 * Filterable list of customer and seller location requests
 */
export const listLocationRequests = async (req: Request, res: Response) => {
    try {
        const {
            requestType,
            status,
            state,
            district,
            search,
            page = "1",
            limit = "50"
        } = req.query;

        const where: any = {};

        if (requestType && (requestType === "CUSTOMER" || requestType === "SELLER")) {
            where.requestType = requestType;
        }

        if (status) {
            where.status = status;
        }

        if (state) {
            where.state = { equals: String(state).trim(), mode: "insensitive" };
        }

        if (district) {
            where.district = { equals: String(district).trim(), mode: "insensitive" };
        }

        if (search) {
            const query = String(search).trim();
            where.OR = [
                { email: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
                { city: { contains: query, mode: "insensitive" } },
                { district: { contains: query, mode: "insensitive" } },
                { state: { contains: query, mode: "insensitive" } },
            ];
        }

        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
        const skip = (pageNum - 1) * limitNum;

        const [requests, totalCount] = await Promise.all([
            prisma.locationRequest.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            createdAt: true
                        }
                    },
                    seller: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
                skip,
                take: limitNum
            }),
            prisma.locationRequest.count({ where })
        ]);

        // Group counts by status
        const [pendingCount, reviewedCount, approvedCount, rejectedCount] = await Promise.all([
            prisma.locationRequest.count({ where: { status: "PENDING" } }),
            prisma.locationRequest.count({ where: { status: "REVIEWED" } }),
            prisma.locationRequest.count({ where: { status: "APPROVED_FOR_FUTURE" } }),
            prisma.locationRequest.count({ where: { status: "REJECTED" } }),
        ]);

        return res.status(200).json({
            requests,
            pagination: {
                total: totalCount,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalCount / limitNum)
            },
            counts: {
                total: totalCount,
                pending: pendingCount,
                reviewed: reviewedCount,
                approvedForFuture: approvedCount,
                rejected: rejectedCount
            }
        });
    } catch (error: any) {
        console.error("LIST LOCATION REQUESTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * PATCH /api/admin/location-requests/:id
 * Admin updates request status, notes, or priority
 */
export const updateLocationRequest = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { status, adminNotes, priority } = req.body;

        const existing = await prisma.locationRequest.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Location request not found" });
        }

        const validStatuses = ["PENDING", "REVIEWED", "APPROVED_FOR_FUTURE", "REJECTED"];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
        }

        const data: any = {};
        if (status) data.status = status;
        if (adminNotes !== undefined) data.adminNotes = adminNotes?.trim() || null;
        if (priority !== undefined) data.priority = Number(priority);

        const updated = await prisma.locationRequest.update({
            where: { id },
            data,
            include: {
                customer: { select: { id: true, firstName: true, lastName: true, email: true } },
                seller: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
        });

        return res.status(200).json({
            message: "Location request updated successfully",
            request: updated
        });
    } catch (error: any) {
        console.error("UPDATE LOCATION REQUEST ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * GET /api/admin/location-requests/summary
 * Aggregate top requested districts and cities
 */
export const getLocationRequestsSummary = async (req: Request, res: Response) => {
    try {
        const requests = await prisma.locationRequest.findMany({
            select: { state: true, district: true, city: true, status: true, requestType: true }
        });

        const districtCounts: Record<string, { state: string; district: string; customerCount: number; sellerCount: number; total: number }> = {};

        for (const r of requests) {
            const districtName = r.district || r.city || "Unknown";
            const key = `${r.state}::${districtName}`;
            if (!districtCounts[key]) {
                districtCounts[key] = {
                    state: r.state,
                    district: districtName,
                    customerCount: 0,
                    sellerCount: 0,
                    total: 0
                };
            }
            if (r.requestType === "SELLER") {
                districtCounts[key].sellerCount++;
            } else {
                districtCounts[key].customerCount++;
            }
            districtCounts[key].total++;
        }

        const topRequested = Object.values(districtCounts).sort((a, b) => b.total - a.total).slice(0, 20);

        return res.status(200).json({
            summary: topRequested,
            totalRequests: requests.length
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
