import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomOrders } from '../hooks/useCustomOrders';
import { customOrderService } from '../services/customOrderService';
import { ordersService } from '@/features/orders/services/ordersService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Search, Wrench, Eye, AlertTriangle, RefreshCw } from 'lucide-react';

export function CustomOrdersPage() {
  const { customOrders, isLoading, isError, refetch } = useCustomOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const navigate = useNavigate();

  const handleRowClick = (id: string) => {
    navigate(`/custom-orders/${id}`);
  };

  const filteredOrders = customOrders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.material && o.material.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' ? true : o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'QUOTED', 'ACCEPTED', 'CANCELLED'];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Custom Print Requests</h1>
          <p className="text-xs text-white/45">Review custom specifications, download CAD drawings/STLs, and submit quotes.</p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Search custom requests by title or material…"
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
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table */}
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
                <p className="text-sm font-semibold text-red-400">Failed to load custom requests.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mx-auto">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Retry Load
                </Button>
              </div>
            ) : filteredOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Request Title</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted Date</TableHead>
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
                        {ord.orderNumber}
                      </TableCell>
                      <TableCell className="font-semibold text-white/90 text-xs truncate max-w-[200px]">
                        {ord.title}
                      </TableCell>
                      <TableCell className="text-xs text-white/70">
                        {ord.material || 'Unspecified'}
                      </TableCell>
                      <TableCell className="text-xs text-white/70">{ord.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={customOrderService.getStatusBadgeVariant(ord.status)} className="text-[8px] py-0 px-2 font-bold">
                          {ord.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-white/50">
                        {ordersService.formatDate(ord.submittedAt)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px]"
                          onClick={() => handleRowClick(ord.id)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5 text-white/60" />
                          <span>Review Specs</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                  <Wrench className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-white/60">No requests found</h4>
                <p className="text-[10px] text-white/35 max-w-xs mx-auto leading-relaxed">
                  No custom print request tickets match your status filter or search parameters.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
