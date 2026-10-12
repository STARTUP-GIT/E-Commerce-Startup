import type { Request, Response } from "express";
import { StatementStatus } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";

// ─── GET /seller/api/commission-statements ────────────────────────────────────

export const getSellerCommissionStatements = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const periodMonth = typeof req.query.periodMonth === "string" && req.query.periodMonth ? req.query.periodMonth : undefined;

        const statements = await prisma.commissionStatement.findMany({
            where: {
                sellerId,
                status: StatementStatus.PUBLISHED,
                ...(periodMonth ? { periodMonth } : {})
            },
            orderBy: { periodMonth: "desc" },
            include: {
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                        confirmedAt: true,
                        transactionReference: true
                    }
                }
            }
        });

        return res.status(200).json({ statements });
    } catch (error: any) {
        console.error("GET SELLER STATEMENTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /seller/api/commission-statements/:id ────────────────────────────────

export const getSellerStatementDetail = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const id = String(req.params.id);

        const statement = await prisma.commissionStatement.findFirst({
            where: { id, sellerId, status: StatementStatus.PUBLISHED },
            include: {
                payments: true
            }
        });

        if (!statement) {
            return res.status(404).json({ message: "Statement not found." });
        }

        // Track access log asynchronously
        prisma.commissionStatementAccess.create({
            data: {
                statementId: id,
                sellerId
            }
        }).catch((err) => console.error("Access log error:", err));

        return res.status(200).json({ statement });
    } catch (error: any) {
        console.error("GET SELLER STATEMENT DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
