import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { COLORS, FONT, safe, formatDate, currencyShort, drawRoundedRect } from "../../shared/utils/pdfHelpers.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShippingLabelOrder {
    orderNumber: string;
    trackingId: string;
    orderDate: string | Date;
}

export interface ShippingLabelCustomer {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
}

export interface ShippingLabelSeller {
    shopName: string;
    city: string;
    state: string;
}

export interface ShippingLabelData {
    order: ShippingLabelOrder;
    customer: ShippingLabelCustomer;
    seller: ShippingLabelSeller;
    deliveryType: string;
    deliveryProvider?: string | null;
    isPaid: boolean;
    grandTotal: number;
}

// ---------------------------------------------------------------------------
// Barcode — CODE39 encoder
// ---------------------------------------------------------------------------

const CODE39_PATTERNS: Record<string, string> = {
    '0': '000110100', '1': '100100001', '2': '001100001',
    '3': '101100000', '4': '000110001', '5': '100110000',
    '6': '001110000', '7': '000101001', '8': '100101000',
    '9': '001101000', 'A': '100010100', 'B': '001010100',
    'C': '101010000', 'D': '000011100', 'E': '100011000',
    'F': '001011000', 'G': '000001101', 'H': '100001001',
    'I': '001001001', 'J': '000011001', 'K': '100100011',
    'L': '000100011', 'M': '100010011', 'N': '000010011',
    'O': '100000011', 'P': '000110010', 'Q': '100110010',
    'R': '001110010', 'S': '000101010', 'T': '100101010',
    'U': '110000100', 'V': '011000100', 'W': '111000000',
    'X': '010001100', 'Y': '110001000', 'Z': '011001000',
    '-': '010000110', '.': '110000010', ' ': '011000010',
    '$': '010101000', '/': '010001010', '+': '010010010',
    '%': '000101010', '*': '010010100',
};

function encodeCode39(text: string): string {
    const encoded = '*' + text.toUpperCase() + '*';
    let bits = '';
    for (const char of encoded) {
        const pattern = CODE39_PATTERNS[char];
        if (!pattern) continue;
        if (bits) bits += '0';
        bits += pattern;
    }
    return bits;
}

function drawBarcode(doc: PDFKit.PDFDocument, text: string, x: number, y: number, maxWidth: number, height: number) {
    const bits = encodeCode39(text);
    const narrow = maxWidth / (bits.length * 0.5);
    const wide = narrow * 2.5;
    let cx = x;

    for (const bit of bits) {
        const w = bit === '1' ? wide : narrow;
        if (cx + w > x + maxWidth) break;
        doc.save();
        doc.rect(cx, y, w, height);
        doc.fill(COLORS.text);
        doc.restore();
        cx += w;
    }
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function generateShippingLabelPdf(data: ShippingLabelData): Promise<PDFKit.PDFDocument> {
    const qrBuffer = await QRCode.toBuffer(`https://auramarketplace.com/track/${data.order.trackingId}`, {
        width: 120,
        margin: 1,
    });

    const LABEL_W = 288;
    const LABEL_H = 432;
    const M = 14;
    const CONTENT_W = LABEL_W - M * 2;

    const doc = new PDFDocument({
        size: [LABEL_W, LABEL_H],
        margin: 0,
        info: {
            Title: `Shipping Label ${data.order.orderNumber}`,
            Author: "Aura Marketplace",
        },
    });

    let y = M;

    // ── 1. HEADER BAR ────────────────────────────────────────────────────
    const headerH = 42;
    drawRoundedRect(doc, M, y, CONTENT_W, headerH, 3, COLORS.headerBg);

    doc.font(FONT.bold).fontSize(10).fillColor(COLORS.headerText);
    doc.text("AURA", M + 10, y + 6, { continued: true });
    doc.font(FONT.regular).fontSize(8).text(" Marketplace", { continued: false });

    doc.font(FONT.regular).fontSize(6).fillColor("#A1A1AA");
    doc.text("support@auramarketplace.com", M + 10, y + 22);
    doc.text("auramarketplace.com", M + 10, y + 30);

    doc.font(FONT.bold).fontSize(14).fillColor(COLORS.headerText);
    doc.text("SHIPPING LABEL", M, y + 8, { align: "center", width: CONTENT_W });

    y += headerH + 8;

    // ── 2. ORDER INFO SECTION ────────────────────────────────────────────
    const orderBoxH = 36;
    drawRoundedRect(doc, M, y, CONTENT_W, orderBoxH, 3, COLORS.cardBg, COLORS.border);

    doc.font(FONT.bold).fontSize(6.5).fillColor(COLORS.muted);
    doc.text("ORDER NUMBER", M + 10, y + 6);
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.text);
    doc.text(data.order.orderNumber, M + 10, y + 16);

    const midX = M + CONTENT_W / 2;
    doc.font(FONT.bold).fontSize(6.5).fillColor(COLORS.muted);
    doc.text("TRACKING ID", midX + 6, y + 6);
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.text);
    doc.text(data.order.trackingId, midX + 6, y + 16);

    const rightX = midX + (CONTENT_W / 2 - 8);
    doc.font(FONT.bold).fontSize(6.5).fillColor(COLORS.muted);
    doc.text("ORDER DATE", rightX, y + 6);
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.text);
    doc.text(formatDate(data.order.orderDate), rightX, y + 16);

    y += orderBoxH + 6;

    // ── 3. SHIP TO ───────────────────────────────────────────────────────
    const shipH = 56;
    drawRoundedRect(doc, M, y, CONTENT_W, shipH, 3, COLORS.cardBg, COLORS.border);

    doc.font(FONT.bold).fontSize(7).fillColor(COLORS.primary);
    doc.text("SHIP TO", M + 10, y + 6);

    const c = data.customer;
    const custName = c.fullName || "Customer";
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.text);
    doc.text(custName, M + 10, y + 18, { width: CONTENT_W - 20 });

    const addrParts = [
        c.addressLine1,
        c.addressLine2,
        `${c.city}, ${c.state} ${c.postalCode}`,
    ].filter(Boolean);
    doc.font(FONT.regular).fontSize(7).fillColor(COLORS.muted);
    doc.text(addrParts.join(", "), M + 10, y + 30, { width: CONTENT_W - 86 });

    doc.font(FONT.regular).fontSize(7).fillColor(COLORS.text);
    doc.text(c.phone, M + 10 + (CONTENT_W - 76), y + 30, { width: 66, align: "right" });

    y += shipH + 6;

    // ── 4. SOLD BY ───────────────────────────────────────────────────────
    const soldH = 34;
    drawRoundedRect(doc, M, y, CONTENT_W, soldH, 3, COLORS.cardBg, COLORS.border);

    doc.font(FONT.bold).fontSize(7).fillColor(COLORS.primary);
    doc.text("SOLD BY", M + 10, y + 6);

    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.text);
    doc.text(safe(data.seller.shopName, "Seller"), M + 10, y + 18, { width: CONTENT_W - 20 });

    doc.font(FONT.regular).fontSize(7).fillColor(COLORS.muted);
    doc.text(`${safe(data.seller.city)}, ${safe(data.seller.state)}`, M + 10, y + 18, { width: CONTENT_W - 20, align: "right" });

    y += soldH + 6;

    // ── 5. DELIVERY + PAYMENT INFO ───────────────────────────────────────
    const delH = 48;
    drawRoundedRect(doc, M, y, CONTENT_W, delH, 3, COLORS.cardBg, COLORS.border);

    doc.font(FONT.bold).fontSize(7).fillColor(COLORS.primary);
    doc.text("DELIVERY INFORMATION", M + 10, y + 6);

    const delLabel = data.deliveryType === "SELF"
        ? "Self Delivery"
        : `Platform Delivery${data.deliveryProvider ? ` (${data.deliveryProvider})` : ""}`;
    doc.font(FONT.regular).fontSize(7).fillColor(COLORS.muted);
    doc.text("Service:", M + 10, y + 20);
    doc.font(FONT.bold).fontSize(7.5).fillColor(COLORS.text);
    doc.text(delLabel, M + 52, y + 20, { width: CONTENT_W - 68 });

    doc.font(FONT.regular).fontSize(7).fillColor(COLORS.muted);
    doc.text("Payment:", M + 10, y + 33);
    doc.font(FONT.bold).fontSize(7.5).fillColor(data.isPaid ? COLORS.success : COLORS.text);
    doc.text(data.isPaid ? "Paid" : "Cash on Delivery (COD)", M + 52, y + 33, { width: CONTENT_W - 68 });

    doc.font(FONT.regular).fontSize(7).fillColor(COLORS.muted);
    doc.text("Amount:", midX + 6, y + 33);
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.primary);
    doc.text(currencyShort(data.grandTotal), midX + 52, y + 33, { width: CONTENT_W - midX - 58, align: "right" });

    y += delH + 8;

    // ── 6. QR CODE + BARCODE (side-by-side) ─────────────────────────────
    const codeY = y;
    const codeSectionH = 100;

    // QR Code (left)
    const qrSize = 86;
    const qrX = M + Math.floor((CONTENT_W / 2 - qrSize) / 2);
    try {
        doc.image(qrBuffer, qrX, codeY + 4, { fit: [qrSize, qrSize] });
    } catch {
        // fallback: skip QR
    }

    doc.font(FONT.regular).fontSize(5.5).fillColor(COLORS.muted);
    doc.text("Scan to track", qrX, codeY + qrSize + 6, { width: qrSize, align: "center" });

    // Barcode (right side)
    const barX = M + CONTENT_W / 2 + 4;
    const barW = CONTENT_W / 2 - 12;
    const barH = 36;
    const barTop = codeY + Math.floor((qrSize - barH) / 2);

    drawBarcode(doc, data.order.trackingId, barX, barTop, barW, barH);

    doc.font(FONT.bold).fontSize(7).fillColor(COLORS.text);
    doc.text(data.order.trackingId, barX, barTop + barH + 4, { width: barW, align: "center" });

    y = codeY + codeSectionH;

    // ── 7. FOOTER ────────────────────────────────────────────────────────
    const footerY = LABEL_H - M - 2;

    doc.save()
        .moveTo(M, footerY - 6)
        .lineTo(M + CONTENT_W, footerY - 6)
        .lineWidth(0.3)
        .strokeColor(COLORS.border)
        .stroke()
        .restore();

    doc.font(FONT.regular).fontSize(5.5).fillColor(COLORS.muted);
    doc.text("Scan the QR code to view shipment status.", M, footerY, {
        width: CONTENT_W, align: "center",
    });

    doc.font(FONT.regular).fontSize(5.5).fillColor(COLORS.muted);
    doc.text("Aura Marketplace  |  auramarketplace.com  |  support@auramarketplace.com", M, footerY + 9, {
        width: CONTENT_W, align: "center",
    });

    return doc;
}
