import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { COLORS, FONT, safe, formatDate, currencyShort } from "../../shared/utils/pdfHelpers.js";
import { getPlatformBranding } from "../../platform/services/settingsService.js";

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
// Barcode — CODE39 encoder & centered renderer
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

function drawCenteredBarcode(
    doc: PDFKit.PDFDocument,
    text: string,
    centerX: number,
    y: number,
    maxWidth: number,
    height: number
) {
    const cleanText = text.toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, '');
    const encoded = '*' + cleanText + '*';

    let totalUnits = 0;
    const charPatterns: string[] = [];

    for (let i = 0; i < encoded.length; i++) {
        const char = encoded[i];
        const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['*'];
        charPatterns.push(pattern);
        for (const bit of pattern) {
            totalUnits += bit === '1' ? 2.2 : 1;
        }
        if (i < encoded.length - 1) {
            totalUnits += 1; // inter-character gap
        }
    }

    const unitWidth = Math.min(maxWidth / totalUnits, 1.1);
    const actualWidth = totalUnits * unitWidth;
    let cx = centerX - actualWidth / 2;

    for (let i = 0; i < charPatterns.length; i++) {
        const pattern = charPatterns[i];
        for (let b = 0; b < pattern.length; b++) {
            const isBar = b % 2 === 0;
            const w = (pattern[b] === '1' ? 2.2 : 1) * unitWidth;
            if (isBar) {
                doc.save();
                doc.rect(cx, y, w, height);
                doc.fill("#09090B");
                doc.restore();
            }
            cx += w;
        }
        if (i < charPatterns.length - 1) {
            cx += 1 * unitWidth; // gap between characters
        }
    }
}

// Helper: Horizontal Divider Line
function drawDivider(doc: PDFKit.PDFDocument, y: number, left: number, width: number): number {
    doc.save()
        .moveTo(left, y)
        .lineTo(left + width, y)
        .lineWidth(0.75)
        .strokeColor("#E2E8F0")
        .stroke()
        .restore();
    return y + 7;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function generateShippingLabelPdf(data: ShippingLabelData): Promise<PDFKit.PDFDocument> {
    const branding = await getPlatformBranding();
    const mktName = branding.name || branding.marketplaceName || "Marketplace";
    const domain = `${mktName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const supportEmail = `support@${domain}`;

    const qrBuffer = await QRCode.toBuffer(`https://${domain}/track/${data.order.trackingId}`, {
        width: 140,
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
            Author: mktName,
        },
    });

    let y = M;

    // ── HEADER (Centered) ───────────────────────────────────────────────
    doc.font(FONT.bold).fontSize(12).fillColor("#09090B");
    doc.text(mktName.toUpperCase(), M, y, { align: "center", width: CONTENT_W });
    y += 14;

    doc.font(FONT.regular).fontSize(6.5).fillColor("#64748B");
    doc.text(`${domain}  •  ${supportEmail}`, M, y, { align: "center", width: CONTENT_W });
    y += 12;

    // ── DIVIDER 1 ───────────────────────────────────────────────────────
    y = drawDivider(doc, y, M, CONTENT_W);


    // ── SECTION 1: ORDER INFORMATION (2 Columns, Aligned Labels) ────────
    doc.font(FONT.bold).fontSize(7.5).fillColor("#09090B");
    doc.text("ORDER INFORMATION", M, y);
    y += 11;

    const colW = (CONTENT_W - 8) / 2;
    const leftColX = M;
    const rightColX = M + colW + 8;

    // Left Column: Order ID & Tracking ID
    doc.font(FONT.bold).fontSize(7).fillColor("#64748B");
    doc.text("Order ID:", leftColX, y, { continued: true });
    doc.font(FONT.bold).fontSize(7.5).fillColor("#09090B");
    doc.text(`  ${data.order.orderNumber}`);

    const trackingY = y + 10;
    doc.font(FONT.bold).fontSize(7).fillColor("#64748B");
    doc.text("Tracking ID:", leftColX, trackingY, { continued: true });
    doc.font(FONT.bold).fontSize(7.5).fillColor("#09090B");
    doc.text(`  ${data.order.trackingId}`);

    // Right Column: Order Date
    doc.font(FONT.bold).fontSize(7).fillColor("#64748B");
    doc.text("Order Date:", rightColX, y, { continued: true });
    doc.font(FONT.bold).fontSize(7.5).fillColor("#09090B");
    doc.text(`  ${formatDate(data.order.orderDate)}`);

    y += 24;

    // ── DIVIDER 2 ───────────────────────────────────────────────────────
    y = drawDivider(doc, y, M, CONTENT_W);

    // ── SECTION 2: SHIP TO ───────────────────────────────────────────────
    doc.font(FONT.bold).fontSize(7.5).fillColor("#09090B");
    doc.text("SHIP TO", M, y);
    y += 11;

    const c = data.customer;
    const custName = c.fullName || "Customer";
    doc.font(FONT.bold).fontSize(8.5).fillColor("#09090B");
    doc.text(custName, M, y, { width: CONTENT_W });
    y += doc.heightOfString(custName, { width: CONTENT_W }) + 2;

    doc.font(FONT.regular).fontSize(7.5).fillColor("#334155");
    
    if (c.addressLine1) {
        doc.text(c.addressLine1, M, y, { width: CONTENT_W, lineGap: 1 });
        y += doc.heightOfString(c.addressLine1, { width: CONTENT_W, lineGap: 1 }) + 1;
    }

    if (c.addressLine2) {
        doc.text(c.addressLine2, M, y, { width: CONTENT_W, lineGap: 1 });
        y += doc.heightOfString(c.addressLine2, { width: CONTENT_W, lineGap: 1 }) + 1;
    }

    const cityStatePin = `${c.city}, ${c.state} - ${c.postalCode}`;
    doc.text(cityStatePin, M, y, { width: CONTENT_W });
    y += doc.heightOfString(cityStatePin, { width: CONTENT_W }) + 2;

    doc.font(FONT.bold).fontSize(7).fillColor("#64748B");
    doc.text("Phone: ", M, y, { continued: true });
    doc.font(FONT.regular).fontSize(7.5).fillColor("#09090B");
    doc.text(c.phone || "—");
    y += 11;

    // ── DIVIDER 3 ───────────────────────────────────────────────────────
    y = drawDivider(doc, y, M, CONTENT_W);

    // ── SECTION 3: SOLD BY ───────────────────────────────────────────────
    doc.font(FONT.bold).fontSize(7.5).fillColor("#09090B");
    doc.text("SOLD BY", M, y);
    y += 11;

    const shopName = safe(data.seller.shopName, "Seller");
    doc.font(FONT.bold).fontSize(8).fillColor("#09090B");
    doc.text(shopName, M, y, { width: CONTENT_W });
    y += doc.heightOfString(shopName, { width: CONTENT_W }) + 2;

    const sellerCity = safe(data.seller.city, "-");
    doc.font(FONT.regular).fontSize(7.5).fillColor("#334155");
    doc.text(sellerCity, M, y, { width: CONTENT_W });
    y += doc.heightOfString(sellerCity, { width: CONTENT_W }) + 1;

    const sellerState = safe(data.seller.state, "-");
    doc.text(sellerState, M, y, { width: CONTENT_W });
    y += doc.heightOfString(sellerState, { width: CONTENT_W }) + 3;

    // ── DIVIDER 4 ───────────────────────────────────────────────────────
    y = drawDivider(doc, y, M, CONTENT_W);

    // ── SECTION 4: DELIVERY INFORMATION (Each field on its own row) ─────
    doc.font(FONT.bold).fontSize(7.5).fillColor("#09090B");
    doc.text("DELIVERY INFORMATION", M, y);
    y += 11;

    // Delivery Service Row
    const delLabel = data.deliveryType === "SELF"
        ? "Self Delivery"
        : `Platform Delivery${data.deliveryProvider ? ` (${data.deliveryProvider})` : ""}`;
    doc.font(FONT.bold).fontSize(7).fillColor("#64748B");
    doc.text("Delivery Service: ", M, y, { continued: true });
    doc.font(FONT.bold).fontSize(7.5).fillColor("#09090B");
    doc.text(delLabel);
    y += 11;

    // Payment Row
    doc.font(FONT.bold).fontSize(7).fillColor("#64748B");
    doc.text("Payment: ", M, y, { continued: true });
    if (data.isPaid) {
        doc.font(FONT.bold).fontSize(7.5).fillColor("#16A34A");
        doc.text("Paid");
    } else {
        doc.font(FONT.bold).fontSize(7.5).fillColor("#DC2626");
        doc.text("Cash on Delivery (COD)");
    }
    y += 11;

    // Amount Row
    doc.font(FONT.bold).fontSize(7).fillColor("#64748B");
    doc.text("Amount: ", M, y, { continued: true });
    doc.font(FONT.bold).fontSize(8.5).fillColor("#09090B");
    doc.text(currencyShort(data.grandTotal));
    y += 12;

    // ── DIVIDER 5 ───────────────────────────────────────────────────────
    y = drawDivider(doc, y, M, CONTENT_W);

    // ── SECTION 5: QR CODE & BARCODE (2 Equal Columns, Centered) ───────
    const codeColW = CONTENT_W / 2;
    const qrCenterX = M + codeColW / 2;
    const barCenterX = M + codeColW + codeColW / 2;

    const qrSize = 64;
    const codeSectionY = y;

    // Left: QR Code centered
    const qrX = qrCenterX - qrSize / 2;
    try {
        doc.image(qrBuffer, qrX, codeSectionY, { fit: [qrSize, qrSize] });
    } catch {
        // Fallback if image buffer fails
    }

    // Right: Barcode centered
    const barWidth = codeColW - 16;
    const barHeight = 32;
    drawCenteredBarcode(doc, data.order.trackingId, barCenterX, codeSectionY + 4, barWidth, barHeight);

    // Tracking Number under barcode (centered)
    doc.font(FONT.bold).fontSize(7.5).fillColor("#09090B");
    doc.text(data.order.trackingId, M + codeColW, codeSectionY + barHeight + 8, {
        width: codeColW,
        align: "center",
    });

    y = codeSectionY + qrSize + 4;

    // ── DIVIDER 6 ───────────────────────────────────────────────────────
    y = drawDivider(doc, y, M, CONTENT_W);

    // ── FOOTER (Centered) ────────────────────────────────────────────────
    const footerY = LABEL_H - M - 16;

    doc.font(FONT.regular).fontSize(6.5).fillColor("#64748B");
    doc.text("Scan QR code to track shipment.", M, footerY, {
        width: CONTENT_W,
        align: "center",
    });

    doc.font(FONT.regular).fontSize(6).fillColor("#94A3B8");
    doc.text(`${mktName}  |  ${domain}  |  ${supportEmail}`, M, footerY + 8, {
        width: CONTENT_W,
        align: "center",
    });

    return doc;
}

