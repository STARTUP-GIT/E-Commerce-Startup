import type { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";

type ExportType = "orders" | "payments" | "customers" | "sellers" | "products" | "returns" | "reviews";

const EXPORT_TYPES: ExportType[] = [
    "orders",
    "payments",
    "customers",
    "sellers",
    "products",
    "returns",
    "reviews"
];

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;
const ROWS_PER_PAGE = 25;
const MARGIN = 40;
const ROW_HEIGHT = 18;

const STATUS_OPTIONS: Record<ExportType, string[]> = {
    orders: [
        "PENDING", "PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "READY_TO_SHIP",
        "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"
    ],
    payments: [
        "PENDING", "PENDING_COD", "PAID", "PROCESSING", "AUTHORIZED", "CAPTURED",
        "COMPLETED", "FAILED", "CANCELLED", "REFUND_PENDING", "REFUNDED",
        "PARTIALLY_REFUNDED", "DISPUTED"
    ],
    customers: ["ACTIVE", "BANNED", "DEACTIVATED"],
    sellers: ["ACTIVE", "DISABLED", "BANNED"],
    products: [
        "DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "ACTIVE", "INACTIVE",
        "OUT_OF_STOCK", "DISCONTINUED", "REMOVED_BY_ADMIN", "REPORTED"
    ],
    returns: [
        "REQUESTED", "PENDING_REVIEW", "APPROVED", "REJECTED", "PICKUP_SCHEDULED",
        "PICKED_UP", "RECEIVED_BY_SELLER", "REFUND_PROCESSING", "REFUNDED",
        "COMPLETED", "CANCELLED"
    ],
    reviews: ["PUBLISHED", "HIDDEN"]
};

interface ExportSheet {
    headers: string[];
    widths: number[];
    rows: string[][];
}

const formatDateTime = (value: Date | string | null | undefined): string => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16).replace("T", " ");
};

const formatMoney = (value: unknown): string => Number(value ?? 0).toFixed(2);

const fullName = (first?: string | null, last?: string | null, fallback?: string | null): string => {
    const name = `${first ?? ""} ${last ?? ""}`.trim();
    return name || fallback || "";
};

const csvEscape = (value: unknown): string => {
    const s = String(value ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const parseDate = (value: unknown, field: string): { date?: Date; error?: string } => {
    if (!value) return {};
    const d = new Date(String(value));
    if (isNaN(d.getTime())) return { error: `Invalid \`${field}\` date` };
    return { date: d };
};

const buildWhere = (
    type: ExportType,
    status: unknown,
    from: unknown,
    to: unknown
): { where?: any; error?: string } => {
    const where: any = {};

    const fromDate = parseDate(from, "from");
    if (fromDate.error) return { error: fromDate.error };
    const toDate = parseDate(to, "to");
    if (toDate.error) return { error: toDate.error };

    if (fromDate.date || toDate.date) {
        where.createdAt = {};
        if (fromDate.date) where.createdAt.gte = fromDate.date;
        if (toDate.date) where.createdAt.lte = toDate.date;
    }

    if (status && String(status).trim()) {
        const s = String(status).trim().toUpperCase();
        if (!STATUS_OPTIONS[type].includes(s)) return { error: "Invalid status filter" };

        if (type === "customers") {
            if (s === "BANNED") where.isBanned = true;
            else if (s === "DEACTIVATED") where.isDeactivated = true;
            else {
                where.isBanned = false;
                where.isDeactivated = false;
            }
        } else if (type === "reviews") {
            where.isPublished = s === "PUBLISHED";
        } else {
            where.status = s;
        }
    }

    return { where };
};

const fetchSheet = async (type: ExportType, where: any, limit: number): Promise<ExportSheet> => {
    switch (type) {
        case "orders": {
            const orders = await prisma.order.findMany({
                where,
                select: {
                    id: true,
                    orderNumber: true,
                    createdAt: true,
                    status: true,
                    grandTotal: true,
                    customer: { select: { firstName: true, lastName: true, email: true } },
                    sellerOrders: {
                        select: { seller: { select: { shop: { select: { name: true } } } } }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: limit
            });

            return {
                headers: ["Order ID", "Order Number", "Date", "Customer", "Shop / Seller", "Status", "Total"],
                widths: [110, 95, 95, 140, 150, 105, 75],
                rows: orders.map((o) => [
                    o.id,
                    o.orderNumber,
                    formatDateTime(o.createdAt),
                    fullName(o.customer?.firstName, o.customer?.lastName, o.customer?.email ?? ""),
                    Array.from(
                        new Set(
                            o.sellerOrders
                                .map((so) => so.seller?.shop?.name)
                                .filter((n): n is string => Boolean(n))
                        )
                    ).join(", "),
                    o.status,
                    formatMoney(o.grandTotal)
                ])
            };
        }

        case "payments": {
            const payments = await prisma.payment.findMany({
                where,
                select: {
                    id: true,
                    createdAt: true,
                    method: true,
                    status: true,
                    amount: true,
                    order: { select: { orderNumber: true } }
                },
                orderBy: { createdAt: "desc" },
                take: limit
            });

            return {
                headers: ["Payment ID", "Date", "Order", "Method", "Status", "Amount"],
                widths: [140, 100, 110, 110, 140, 90],
                rows: payments.map((p) => [
                    p.id,
                    formatDateTime(p.createdAt),
                    p.order?.orderNumber ?? "",
                    p.method,
                    p.status,
                    formatMoney(p.amount)
                ])
            };
        }

        case "customers": {
            const customers = await prisma.customer.findMany({
                where,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                    email: true,
                    isBanned: true,
                    isDeactivated: true,
                    createdAt: true
                },
                orderBy: { createdAt: "desc" },
                take: limit
            });

            return {
                headers: ["Customer ID", "Name", "Email", "Status", "Joined"],
                widths: [130, 160, 220, 110, 110],
                rows: customers.map((c) => [
                    c.id,
                    fullName(c.firstName, c.lastName, c.username),
                    c.email,
                    c.isBanned ? "BANNED" : c.isDeactivated ? "DEACTIVATED" : "ACTIVE",
                    formatDateTime(c.createdAt)
                ])
            };
        }

        case "sellers": {
            const sellers = await prisma.seller.findMany({
                where,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                    email: true,
                    status: true,
                    createdAt: true
                },
                orderBy: { createdAt: "desc" },
                take: limit
            });

            return {
                headers: ["Seller ID", "Name", "Email", "Status", "Joined"],
                widths: [130, 160, 220, 110, 110],
                rows: sellers.map((s) => [
                    s.id,
                    fullName(s.firstName, s.lastName, s.username),
                    s.email,
                    s.status,
                    formatDateTime(s.createdAt)
                ])
            };
        }

        case "products": {
            const products = await prisma.product.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    price: true,
                    status: true,
                    createdAt: true,
                    seller: { select: { shop: { select: { name: true } } } }
                },
                orderBy: { createdAt: "desc" },
                take: limit
            });

            return {
                headers: ["Product ID", "Name", "Shop", "Status", "Price"],
                widths: [130, 240, 190, 130, 90],
                rows: products.map((p) => [
                    p.id,
                    p.name,
                    p.seller?.shop?.name ?? "",
                    p.status,
                    formatMoney(p.price)
                ])
            };
        }

        case "returns": {
            const returns = await prisma.returnRequest.findMany({
                where,
                select: {
                    id: true,
                    returnNumber: true,
                    status: true,
                    refundAmount: true,
                    createdAt: true,
                    order: { select: { orderNumber: true } }
                },
                orderBy: { createdAt: "desc" },
                take: limit
            });

            return {
                headers: ["Return Number", "Order", "Status", "Refund Amount", "Date"],
                widths: [140, 120, 170, 140, 120],
                rows: returns.map((r) => [
                    r.returnNumber,
                    r.order?.orderNumber ?? "",
                    r.status,
                    formatMoney(r.refundAmount),
                    formatDateTime(r.createdAt)
                ])
            };
        }

        case "reviews": {
            const reviews = await prisma.review.findMany({
                where,
                select: {
                    id: true,
                    rating: true,
                    isPublished: true,
                    createdAt: true,
                    product: { select: { name: true } }
                },
                orderBy: { createdAt: "desc" },
                take: limit
            });

            return {
                headers: ["Review ID", "Product", "Rating", "Status", "Date"],
                widths: [150, 280, 80, 110, 120],
                rows: reviews.map((r) => [
                    r.id,
                    r.product?.name ?? "",
                    String(r.rating),
                    r.isPublished ? "PUBLISHED" : "HIDDEN",
                    formatDateTime(r.createdAt)
                ])
            };
        }

        default:
            return { headers: [], widths: [], rows: [] };
    }
};

const sendCsv = (res: Response, sheet: ExportSheet, fileName: string) => {
    const csv = [sheet.headers, ...sheet.rows]
        .map((row) => row.map(csvEscape).join(","))
        .join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}.csv"`);
    return res.status(200).send(`\uFEFF${csv}`);
};

const sendPdf = (res: Response, sheet: ExportSheet, fileName: string, title: string) => {
    const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: MARGIN,
        info: { Title: title, Author: "Admin Export" }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}.pdf"`);

    doc.pipe(res);

    const totalWidth = sheet.widths.reduce((sum, w) => sum + w, 0);
    let y = MARGIN;

    doc.font("Helvetica-Bold").fontSize(16).fillColor("#09090B").text(title, MARGIN, y);
    y += 24;
    doc.font("Helvetica").fontSize(9).fillColor("#64748B")
        .text(`Generated at ${new Date().toISOString()}`, MARGIN, y);
    y += 24;

    const drawHeaderRow = () => {
        doc.save();
        doc.rect(MARGIN, y, totalWidth, ROW_HEIGHT).fill("#18181B");
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
        let x = MARGIN;
        sheet.headers.forEach((header, i) => {
            doc.text(header, x + 4, y + 5, {
                width: (sheet.widths[i] ?? 80) - 8,
                lineBreak: false,
                ellipsis: true
            });
            x += sheet.widths[i] ?? 80;
        });
        doc.restore();
        y += ROW_HEIGHT;
    };

    drawHeaderRow();

    sheet.rows.forEach((row, index) => {
        const needsPageBreak =
            (index > 0 && index % ROWS_PER_PAGE === 0) ||
            y + ROW_HEIGHT > doc.page.height - MARGIN;

        if (needsPageBreak) {
            doc.addPage();
            y = MARGIN;
            drawHeaderRow();
        }

        if (index % 2 === 1) {
            doc.save();
            doc.rect(MARGIN, y, totalWidth, ROW_HEIGHT).fill("#F8FAFC");
            doc.restore();
        }

        doc.font("Helvetica").fontSize(8.5);
        let x = MARGIN;
        row.forEach((cell, i) => {
            const width = sheet.widths[i] ?? 80;
            doc.fillColor("#09090B").text(String(cell ?? ""), x + 4, y + 5, {
                width: width - 8,
                lineBreak: false,
                ellipsis: true
            });
            x += width;
        });
        y += ROW_HEIGHT;
    });

    if (sheet.rows.length === 0) {
        doc.font("Helvetica").fontSize(10).fillColor("#64748B")
            .text("No records found.", MARGIN, y + 8);
    }

    doc.end();
};

export const getExport = async (req: Request, res: Response) => {
    try {
        const type = String(req.params.type || "").toLowerCase() as ExportType;
        if (!EXPORT_TYPES.includes(type)) {
            return res.status(400).json({ message: "Unsupported export type" });
        }

        const format = String(req.query.format || "csv").toLowerCase();
        if (format !== "csv" && format !== "pdf") {
            return res.status(400).json({ message: "Unsupported format. Use csv or pdf." });
        }

        const rawLimit = Number(req.query.limit);
        const limit = Number.isFinite(rawLimit) && rawLimit > 0
            ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
            : DEFAULT_LIMIT;

        const { where, error } = buildWhere(type, req.query.status, req.query.from, req.query.to);
        if (error) {
            return res.status(400).json({ message: error });
        }

        const sheet = await fetchSheet(type, where ?? {}, limit);

        const dateStamp = new Date().toISOString().slice(0, 10);
        const fileBase = `${type}-${dateStamp}`;
        const title = `${type.charAt(0).toUpperCase()}${type.slice(1)} export`;

        await logAdminAction({
            adminId: req.adminId!,
            actionType: AdminActionType.EXPORT_GENERATED,
            targetType: `${type.charAt(0).toUpperCase()}${type.slice(1)}Export`,
            targetId: type,
            description: `Exported ${sheet.rows.length} ${type} as ${format.toUpperCase()}`,
            previousValue: null,
            newValue: { type, format, rows: sheet.rows.length },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        if (format === "pdf") {
            return sendPdf(res, sheet, fileBase, title);
        }

        return sendCsv(res, sheet, fileBase);
    } catch (error: any) {
        console.error("EXPORT ERROR:", error);
        if (res.headersSent) return;
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
