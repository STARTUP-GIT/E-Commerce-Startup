import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { ordersService } from '../services/ordersService';
import { productService } from '@/features/products/services/productService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Search, ShoppingBag, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function OrdersPage() {
  const { orders, isLoading, isError, refetch } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const navigate = useNavigate();

  const handleRowClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.order.customerEmail && o.order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' ? true : o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['ALL', 'PENDING', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Order Management</h1>
          <p className="text-xs text-white/45">Fulfill custom and catalog orders, verify packaging proofs, and update transit status.</p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Search by order number or customer email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-l border-white/5 pl-0 xl:pl-4">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`h-8 px-3 rounded-lg text-[10px] uppercase font-extrabold tracking-wide transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                    : 'text-white/45 hover:text-white/80 hover:bg-white/[0.02]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <Card className="border border-white/5">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : isError ? (
              <div className="p-12 text-center space-y-4">
                <AlertTriangle className="mx-auto h-10 w-10 text-red-400/60" />
                <p className="text-sm font-semibold text-red-400">Failed to load order records.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mx-auto">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Retry Load
                </Button>
              </div>
            ) : filteredOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Purchased Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Grand Total</TableHead>
                    <TableHead>Fulfillment Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((ord) => (
                    <TableRow
                      key={ord.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(ord.id)}
                    >
                      <TableCell className="font-bold text-white/95 text-xs">
                        {ord.order.orderNumber}
                      </TableCell>
                      <TableCell className="text-xs text-white/50">
                        {ordersService.formatDate(ord.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-white/70">
                        {ord.items.length} {ord.items.length === 1 ? 'item' : 'items'}:{' '}
                        <span className="text-[11px] text-white/40 block mt-0.5 line-clamp-1">
                          {ord.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-white/95">
                        {productService.formatPrice(ord.totalPrice)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ordersService.getStatusColor(ord.status)} className="text-[8px] py-0 px-2 font-bold">
                          {ord.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px]"
                          onClick={() => handleRowClick(ord.id)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5 text-white/60" />
                          <span>View Detail</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-white/60">No orders found</h4>
                <p className="text-[10px] text-white/35 max-w-xs mx-auto leading-relaxed">
                  No order entries match your selected status filter or search parameters.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
