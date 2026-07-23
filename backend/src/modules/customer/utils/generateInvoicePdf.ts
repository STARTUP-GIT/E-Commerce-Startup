import PDFDocument from "pdfkit";

// ---------------------------------------------------------------------------
// Types — mirror the shapes returned by the Prisma query in the controller
// ---------------------------------------------------------------------------

interface InvoiceAddress {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

interface InvoiceCustomer {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    phone?: string | null;
}

interface InvoiceSeller {
    firstName: string;
    lastName: string;
    phone?: string | null;
    shop?: {
        name: string;
        logoUrl?: string | null;
        businessName?: string | null;
        supportEmail?: string | null;
        supportPhone?: string | null;
    } | null;
    addresses?: {
        addressLine1: string;
        addressLine2?: string | null;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    }[];
}

interface InvoiceCategory {
    name: string;
}

interface InvoiceItem {
    productName: string;
    productSku: string;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxAmount: number;
    discountAmount: number;
    product?: {
        category?: InvoiceCategory | null;
    };
}

interface InvoiceSellerOrder {
    status: string;
    subtotal: number;
    shippingAmount: number;
    taxAmount: number;
    packingFee: number;
    deliveryMode: string;
    selectedDeliveryMethod?: string | null;
    seller: InvoiceSeller;
    items: InvoiceItem[];
    delivery?: {
        deliveryNumber: string;
        status: string;
        estimatedDeliveryAt?: string | null;
        deliveryPartner?: {
            firstName: string;
            lastName: string;
            vehicleType?: string | null;
            vehicleNumber?: string | null;
        } | null;
    } | null;
}

interface InvoicePayment {
    amount: number;
    status: string;
    method: string;
    gatewayPaymentId?: string | null;
    invoiceNumber?: string | null;
    paidAt?: string | null;
}

interface InvoiceOrder {
    orderNumber: string;
    status: string;
    subtotal: number;
    shippingTotal: number;
    taxTotal: number;
    discountTotal: number;
    packingFeeTotal: number;
    platformFeeTotal?: number | null;
    grandTotal: number;
    currency: string;
    paymentMethod?: string | null;
    selectedDeliveryMethod?: string | null;
    placedAt?: string | null;
    createdAt: string;
    notes?: string | null;
    marketplaceLogoUrl?: string | null;
    shippingAddress: InvoiceAddress;
    billingAddress?: InvoiceAddress | null;
    customer: InvoiceCustomer;
    sellerOrders: InvoiceSellerOrder[];
    payments: InvoicePayment[];
}

// ---------------------------------------------------------------------------
// Design tokens — shadcn / Aura inspired
// ---------------------------------------------------------------------------

const COLORS = {
    bg: "#FFFFFF",
    text: "#09090B",
    muted: "#71717A",
    border: "#E4E4E7",
    cardBg: "#FAFAFA",
    headerBg: "#18181B",
    headerText: "#FFFFFF",
    primary: "#7C3AED",
    accent: "#F4F4F5",
    rowAlt: "#F9FAFB",
    success: "#16A34A",
    warning: "#CA8A04",
    danger: "#DC2626",
} as const;

const FONT = {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
} as const;

const MARGIN = 50;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currency(n: number): string {
    return `\u20B9${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safe(v: string | null | undefined, fallback = ""): string {
    return v?.trim() || fallback;
}

function formatDate(d: string | Date | null | undefined): string {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d: string | Date | null | undefined): string {
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

function formatStatus(s: string): string {
    return s
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ");
}

function statusColor(s: string): string {
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

function drawRoundedRect(
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
        doc.stroke();
    } else if (!fill) {
        doc.fill("transparent");
    }
    doc.restore();
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateInvoicePdf(order: InvoiceOrder): PDFKit.PDFDocument {
    const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        info: {
            Title: `Invoice ${order.orderNumber}`,
            Author: "Aura Marketplace",
        },
    });

    let y = MARGIN;

    // ── Helper: page break check (disabled — single-page output) ─────────
    function ensureSpace(_needed: number) {
        // no-op: all content is drawn on a single page
    }

    // ── 1. HEADER BAR ─────────────────────────────────────────────────────
    const headerH = 80;
    drawRoundedRect(doc, MARGIN, y, CONTENT_W, headerH, 4, COLORS.headerBg);

    // Marketplace logo (left) — fallback to text if URL missing or image fails
    const marketplaceLogoUrl = order.marketplaceLogoUrl;
    if (marketplaceLogoUrl) {
        try {
            doc.image(marketplaceLogoUrl, MARGIN + 16, y + 12, { fit: [36, 36] });
        } catch {
            // image fetch failed — draw text fallback below
        }
    }
    doc.font(FONT.bold).fontSize(12).fillColor(COLORS.headerText);
    doc.text("AURA", MARGIN + 16, y + (marketplaceLogoUrl ? 52 : 16), { continued: true });
    doc.font(FONT.regular).fontSize(9).text(" Marketplace", { continued: false });

    doc.font(FONT.regular).fontSize(7).fillColor("#A1A1AA");
    doc.text("support@auramarketplace.com", MARGIN + 16, y + (marketplaceLogoUrl ? 64 : 38));
    doc.text("auramarketplace.com", MARGIN + 16, y + (marketplaceLogoUrl ? 72 : 48));

    // INVOICE label (center)
    doc.font(FONT.bold).fontSize(22).fillColor(COLORS.headerText);
    doc.text("INVOICE", MARGIN, y + 20, { align: "center", width: CONTENT_W });

    // Shop logo + info (right)
    const sellerOrder0 = order.sellerOrders[0];
    const shopName = safe(sellerOrder0?.seller?.shop?.name, "Seller");
    const shopLogoUrl = sellerOrder0?.seller?.shop?.logoUrl;
    const shopRightX = MARGIN + CONTENT_W - 180;

    if (shopLogoUrl) {
        try {
            doc.image(shopLogoUrl, MARGIN + CONTENT_W - 52, y + 12, { fit: [36, 36] });
        } catch {
            // image fetch failed — skip silently
        }
    }
    doc.font(FONT.bold).fontSize(10).fillColor(COLORS.headerText);
    doc.text(shopName, shopRightX, y + 16, {
        width: shopLogoUrl ? 120 : 164,
        align: "right",
    });
    if (sellerOrder0?.seller?.shop?.supportPhone) {
        doc.font(FONT.regular).fontSize(7).fillColor("#A1A1AA");
        doc.text(sellerOrder0.seller.shop.supportPhone, shopRightX, y + 32, {
            width: shopLogoUrl ? 120 : 164,
            align: "right",
        });
    }
    if (sellerOrder0?.seller?.shop?.supportEmail) {
        doc.font(FONT.regular).fontSize(7).fillColor("#A1A1AA");
        doc.text(sellerOrder0.seller.shop.supportEmail, shopRightX, y + 44, {
            width: shopLogoUrl ? 120 : 164,
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

    drawLabelValue(doc, labelX, valX, metaY, "Invoice #", order.orderNumber);
    drawLabelValue(doc, labelX, valX, metaY + 16, "Invoice Date", formatDate(order.createdAt));
    drawLabelValue(doc, labelX, valX, metaY + 32, "Order Date", formatDate(order.placedAt));
    drawLabelValue(doc, labelX, valX, metaY + 48, "Order #", order.orderNumber);

    const paymentStatus = order.payments?.[0]?.status || "PENDING";
    doc.font(FONT.regular).fontSize(8).fillColor(COLORS.muted);
    doc.text("Payment Status", labelX, metaY + 64);
    doc.font(FONT.bold).fontSize(8).fillColor(statusColor(paymentStatus));
    doc.text(formatStatus(paymentStatus), valX, metaY + 64);

    // Right: Bill To card
    const billToY = metaY;
    drawRoundedRect(doc, colR, billToY, colW, 86, 4, COLORS.cardBg, COLORS.border);

    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.muted);
    doc.text("BILL TO", colR + 12, billToY + 8);

    const custName = `${safe(order.customer.firstName)} ${safe(order.customer.lastName)}`.trim() || "Customer";
    doc.font(FONT.bold).fontSize(9).fillColor(COLORS.text);
    doc.text(custName, colR + 12, billToY + 22, { width: colW - 24 });

    doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.muted);
    let custInfoY = billToY + 34;
    if (order.customer.phone) {
        doc.text(order.customer.phone, colR + 12, custInfoY, { width: colW - 24 });
        custInfoY += 10;
    }
    doc.text(order.customer.email, colR + 12, custInfoY, { width: colW - 24 });
    custInfoY += 10;

    const addr = order.billingAddress || order.shippingAddress;
    if (addr) {
        const addrLines = [
            addr.addressLine1,
            addr.addressLine2,
            `${addr.city}, ${addr.state} ${addr.postalCode}`,
            addr.country,
        ].filter(Boolean);
        doc.text(addrLines.join(", "), colR + 12, custInfoY, { width: colW - 24 });
    }

    y = metaY + 96;

    // ── 3. ORDER INFORMATION BAR ─────────────────────────────────────────
    ensureSpace(52);
    const infoBarH = 44;
    drawRoundedRect(doc, MARGIN, y, CONTENT_W, infoBarH, 4, COLORS.cardBg, COLORS.border);

    const infoItems = [
        { label: "Order #", value: order.orderNumber },
        { label: "Status", value: formatStatus(order.status) },
        { label: "Payment", value: order.paymentMethod === "COD" ? "Cash on Delivery" : safe(order.paymentMethod, "Online") },
        { label: "Delivery", value: safe(order.selectedDeliveryMethod, "Standard") },
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
    ensureSpace(80);

    // Gather all items across seller orders
    const allItems: {
        item: InvoiceItem;
        vendorName: string;
    }[] = [];
    for (const so of order.sellerOrders) {
        const vName = safe(so.seller?.shop?.name, `${so.seller.firstName} ${so.seller.lastName}`);
        for (const it of so.items) {
            allItems.push({ item: it, vendorName: vName });
        }
    }

    // Table column config
    const cols = [
        { header: "#",         x: MARGIN,       w: 18,  align: "center" as const },
        { header: "Product",   x: MARGIN + 18,  w: 158, align: "left"   as const },
        { header: "Category",  x: MARGIN + 176, w: 58,  align: "left"   as const },
        { header: "Qty",       x: MARGIN + 234, w: 28,  align: "center" as const },
        { header: "Unit Price",x: MARGIN + 262, w: 62,  align: "right"  as const },
        { header: "Discount",  x: MARGIN + 324, w: 52,  align: "right"  as const },
        { header: "Tax",       x: MARGIN + 376, w: 44,  align: "right"  as const },
        { header: "Subtotal",  x: MARGIN + 420, w: 75,  align: "right"  as const },
    ];
    const tableW = CONTENT_W;
    const rowH = 18;
    const headerRowH = 22;

    // Table header background
    drawRoundedRect(doc, MARGIN, y, tableW, headerRowH, 3, COLORS.headerBg);

    // Table headers
    doc.font(FONT.bold).fontSize(7).fillColor(COLORS.headerText);
    cols.forEach((c) => {
        doc.text(c.header, c.x, y + 7, { width: c.w, align: c.align });
    });
    y += headerRowH;

    // Table rows
    allItems.forEach((entry, idx) => {
        const rowH_actual = entry.item.productName.length > 35 ? 30 : rowH;
        ensureSpace(rowH_actual + 4);

        const bgColor = idx % 2 === 1 ? COLORS.rowAlt : COLORS.bg;
        drawRoundedRect(doc, MARGIN, y, tableW, rowH_actual, 0, bgColor);

        doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.text);

        // Row number
        doc.text(String(idx + 1), cols[0].x, y + 5, { width: cols[0].w, align: "center" });

        // Product name + variant
        const prodLabel = entry.item.variantName
            ? `${entry.item.productName} (${entry.item.variantName})`
            : entry.item.productName;
        doc.text(prodLabel, cols[1].x, y + 5, { width: cols[1].w, align: "left", lineBreak: false });

        // SKU below product name
        doc.font(FONT.regular).fontSize(6).fillColor(COLORS.muted);
        doc.text(`SKU: ${entry.item.productSku}`, cols[1].x, y + 14, { width: cols[1].w });
        doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.text);

        // Category
        const catName = safe(entry.item.product?.category?.name, "—");
        doc.text(catName, cols[2].x, y + 5, { width: cols[2].w, align: "left" });

        // Qty
        doc.text(String(entry.item.quantity), cols[3].x, y + 5, { width: cols[3].w, align: "center" });

        // Unit Price
        doc.text(currency(entry.item.unitPrice), cols[4].x, y + 5, { width: cols[4].w, align: "right" });

        // Discount
        const discountVal = Number(entry.item.discountAmount) || 0;
        doc.text(discountVal > 0 ? `-${currency(discountVal)}` : "—", cols[5].x, y + 5, {
            width: cols[5].w,
            align: "right",
        });

        // Tax
        const taxVal = Number(entry.item.taxAmount) || 0;
        doc.text(taxVal > 0 ? currency(taxVal) : "—", cols[6].x, y + 5, { width: cols[6].w, align: "right" });

        // Subtotal
        doc.font(FONT.bold).fontSize(7.5);
        doc.text(currency(entry.item.totalPrice), cols[7].x, y + 5, { width: cols[7].w, align: "right" });
        doc.font(FONT.regular);

        // Row border
        doc.save().moveTo(MARGIN, y + rowH_actual).lineTo(MARGIN + tableW, y + rowH_actual).lineWidth(0.3).strokeColor(COLORS.border).stroke().restore();

        y += rowH_actual;
    });

    y += 12;

    // ── 5. SUMMARY CARD ──────────────────────────────────────────────────
    ensureSpace(120);
    const summaryW = 220;
    const summaryX = MARGIN + CONTENT_W - summaryW;
    const summaryLines = [
        { label: "Subtotal", value: currency(order.subtotal) },
        {
            label: "Discount",
            value: Number(order.discountTotal) > 0 ? `-${currency(order.discountTotal)}` : "—",
        },
        { label: "Tax (GST)", value: currency(order.taxTotal) },
        { label: "Shipping", value: Number(order.shippingTotal) > 0 ? currency(order.shippingTotal) : "Free" },
    ];
    if (Number(order.packingFeeTotal) > 0) {
        summaryLines.push({ label: "Packing Fee", value: currency(order.packingFeeTotal) });
    }
    if (Number(order.platformFeeTotal || 0) > 0) {
        summaryLines.push({ label: "Platform Fee", value: currency(order.platformFeeTotal!) });
    }

    const summaryLineH = 16;
    const summaryH = summaryLines.length * summaryLineH + 32;
    drawRoundedRect(doc, summaryX, y, summaryW, summaryH, 6, COLORS.cardBg, COLORS.border);

    let sy = y + 10;
    summaryLines.forEach((line) => {
        doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.muted);
        doc.text(line.label, summaryX + 12, sy, { width: 100 });
        doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.text);
        doc.text(line.value, summaryX + 112, sy, { width: summaryW - 124, align: "right" });
        sy += summaryLineH;
    });

    // Separator
    doc.save().moveTo(summaryX + 12, sy - 4).lineTo(summaryX + summaryW - 12, sy - 4).lineWidth(0.5).strokeColor(COLORS.border).stroke().restore();

    // Grand Total
    doc.font(FONT.bold).fontSize(11).fillColor(COLORS.text);
    doc.text("Grand Total", summaryX + 12, sy + 2, { width: 100 });
    doc.font(FONT.bold).fontSize(13).fillColor(COLORS.primary);
    doc.text(currency(order.grandTotal), summaryX + 12, sy + 1, { width: summaryW - 24, align: "right" });

    y += summaryH + 16;

    // ── 6. PAYMENT + DELIVERY INFO (two-column) ─────────────────────────
    ensureSpace(80);
    const sectionH = 68;
    const halfW = (CONTENT_W - 8) / 2;

    // Payment info card
    drawRoundedRect(doc, MARGIN, y, halfW, sectionH, 4, COLORS.cardBg, COLORS.border);
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.muted);
    doc.text("PAYMENT INFORMATION", MARGIN + 12, y + 10);

    const payment = order.payments?.[0];
    let py = y + 24;
    drawKV(doc, MARGIN + 12, py, "Method", payment?.method === "COD" ? "Cash on Delivery" : safe(payment?.method, order.paymentMethod || "Online"));
    py += 14;
    if (payment?.gatewayPaymentId) {
        drawKV(doc, MARGIN + 12, py, "Transaction ID", payment.gatewayPaymentId);
        py += 14;
    }
    if (payment?.paidAt) {
        drawKV(doc, MARGIN + 12, py, "Paid On", formatDateTime(payment.paidAt));
    }

    // Delivery info card
    const delX = MARGIN + halfW + 8;
    drawRoundedRect(doc, delX, y, halfW, sectionH, 4, COLORS.cardBg, COLORS.border);
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.muted);
    doc.text("DELIVERY INFORMATION", delX + 12, y + 10);

    let dy = y + 24;
    const delMode = order.sellerOrders[0]?.deliveryMode || "PLATFORM";
    drawKV(doc, delX + 12, dy, "Type", delMode === "PLATFORM" ? "Portal Delivery" : "Seller Delivery");
    dy += 14;

    const delivery = order.sellerOrders[0]?.delivery;
    if (delivery?.deliveryNumber) {
        drawKV(doc, delX + 12, dy, "Tracking #", delivery.deliveryNumber);
        dy += 14;
    }
    if (delivery?.deliveryPartner) {
        const dpName = `${delivery.deliveryPartner.firstName} ${delivery.deliveryPartner.lastName}`;
        drawKV(doc, delX + 12, dy, "Carrier", dpName);
        dy += 14;
    }
    if (delivery?.estimatedDeliveryAt) {
        drawKV(doc, delX + 12, dy, "Est. Delivery", formatDate(delivery.estimatedDeliveryAt));
    }

    y += sectionH + 16;

    // ── 7. NOTES ─────────────────────────────────────────────────────────
    ensureSpace(52);
    const notesH = 40;
    drawRoundedRect(doc, MARGIN, y, CONTENT_W, notesH, 4, COLORS.cardBg, COLORS.border);

    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.muted);
    doc.text("NOTE", MARGIN + 12, y + 10);

    doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.text);
    doc.text(
        "Thank you for shopping with Aura Marketplace. For any support, please contact us at support@auramarketplace.com",
        MARGIN + 12,
        y + 24,
        { width: CONTENT_W - 24 },
    );

    y += notesH + 20;

    // ── 8. FOOTER ────────────────────────────────────────────────────────
    drawFooter(doc, true);

    return doc;

    // ── Footer drawing ───────────────────────────────────────────────────
    function drawFooter(doc: PDFKit.PDFDocument, _lastPage: boolean) {
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
            width: CONTENT_W / 3,
        });

        doc.font(FONT.regular).fontSize(6.5);
        doc.text("Privacy Policy  |  Terms of Service", MARGIN + CONTENT_W / 3, footerY, {
            width: CONTENT_W / 3,
            align: "center",
        });

        doc.text("auramarketplace.com", MARGIN + (CONTENT_W / 3) * 2, footerY, {
            width: CONTENT_W / 3,
            align: "right",
        });

        doc.font(FONT.regular).fontSize(6).fillColor(COLORS.muted);
        doc.text("Aura Marketplace Pvt. Ltd.", MARGIN, footerY + 12, { width: CONTENT_W / 3 });
    }
}

// ── Label-value pair for info sections ─────────────────────────────────────
function drawLabelValue(doc: PDFKit.PDFDocument, labelX: number, valX: number, yPos: number, label: string, value: string) {
    doc.font(FONT.regular).fontSize(8).fillColor(COLORS.muted);
    doc.text(label, labelX, yPos);
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.text);
    doc.text(value, valX, yPos, { width: 200 });
}

function drawKV(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string) {
    doc.font(FONT.regular).fontSize(7).fillColor(COLORS.muted);
    doc.text(label, x, y);
    doc.font(FONT.regular).fontSize(7.5).fillColor(COLORS.text);
    doc.text(value, x + 70, y, { width: 150 });
}
