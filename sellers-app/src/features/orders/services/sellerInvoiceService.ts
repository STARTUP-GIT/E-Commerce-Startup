import type { SellerOrder } from '../api/ordersApi';

const PAYMENT_CODES = new Set(['COD']);

export const sellerInvoiceService = {
  invoiceNumber: (order: SellerOrder): string => {
    return `INV-${order.order.orderNumber}`;
  },

  formatDate: (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  },

  formatStatus: (status: string): string => {
    return status
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  },

  paymentStatus: (order: SellerOrder): string => {
    const payment = order?.order?.payments?.[0];
    if (payment?.status) return payment.status;
    if (order?.order?.codCollected) return 'PAID';
    return 'PENDING';
  },
  paymentLabel: (order: SellerOrder): string => {
    const method = order.paymentMethod || order.order.paymentMethod || '';
    if (PAYMENT_CODES.has(method)) return 'Cash on Delivery';
    return method || 'Online';
  },

  deliveryLabel: (order: SellerOrder): string => {
    const method = (order.selectedDeliveryMethod || '').toUpperCase();
    if (method === 'SELF_DELIVERY' || order.deliveryMode === 'SELF') return 'Seller Delivery';
    return 'Portal Delivery';
  },

  formatDateTime: (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  amountInWords: (amount: number): string => {
    const value = Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
    const rupees = Math.floor(value);
    const paise = Math.round((value - rupees) * 100);

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const twoDigits = (n: number): string => {
      if (n < 20) return ones[n];
      return tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : '');
    };

    const threeDigits = (n: number): string => {
      const parts: string[] = [];
      const h = Math.floor(n / 100);
      if (h) parts.push(`${ones[h]} Hundred`);
      const rest = n % 100;
      if (rest) parts.push(twoDigits(rest));
      return parts.join(' ');
    };

    const indianWords = (n: number): string => {
      if (n === 0) return 'Zero';
      const parts: string[] = [];
      const crore = Math.floor(n / 10000000);
      const lakh = Math.floor((n % 10000000) / 100000);
      const thousand = Math.floor((n % 100000) / 1000);
      const rest = n % 1000;
      if (crore) parts.push(`${indianWords(crore)} Crore`);
      if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
      if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
      if (rest) parts.push(threeDigits(rest));
      return parts.join(' ');
    };

    let words = `${indianWords(rupees)} Rupees`;
    if (paise > 0) words += ` and ${twoDigits(paise)} Paise`;
    return `${words} Only`;
  },
};
