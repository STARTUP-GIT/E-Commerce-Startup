import PDFDocument from "pdfkit";
import { COLORS, FONT, MARGIN, CONTENT_W, PAGE_H, currency, safe, formatDate, formatDateTime, formatStatus, statusColor, drawRoundedRect, drawLabelValue, drawKV } from "../../shared/utils/pdfHelpers.js";
import { getPlatformBranding } from "../../platform/services/settingsService.js";

// ---------------------------------------------------------------------------
// Types — mirror the shape returned by the seller orders controller
// ---------------------------------------------------------------------------

export interface SellerInvoiceItem {
    productName: string;
    productSku?: string | null;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxAmount: number;
    discountAmount: number;
    categoryName?: string | null;
}

export interface SellerInvoiceAddress {
    fullName?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
}

export interface SellerInvoiceData {
    invoiceNumber: string;
    orderNumber: string;
    orderDate: string | Date;
    status: string;
    paymentMethod?: string | null;
    selectedDeliveryMethod?: string | null;
    deliveryMode?: string | null;
    seller: {
        shopName: string;
        businessName?: string | null;
        gstNumber?: string | null;
        gstRegistered?: boolean;
        supportEmail?: string | null;
        supportPhone?: string | null;
        logoUrl?: string | null;
        city?: string | null;
        state?: string | null;
    };
    customer: SellerInvoiceAddress & { email?: string | null };
    items: SellerInvoiceItem[];
    subtotal: number;
    packingFee: number;
    shippingAmount: number;
    taxAmount: number;
    platformCommission: number;
    grandTotal: number;
    paymentStatus?: string | null;
    trackingId?: string | null;
    deliveryProvider?: string | null;
    notes?: string | null;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function generateSellerInvoicePdf(data: SellerInvoiceData): Promise<PDFKit.PDFDocument> {
    const branding = await getPlatformBranding();
    const mktName = branding.name || branding.marketplaceName || "Marketplace";
    const domain = `${mktName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const supportEmail = `support@${domain}`;

    const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        info: {
            Title: `Invoice ${data.invoiceNumber}`,
            Author: mktName,
        },
    });

    let y = MARGIN;

    // ── 1. HEADER BAR ─────────────────────────────────────────────────────
    const headerH = 80;
    drawRoundedRect(doc, MARGIN, y, CONTENT_W, headerH, 4, COLORS.headerBg);

    doc.font(FONT.bold).fontSize(12).fillColor(COLORS.headerText);
    doc.text(mktName, MARGIN + 16, y + 16);

    doc.font(FONT.regular).fontSize(7).fillColor("#A1A1AA");
    doc.text(supportEmail, MARGIN + 16, y + 38);
    doc.text(domain, MARGIN + 16, y + 48);


    // TAX INVOICE label (center)
    doc.font(FONT.bold).fontSize(22).fillColor(COLORS.headerText);
    doc.text("TAX INVOICE", MARGIN, y + 20, { align: "center", width: CONTENT_W });

    // Seller shop info (right)
    const shopRightX = MARGIN + CONTENT_W - 180;
    if (data.seller.logoUrl) {
        try {
            doc.image(data.seller.logoUrl, MARGIN + CONTENT_W - 52, y + 12, { fit: [36, 36] });
        } catch {
            // image fetch failed — skip silently
        }
    }
    doc.font(FONT.bold).fontSize(10).fillColor(COLORS.headerText);
    doc.text(safe(data.seller.businessName, data.seller.shopName), shopRightX, y + 16, {
        width: data.seller.logoUrl ? 120 : 164,
        align: "right",
    });
    if (data.seller.supportPhone) {
        doc.font(FONT.regular).fontSize(7).fillColor("#A1A1AA");
        doc.text(data.seller.supportPhone, shopRightX, y + 32, {
            width: data.seller.logoUrl ? 120 : 164,
            align: "right",
        });
    }
    if (data.seller.supportEmail) {
        doc.font(FONT.regular).fontSize(7).fillColor("#A1A1AA");
        doc.text(data.seller.supportEmail, shopRightX, y + 44, {
            width: data.seller.logoUrl ? 120 : 164,
            align: "right",
        });
    }

    y += headerH + 16;

    // ── 2. INVOICE META + CUSTOMER (two-column) ──────────────────────────
    const colL = MARGIN;
    const colR = MARGIN + CONTENT_W / 2 + 10;
    const colW = CONTENT_W / 2 - 10;
    const metaY = y;

    // Left: Invoice details
    const labelX = colL;
    const valX = colL + 72;

    drawLabelValue(doc, labelX, valX, metaY, "Invoice #", data.invoiceNumber);
    drawLabelValue(doc, labelX, valX, metaY + 16, "Invoice Date", formatDate(data.orderDate));
    drawLabelValue(doc, labelX, valX, metaY + 32, "Order #", data.orderNumber);

    doc.font(FONT.regular).fontSize(8).fillColor(COLORS.muted);
    doc.text("Payment Status", labelX, metaY + 48);
    doc.font(FONT.bold).fontSize(8).fillColor(statusColor(data.paymentStatus || "PENDING"));
    doc.text(formatStatus(data.paymentStatus || "PENDING"), valX, metaY + 48);

    // GSTN row
    if (data.seller.gstNumber) {
        doc.font(FONT.regular).fontSize(8).fillColor(COLORS.muted);
        doc.text("GSTIN", labelX, metaY + 64);
        doc.font(FONT.bold).fontSize(8).fillColor(COLORS.text);
        doc.text(data.seller.gstNumber, valX, metaY + 64, { width: 180 });
    }

    // Right: Bill To card
    const billToY = metaY;
    const billToH = data.seller.gstNumber ? 86 : 70;
    drawRoundedRect(doc, colR, billToY, colW, billToH, 4, COLORS.cardBg, COLORS.border);

    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.muted);
    doc.text("BILL TO", colR + 12, billToY + 8);

    const custName = safe(data.customer.fullName, "Customer");
    doc.font(FONT.bold).fontSize(9).fillColor(COLORS.text);
    doc.text(custName, colR + 12, billToY + 22, { width: colW - 24 });

    doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.muted);
    let custInfoY = billToY + 34;
    if (data.customer.phone) {
        doc.text(data.customer.phone, colR + 12, custInfoY, { width: colW - 24 });
        custInfoY += 10;
    }
    if (data.customer.email) {
        doc.text(data.customer.email, colR + 12, custInfoY, { width: colW - 24 });
        custInfoY += 10;
    }
    const addrLines = [
        data.customer.addressLine1,
        data.customer.addressLine2,
        `${data.customer.city}, ${data.customer.state} ${data.customer.postalCode}`,
        data.customer.country,
    ].filter(Boolean);
    doc.text(addrLines.join(", "), colR + 12, custInfoY, { width: colW - 24 });

    y = metaY + 96;

    // ── 3. ORDER INFORMATION BAR ─────────────────────────────────────────
    const infoBarH = 44;
    drawRoundedRect(doc, MARGIN, y, CONTENT_W, infoBarH, 4, COLORS.cardBg, COLORS.border);

    const paymentLabel = data.paymentMethod === "COD" ? "Cash on Delivery" : safe(data.paymentMethod, "Online");
    const infoItems = [
        { label: "Order #", value: data.orderNumber },
        { label: "Status", value: formatStatus(data.status) },
        { label: "Payment", value: paymentLabel },
        { label: "Delivery", value: safe(data.selectedDeliveryMethod, "Standard") },
    ];

    const infoColW = CONTENT_W / infoItems.length;
    infoItems.forEach((item, i) => {
        const ix = MARGIN + i * infoColW + 12;
        doc.font(FONT.regular).fontSize(6.5).fillColor(COLORS.muted);
        doc.text(item.label.toUpperCase(), ix, y + 9, { width: infoColW - 20, lineBreak: false });
        doc.font(FONT.bold).fontSize(8).fillColor(COLORS.text);
        doc.text(item.value, ix, y + 21, { width: infoColW - 20, lineBreak: false, ellipsis: true });
    });

    y += infoBarH + 16;

    // ── 4. PRODUCTS TABLE ────────────────────────────────────────────────
    const cols = [
        { header: "#",         x: MARGIN,       w: 18,  align: "center" as const },
        { header: "Product",   x: MARGIN + 18,  w: 170, align: "left"   as const },
        { header: "Category",  x: MARGIN + 188, w: 62,  align: "left"   as const },
        { header: "Qty",       x: MARGIN + 250, w: 28,  align: "center" as const },
        { header: "Unit Price",x: MARGIN + 278, w: 62,  align: "right"  as const },
        { header: "Discount",  x: MARGIN + 340, w: 50,  align: "right"  as const },
        { header: "Tax",       x: MARGIN + 390, w: 45,  align: "right"  as const },
        { header: "Subtotal",  x: MARGIN + 435, w: 60,  align: "right"  as const },
    ];
    const tableW = CONTENT_W;
    const headerRowH = 22;

    // Table header background
    drawRoundedRect(doc, MARGIN, y, tableW, headerRowH, 3, COLORS.headerBg);

    doc.font(FONT.bold).fontSize(7).fillColor(COLORS.headerText);
    cols.forEach((c) => {
        doc.text(c.header, c.x, y + 7, { width: c.w, align: c.align });
    });
    y += headerRowH;

    // Table rows
    data.items.forEach((item, idx) => {
        const hasSku = Boolean(item.productSku);
        const rowH = hasSku || item.productName.length > 35 ? 26 : 20;
        const textY = y + (hasSku ? 4 : 6);
        const centerTextY = y + Math.floor((rowH - 8) / 2);

        const bgColor = idx % 2 === 1 ? COLORS.rowAlt : COLORS.bg;
        drawRoundedRect(doc, MARGIN, y, tableW, rowH, 0, bgColor);

        doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.text);

        doc.text(String(idx + 1), cols[0].x, centerTextY, { width: cols[0].w, align: "center" });

        const prodLabel = item.variantName
            ? `${item.productName} (${item.variantName})`
            : item.productName;
        doc.text(prodLabel, cols[1].x, textY, { width: cols[1].w, align: "left", lineBreak: false });

        if (hasSku) {
            doc.font(FONT.regular).fontSize(6).fillColor(COLORS.muted);
            doc.text(`SKU: ${item.productSku}`, cols[1].x, textY + 10, { width: cols[1].w, lineBreak: false });
            doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.text);
        }

        const catName = safe(item.categoryName, "—");
        doc.text(catName, cols[2].x, centerTextY, { width: cols[2].w, align: "left" });

        doc.text(String(item.quantity), cols[3].x, centerTextY, { width: cols[3].w, align: "center" });

        doc.text(currency(item.unitPrice), cols[4].x, centerTextY, { width: cols[4].w, align: "right" });

        const discountVal = Number(item.discountAmount) || 0;
        doc.text(discountVal > 0 ? `-${currency(discountVal)}` : "—", cols[5].x, centerTextY, {
            width: cols[5].w,
            align: "right",
        });

        const taxVal = Number(item.taxAmount) || 0;
        doc.text(taxVal > 0 ? currency(taxVal) : "—", cols[6].x, centerTextY, { width: cols[6].w, align: "right" });

        doc.font(FONT.bold).fontSize(7.5);
        doc.text(currency(item.totalPrice), cols[7].x, centerTextY, { width: cols[7].w, align: "right" });
        doc.font(FONT.regular);

        doc.save().moveTo(MARGIN, y + rowH).lineTo(MARGIN + tableW, y + rowH).lineWidth(0.5).strokeColor(COLORS.border).stroke().restore();

        y += rowH;
    });

    y += 12;

    // ── 5. SUMMARY CARD ──────────────────────────────────────────────────
    const summaryW = 220;
    const summaryX = MARGIN + CONTENT_W - summaryW;
    const summaryLines = [
        { label: "Subtotal", value: currency(data.subtotal) },
        { label: "Packing Fee", value: Number(data.packingFee) > 0 ? currency(data.packingFee) : "—" },
        { label: "Shipping", value: Number(data.shippingAmount) > 0 ? currency(data.shippingAmount) : "Free" },
        { label: "Tax (GST)", value: currency(data.taxAmount) },
        { label: "Platform Commission", value: `-${currency(data.platformCommission)}` },
    ];

    const summaryLineH = 16;
    const summaryH = summaryLines.length * summaryLineH + 32;
    drawRoundedRect(doc, summaryX, y, summaryW, summaryH, 6, COLORS.cardBg, COLORS.border);

    let sy = y + 10;
    summaryLines.forEach((line, i) => {
        const isCommission = i === summaryLines.length - 1;
        doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.muted);
        doc.text(line.label, summaryX + 12, sy, { width: 100 });
        doc.font(FONT.regular).fontSize(7.5).fillColor(isCommission ? COLORS.danger : COLORS.text);
        doc.text(line.value, summaryX + 112, sy, { width: summaryW - 124, align: "right" });
        sy += summaryLineH;
    });

    // Separator
    doc.save().moveTo(summaryX + 12, sy - 4).lineTo(summaryX + summaryW - 12, sy - 4).lineWidth(0.5).strokeColor(COLORS.border).stroke().restore();

    // Grand Total
    doc.font(FONT.bold).fontSize(11).fillColor(COLORS.text);
    doc.text("Grand Total", summaryX + 12, sy + 2, { width: 100 });
    doc.font(FONT.bold).fontSize(13).fillColor(COLORS.primary);
    doc.text(currency(data.grandTotal), summaryX + 12, sy + 1, { width: summaryW - 24, align: "right" });

    y += summaryH + 16;

    // ── 6. PAYMENT + DELIVERY INFO (two-column) ─────────────────────────
    const sectionH = 68;
    const halfW = (CONTENT_W - 8) / 2;

    // Payment info card
    drawRoundedRect(doc, MARGIN, y, halfW, sectionH, 4, COLORS.cardBg, COLORS.border);
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.muted);
    doc.text("PAYMENT INFORMATION", MARGIN + 12, y + 10);

    let py = y + 24;
    drawKV(doc, MARGIN + 12, py, "Method", paymentLabel);
    py += 14;
    drawKV(doc, MARGIN + 12, py, "Status", formatStatus(data.paymentStatus || "PENDING"));

    // Delivery info card
    const delX = MARGIN + halfW + 8;
    drawRoundedRect(doc, delX, y, halfW, sectionH, 4, COLORS.cardBg, COLORS.border);
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.muted);
    doc.text("DELIVERY INFORMATION", delX + 12, y + 10);

    let dy = y + 24;
    const delMode = data.deliveryMode === "SELF" ? "Seller Delivery" : "Portal Delivery";
    drawKV(doc, delX + 12, dy, "Type", delMode);
    dy += 14;
    if (data.trackingId) {
        drawKV(doc, delX + 12, dy, "Tracking #", data.trackingId);
        dy += 14;
    }
    if (data.deliveryProvider) {
        drawKV(doc, delX + 12, dy, "Carrier", data.deliveryProvider);
    }

    y += sectionH + 16;

    // ── 7. NOTES ─────────────────────────────────────────────────────────
    const notesH = 40;
    drawRoundedRect(doc, MARGIN, y, CONTENT_W, notesH, 4, COLORS.cardBg, COLORS.border);

    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.muted);
    doc.text("NOTE", MARGIN + 12, y + 10);

    const noteText = data.notes || `Thank you for your order. For any support, please contact the seller directly or reach out to ${mktName} at ${supportEmail}`;
    doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.text);
    doc.text(noteText, MARGIN + 12, y + 24, { width: CONTENT_W - 24 });

    y += notesH + 20;

    // ── 8. FOOTER ────────────────────────────────────────────────────────
    const footerY = PAGE_H - MARGIN + 10;

    doc.save()
        .moveTo(MARGIN, footerY - 8)
        .lineTo(MARGIN + CONTENT_W, footerY - 8)
        .lineWidth(0.3)
        .strokeColor(COLORS.border)
        .stroke()
        .restore();

    doc.font(FONT.italic).fontSize(6.5).fillColor(COLORS.muted);
    doc.text("This is a computer generated invoice. No signature required.", MARGIN, footerY, {
        width: 220,
        lineBreak: false,
    });

    doc.font(FONT.regular).fontSize(6.5);
    doc.text("Privacy Policy  |  Terms of Service", MARGIN + (CONTENT_W - 160) / 2, footerY, {
        width: 160,
        align: "center",
    });

    doc.text(domain, MARGIN + CONTENT_W - 120, footerY, {
        width: 120,
        align: "right",
    });

    doc.font(FONT.regular).fontSize(6).fillColor(COLORS.muted);
    doc.text(`${mktName} Pvt. Ltd.`, MARGIN, footerY + 11, { width: 220 });

    return doc;
}

