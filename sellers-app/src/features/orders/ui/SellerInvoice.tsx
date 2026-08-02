import React from 'react';
import { sellerInvoiceService } from '../services/sellerInvoiceService';
import { productService } from '@/features/products/services/productService';
import type { SellerOrder } from '../api/ordersApi';

export interface SellerInvoiceProps {
  order: SellerOrder;
  className?: string;
}

function RowLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 ${className}`}>
      {children}
    </span>
  );
}

function RowValue({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`block text-xs sm:text-sm font-semibold text-zinc-900 mt-0.5 min-w-0 break-words ${className}`}>
      {children}
    </span>
  );
}

export function SellerInvoice({ order, className = '' }: SellerInvoiceProps) {
  const shop = order.seller?.shop;
  const shipping = order.order.shippingAddress;
  const invoiceNo = sellerInvoiceService.invoiceNumber(order);
  const paymentStatus = sellerInvoiceService.paymentStatus(order);
  const paymentLabel = sellerInvoiceService.paymentLabel(order);
  const deliveryLabel = sellerInvoiceService.deliveryLabel(order);
  const grandTotal = Number(order.totalPrice) || 0;

  return (
    <div
      id="seller-invoice-print"
      className={`bg-white text-zinc-900 rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:overflow-visible print:bg-white ${className}`}
    >
      {/* Header */}
      <div className="bg-zinc-900 text-white px-6 py-5 md:px-8 print:bg-zinc-900">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xl font-extrabold tracking-tight">
              AURA <span className="font-medium text-zinc-400">Marketplace</span>
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">support@auramarketplace.com</p>
            <p className="text-[11px] text-zinc-400">auramarketplace.com</p>
          </div>
          <div className="text-left md:text-center">
            <p className="text-2xl font-extrabold tracking-[0.2em] uppercase">Tax Invoice</p>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-1">
              GST Invoice · {shop?.gstRegistered ? 'Registered' : 'Unregistered'}
            </p>
          </div>
          <div className="text-left md:text-right min-w-0">
            <p className="text-sm font-bold break-words">{shop?.businessName || shop?.name || 'Seller'}</p>
            {shop?.gstNumber && (
              <p className="text-[11px] text-zinc-300 mt-0.5 tracking-wider">
                <span className="text-zinc-500">GSTIN:</span> {shop.gstNumber}
              </p>
            )}
            {shop?.supportPhone && <p className="text-[11px] text-zinc-400 mt-0.5">{shop.supportPhone}</p>}
            {shop?.supportEmail && <p className="text-[11px] text-zinc-400 break-words">{shop.supportEmail}</p>}
          </div>
        </div>
      </div>

      <div className="px-5 py-6 md:px-8 space-y-6 print:space-y-4">
        {/* Invoice meta + Bill To */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 print-avoid-break">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1 min-w-0">
            <div>
              <RowLabel>Invoice #</RowLabel>
              <RowValue>{invoiceNo}</RowValue>
            </div>
            <div>
              <RowLabel>Invoice Date</RowLabel>
              <RowValue>{sellerInvoiceService.formatDateTime(order.createdAt)}</RowValue>
            </div>
            <div>
              <RowLabel>Order #</RowLabel>
              <RowValue>{order.order.orderNumber}</RowValue>
            </div>
            <div>
              <RowLabel>Payment Status</RowLabel>
              <RowValue className="text-emerald-700">{sellerInvoiceService.formatStatus(paymentStatus)}</RowValue>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 print:border-zinc-300 print:bg-zinc-50 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Bill To</p>
            <p className="mt-2 text-sm font-bold text-zinc-900 break-words">
              {shipping?.fullName || 'Customer'}
            </p>
            <div className="mt-1 space-y-0.5 text-xs text-zinc-600 leading-relaxed break-words">
              {shipping?.phone && <p>{shipping.phone}</p>}
              {order.order.customerEmail && <p className="break-words">{order.order.customerEmail}</p>}
              {shipping?.addressLine1 && <p>{shipping.addressLine1}</p>}
              {shipping?.addressLine2 && <p>{shipping.addressLine2}</p>}
              {shipping?.city && (
                <p>
                  {shipping.city}
                  {shipping.state ? `, ${shipping.state}` : ''} {shipping.postalCode || ''}
                </p>
              )}
              {shipping?.country && <p className="text-[10px] uppercase text-zinc-500">{shipping.country}</p>}
            </div>
          </div>
        </div>

        {/* Place of supply + order info */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 md:grid-cols-4 print-avoid-break print:border-zinc-300 print:bg-zinc-50">
          <div className="min-w-0">
            <RowLabel>Place of Supply</RowLabel>
            <RowValue className="text-xs sm:text-sm">{shipping?.state || 'N/A'}</RowValue>
          </div>
          <div className="min-w-0">
            <RowLabel>Status</RowLabel>
            <RowValue className="text-xs sm:text-sm">{sellerInvoiceService.formatStatus(order.status)}</RowValue>
          </div>
          <div className="min-w-0">
            <RowLabel>Payment</RowLabel>
            <RowValue className="text-xs sm:text-sm">{paymentLabel}</RowValue>
          </div>
          <div className="min-w-0">
            <RowLabel>Delivery</RowLabel>
            <RowValue className="text-xs sm:text-sm">{deliveryLabel}</RowValue>
          </div>
        </div>

        {/* Items table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 print:overflow-visible print:border-zinc-300 print-avoid-break">
          <table className="w-full min-w-[560px] text-left print:min-w-0 print:w-full">
            <thead>
              <tr className="bg-zinc-900 text-white print:bg-zinc-900">
                <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide">#</th>
                <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide">Item</th>
                <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide">HSN/SAC</th>
                <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-right">Qty</th>
                <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-right">Rate</th>
                <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-right">Tax</th>
                <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={item.id} className={`print:break-inside-avoid ${idx % 2 === 1 ? 'bg-zinc-50' : 'bg-white'}`}>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{idx + 1}</td>
                  <td className="px-3 py-2.5 min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 break-words">
                      {item.product?.name || item.productName || 'Product'}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-[10px] text-zinc-400 mt-0.5">{item.quantity} × {productService.formatPrice(Number(item.unitPrice))}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">—</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-700 text-right">{item.quantity}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-700 text-right">
                    {productService.formatPrice(Number(item.unitPrice))}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-700 text-right">—</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-zinc-900 text-right">
                    {productService.formatPrice(Number(item.totalPrice))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary + amount in words */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-end print-avoid-break">
          <div className="md:flex-1 rounded-xl border border-zinc-200 bg-zinc-50 p-4 print:border-zinc-300 print:bg-zinc-50 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Amount in Words</p>
            <p className="mt-1.5 text-xs sm:text-sm font-medium text-zinc-700 leading-relaxed break-words">
              {sellerInvoiceService.amountInWords(grandTotal)}
            </p>
          </div>
          <div className="w-full md:w-72 space-y-1.5 text-xs sm:text-sm min-w-0">
            <div className="flex justify-between gap-4 text-zinc-600">
              <span className="shrink-0">Subtotal</span>
              <span className="font-semibold text-zinc-800 text-right break-words">{productService.formatPrice(Number(order.subtotal))}</span>
            </div>
            {Number(order.packingFee) > 0 && (
              <div className="flex justify-between gap-4 text-zinc-600">
                <span className="shrink-0">Packing Fee</span>
                <span className="font-semibold text-zinc-800 text-right">{productService.formatPrice(Number(order.packingFee))}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 text-zinc-600">
              <span className="shrink-0">Shipping</span>
              <span className="font-semibold text-zinc-800 text-right">
                {Number(order.shippingAmount) > 0
                  ? productService.formatPrice(Number(order.shippingAmount))
                  : 'Free'}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-zinc-600">
              <span className="shrink-0">Tax (GST)</span>
              <span className="font-semibold text-zinc-800 text-right">{productService.formatPrice(Number(order.taxAmount))}</span>
            </div>
            <div className="flex justify-between gap-4 text-zinc-600">
              <span className="shrink-0">Platform Commission</span>
              <span className="font-semibold text-rose-600 text-right">
                -{productService.formatPrice(Number(order.platformCommission))}
              </span>
            </div>
            <div className="mt-2 flex justify-between gap-4 border-t border-zinc-200 pt-2.5 text-sm">
              <span className="font-bold text-zinc-900 shrink-0">Grand Total</span>
              <span className="font-extrabold text-purple-700 text-right break-words">
                {productService.formatPrice(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment + Delivery */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 print-avoid-break">
          <div className="rounded-xl border border-zinc-200 p-4 print:border-zinc-300 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Payment Information
            </p>
            <div className="mt-2 space-y-1 text-xs text-zinc-700">
              <p>
                <span className="text-zinc-500">Method:</span>{' '}
                <span className="font-semibold text-zinc-900">{paymentLabel}</span>
              </p>
              <p>
                <span className="text-zinc-500">Status:</span>{' '}
                <span className="font-semibold text-zinc-900">{sellerInvoiceService.formatStatus(paymentStatus)}</span>
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 print:border-zinc-300 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Delivery Information
            </p>
            <div className="mt-2 space-y-1 text-xs text-zinc-700">
              <p>
                <span className="text-zinc-500">Type:</span>{' '}
                <span className="font-semibold text-zinc-900">{deliveryLabel}</span>
              </p>
              {order.delivery?.deliveryNumber && (
                <p>
                  <span className="text-zinc-500">Tracking #:</span>{' '}
                  <span className="font-semibold text-zinc-900 break-words">{order.delivery.deliveryNumber}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Note + footer */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 print:border-zinc-300 print:bg-zinc-50 print-avoid-break">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Note</p>
          <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
            Thank you for your order. For any support, please contact the seller directly or reach
            out to Aura Marketplace at support@auramarketplace.com.
          </p>
        </div>

        <div className="border-t border-zinc-200 pt-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between text-[10px] text-zinc-500 print:border-zinc-300">
          <p>This is a computer generated invoice. No signature required.</p>
          <p>Aura Marketplace Pvt. Ltd.  |  auramarketplace.com</p>
        </div>
      </div>
    </div>
  );
}
