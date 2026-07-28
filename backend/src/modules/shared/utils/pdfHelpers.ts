import type PDFDocument from "pdfkit";

// ---------------------------------------------------------------------------
// Design tokens — shadcn / Aura inspired
// ---------------------------------------------------------------------------

export const COLORS = {
    bg: "#FFFFFF",
    text: "#09090B",
    muted: "#64748B",
    border: "#CBD5E1",
    cardBg: "#FAFAFA",
    headerBg: "#18181B",
    headerText: "#FFFFFF",
    primary: "#7C3AED",
    accent: "#F4F4F5",
    rowAlt: "#F8FAFC",
    success: "#16A34A",
    warning: "#CA8A04",
    danger: "#DC2626",
} as const;

export const FONT = {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
} as const;

export const MARGIN = 50;
export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
export const CONTENT_W = PAGE_W - MARGIN * 2;

// ---------------------------------------------------------------------------
// Currency & formatting helpers
// ---------------------------------------------------------------------------

export function currency(n: number): string {
    return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function currencyShort(n: number): string {
    return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function safe(v: string | null | undefined, fallback = ""): string {
    return v?.trim() || fallback;
}

export function formatDate(d: string | Date | null | undefined): string {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(d: string | Date | null | undefined): string {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatStatus(s: string): string {
    return s
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ");
}

export function statusColor(s: string): string {
    switch (s) {
        case "PAID":
        case "COMPLETED":
        case "DELIVERED":
            return COLORS.success;
        case "PENDING":
        case "PROCESSING":
        case "SHIPPED":
        case "ASSIGNED":
        case "ACCEPTED":
            return COLORS.warning;
        case "CANCELLED":
        case "REJECTED":
        case "FAILED":
            return COLORS.danger;
        default:
            return COLORS.muted;
    }
}

// ---------------------------------------------------------------------------
// PDF drawing helpers
// ---------------------------------------------------------------------------

export function drawRoundedRect(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill?: string,
    stroke?: string,
) {
    doc.save();
    doc.roundedRect(x, y, w, h, r);
    if (fill) {
        doc.fill(fill);
    }
    if (stroke) {
        doc.strokeColor(stroke);
        doc.lineWidth(0.75);
        doc.stroke();
    } else if (!fill) {
        doc.fill("transparent");
    }
    doc.restore();
}

export function drawLabelValue(doc: PDFKit.PDFDocument, labelX: number, valX: number, yPos: number, label: string, value: string) {
    doc.font(FONT.regular).fontSize(8).fillColor(COLORS.muted);
    doc.text(label, labelX, yPos);
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.text);
    doc.text(value, valX, yPos, { width: 200 });
}

export function drawKV(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string) {
    doc.font(FONT.regular).fontSize(7).fillColor(COLORS.muted);
    doc.text(label, x, y);
    doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.text);
    doc.text(value, x + 70, y, { width: 150 });
}
