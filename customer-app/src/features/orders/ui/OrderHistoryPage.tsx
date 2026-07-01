'use client';

import React from 'react';
import { useOrder } from '../hooks/useOrder';
import { orderService } from '../services/orderService';
import { productListService } from '../../products/product-list/services/productListService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { ClipboardList, Calendar, DollarSign, ArrowRight, Package } from 'lucide-react';
import Link from 'next/link';

export function OrderHistoryPage() {
  const { orders, isOrdersLoading, downloadInvoice } = useOrder();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Title */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-zinc-400 bg-clip-text text-transparent">
          Order History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track active shipments, view invoices, or verify delivered packages.
        </p>
      </div>

      {isOrdersLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            // Count total items
            const totalItemsCount = order.sellerOrders?.reduce(
              (acc, so) => acc + so.items.reduce((sum, item) => sum + item.quantity, 0),
              0
            ) || 0;

            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-extrabold text-base tracking-wider text-foreground">
                        {order.orderNumber}
                      </span>
                      <Badge variant={orderService.getStatusBadgeVariant(order.status)}>
                        {orderService.formatStatus(order.status)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Placed: {new Date(order.placedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        <span>
                          {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>Total: {productListService.formatPrice(order.grandTotal)}</span>
                      </div>
                    </div>

                    {/* Quick items list */}
                    <div className="text-xs text-muted-foreground pt-1 line-clamp-1 max-w-2xl">
                      {order.sellerOrders?.flatMap((so) => so.items.map((it) => it.productName)).join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadInvoice(order.id)}
                      className="text-xs cursor-pointer border-border"
                    >
                      Invoice
                    </Button>
                    <Link href={`/orders/${order.id}`}>
                      <Button size="sm" className="flex items-center gap-1 cursor-pointer">
                        Details
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl max-w-md mx-auto">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h4 className="text-base font-bold text-foreground">No orders placed</h4>
          <p className="text-sm text-muted-foreground mt-1 px-4">
            You haven&apos;t placed any orders on the marketplace yet.
          </p>
          <Link href="/products" className="inline-block mt-4">
            <Button className="cursor-pointer">Start Shopping</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
