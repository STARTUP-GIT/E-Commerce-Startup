'use client';

import React, { useState } from 'react';
import { useOrder } from '../hooks/useOrder';
import { orderService } from '../services/orderService';
import { productListService } from '../../products/product-list/services/productListService';
import { ReviewFormModal } from '../../reviews/ui/ReviewFormModal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { Calendar, MapPin, ClipboardList, Download, XOctagon, CheckCircle2, Store, Package } from 'lucide-react';
import Link from 'next/link';

import { useConfirmStore } from '@/lib/store/confirmStore';

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const showConfirm = useConfirmStore((state) => state.showConfirm);
  const {
    order,
    isOrderLoading,
    isOrderError,
    cancelOrder,
    isCancelling,
    confirmDelivery,
    isConfirmingDelivery,
    downloadInvoice,
    isDownloadingInvoice,
  } = useOrder(orderId);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeReviewItem, setActiveReviewItem] = useState<{ productId: string; productName: string; orderItemId: string } | null>(null);

  if (isOrderLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isOrderError || !order) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center space-y-4">
        <p className="text-destructive font-semibold">Failed to load order details.</p>
        <Link href="/orders">
          <Button>Back to Orders</Button>
        </Link>
      </div>
    );
  }

  const handleCancelOrder = () => {
    showConfirm({
      title: 'Cancel Order',
      message: 'Are you sure you want to cancel this order? This action is permanent.',
      confirmText: 'Yes, Cancel',
      onConfirm: () => {
        cancelOrder(order.id);
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-wider">{order.orderNumber}</h1>
            <Badge variant={orderService.getStatusBadgeVariant(order.status)}>
              {orderService.formatStatus(order.status)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Placed on {new Date(order.placedAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {order.status === 'PENDING' && (
            <Button
              variant="outline"
              onClick={handleCancelOrder}
              isLoading={isCancelling}
              className="text-xs border-red-500/20 text-red-500 hover:bg-red-500/10 cursor-pointer"
            >
              <XOctagon className="h-3.5 w-3.5 mr-1" />
              Cancel Order
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => downloadInvoice(order.id)}
            isLoading={isDownloadingInvoice}
            className="text-xs flex items-center gap-1.5 cursor-pointer border border-border"
          >
            <Download className="h-3.5 w-3.5" />
            Download Invoice
          </Button>
        </div>
      </div>

      {/* Main Grid: Details */}
      <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start">
        {/* Left Column: Vendor items & Tracking timeline */}
        <div className="space-y-6">
          {/* Vendor specific suborders */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Shipment Items
            </h3>
            {order.sellerOrders?.map((sellerOrder) => (
              <Card key={sellerOrder.id} className="overflow-hidden border-border bg-card">
                {/* Seller order sub-header */}
                <div className="bg-zinc-950/40 p-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Store className="h-4 w-4 text-primary" />
                    {sellerOrder.seller?.shop ? (
                      <Link
                        href={`/shops/${sellerOrder.seller.shop.slug}`}
                        className="font-bold hover:underline"
                      >
                        {sellerOrder.seller.shop.name}
                      </Link>
                    ) : (
                      <span className="font-bold">
                        {sellerOrder.seller?.firstName} {sellerOrder.seller?.lastName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={orderService.getStatusBadgeVariant(sellerOrder.status)}>
                      {orderService.formatStatus(sellerOrder.status)}
                    </Badge>
                    {sellerOrder.status === 'SHIPPED' && (
                      <Button
                        size="sm"
                        onClick={() => confirmDelivery(sellerOrder.id)}
                        isLoading={isConfirmingDelivery}
                        className="text-[10px] h-7 px-2 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Confirm Delivery
                      </Button>
                    )}
                  </div>
                </div>

                {/* Items loop */}
                <div className="divide-y divide-border">
                  {sellerOrder.items?.map((item) => (
                    <div key={item.id} className="p-4 flex gap-4 items-center">
                      <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center border border-border">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-sm text-foreground truncate">
                          {item.productName}
                        </h5>
                        {item.variantName && (
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                            Option: {item.variantName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-foreground">
                          {productListService.formatPrice(item.totalPrice)}
                        </span>
                        {sellerOrder.status === 'DELIVERED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveReviewItem({
                                productId: item.productId,
                                productName: item.productName,
                                orderItemId: item.id
                              });
                              setReviewModalOpen(true);
                            }}
                            className="text-[10px] h-7 px-2 cursor-pointer border-border"
                          >
                            Review Product
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Timeline tracking */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Timeline</CardTitle>
              <CardDescription>Follow the status of your order events.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {order.timelineEvents && (order.timelineEvents as any).length > 0 ? (
                <div className="relative border-l border-border pl-6 space-y-6 ml-3">
                  {(order.timelineEvents as any).map((evt: any, idx: number) => {
                    const isLast = idx === (order.timelineEvents as any).length - 1;
                    return (
                      <div key={evt.id} className="relative">
                        {/* Circle Bullet */}
                        <div
                          className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 bg-background ${
                            isLast ? 'border-primary ring-4 ring-primary/10' : 'border-zinc-700'
                          }`}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs gap-4">
                            <span className={`font-bold ${isLast ? 'text-primary' : 'text-foreground'}`}>
                              {evt.title}
                            </span>
                            <span className="text-muted-foreground">
                              {new Date(evt.occurredAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {evt.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No status timeline events recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Address & Price Breakdown */}
        <div className="space-y-6">
          {/* Shipping Address */}
          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <span className="font-semibold text-foreground block">
                  {order.shippingAddress.fullName}
                </span>
                <p className="text-muted-foreground">{order.shippingAddress.addressLine1}</p>
                <p className="text-muted-foreground">
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.postalCode}
                </p>
                <p className="text-muted-foreground font-medium pt-1">
                  Phone: {order.shippingAddress.phone}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pricing totals */}
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm">Summary Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">
                  {productListService.formatPrice(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold text-foreground">
                  {order.shippingTotal > 0 ? productListService.formatPrice(order.shippingTotal) : 'Free'}
                </span>
              </div>
              {Number(order.discountTotal) > 0 && (
                <div className="flex justify-between text-emerald-500 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-{productListService.formatPrice(order.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxes</span>
                <span className="font-semibold text-foreground">
                  {productListService.formatPrice(order.taxTotal)}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-center text-sm font-bold">
                <span>Grand Total</span>
                <span className="text-base text-primary">
                  {productListService.formatPrice(order.grandTotal)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Review Modal */}
      {activeReviewItem && (
        <ReviewFormModal
          productId={activeReviewItem.productId}
          productName={activeReviewItem.productName}
          orderItemId={activeReviewItem.orderItemId}
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setActiveReviewItem(null);
          }}
        />
      )}
    </div>
  );
}
