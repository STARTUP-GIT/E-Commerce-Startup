"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cityApi } from '@/features/cities/api/cityApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { MessageSquare, Filter, Search, User, Store, Check, X, Clock, ThumbsUp, AlertCircle } from 'lucide-react';

export default function LocationRequestsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const [requestType, setRequestType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['location-requests', { requestType, status, search }],
    queryFn: () => cityApi.listLocationRequests({
      requestType: requestType || undefined,
      status: status || undefined,
      search: search || undefined,
    }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['location-requests-summary'],
    queryFn: cityApi.getLocationRequestsSummary,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, adminNotes, priority }: any) =>
      cityApi.updateLocationRequest(id, { status, adminNotes, priority }),
    onSuccess: () => {
      showToast('Location request updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['location-requests'] });
      queryClient.invalidateQueries({ queryKey: ['location-requests-summary'] });
      setSelectedRequest(null);
    },
    onError: (err: any) => showToast(err.message || 'Failed to update request', 'error'),
  });

  const requests = data?.requests || [];
  const counts = data?.counts || { total: 0, pending: 0, reviewed: 0, approvedForFuture: 0, rejected: 0 };
  const topSummaries = summaryData?.summary || [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2.5">
            <MessageSquare className="h-6 w-6 text-purple-400" />
            Location & Launch Requests
          </h1>
          <p className="text-xs text-white/45 mt-1">
            Review customer and seller demand across unlaunched districts and cities
          </p>
        </div>
      </div>

      {/* Top Demand Summary Bar */}
      {topSummaries.length > 0 && (
        <Card className="border border-purple-500/20 bg-purple-500/[0.03]">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block mb-2">
              🔥 Top Requested Unsupported Areas
            </span>
            <div className="flex flex-wrap gap-2">
              {topSummaries.slice(0, 6).map((item: any, i: number) => (
                <div
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center gap-2"
                >
                  <span className="font-bold text-white">{item.district}</span>
                  <span className="text-[10px] text-white/40 font-mono">({item.state})</span>
                  <Badge variant="secondary" className="text-[9px] py-0 px-1.5 bg-purple-500/20 text-purple-200">
                    {item.total} requests
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01]">
          <span className="text-[10px] text-white/40 uppercase font-bold block">Total</span>
          <span className="text-xl font-black text-white mt-1 block">{counts.total}</span>
        </div>
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <span className="text-[10px] text-amber-300/60 uppercase font-bold block">Pending</span>
          <span className="text-xl font-black text-amber-400 mt-1 block">{counts.pending}</span>
        </div>
        <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <span className="text-[10px] text-blue-300/60 uppercase font-bold block">Reviewed</span>
          <span className="text-xl font-black text-blue-400 mt-1 block">{counts.reviewed}</span>
        </div>
        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <span className="text-[10px] text-emerald-300/60 uppercase font-bold block">Approved for Launch</span>
          <span className="text-xl font-black text-emerald-400 mt-1 block">{counts.approvedForFuture}</span>
        </div>
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
          <span className="text-[10px] text-rose-300/60 uppercase font-bold block">Rejected</span>
          <span className="text-xl font-black text-rose-400 mt-1 block">{counts.rejected}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, phone, city or district..."
            className="pl-9"
          />
        </div>

        <select
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
          className="bg-[#14141f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
        >
          <option value="">All Requesters (Customer & Seller)</option>
          <option value="CUSTOMER">Customer Requests</option>
          <option value="SELLER">Seller Requests</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-[#14141f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="APPROVED_FOR_FUTURE">Approved for Launch</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Requests Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <MessageSquare className="h-10 w-10 text-white/15 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white/70">No location requests found</h3>
          <p className="text-xs text-white/40 mt-1">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => {
            const isCustomer = req.requestType === 'CUSTOMER';
            const userAccount = isCustomer ? req.customer : req.seller;

            return (
              <Card key={req.id} className="border border-white/10 bg-white/[0.01] hover:border-white/20 transition-all">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={isCustomer ? 'default' : 'warning'} className="text-[8px] py-0.5">
                        {isCustomer ? <User className="mr-1 h-2.5 w-2.5" /> : <Store className="mr-1 h-2.5 w-2.5" />}
                        {req.requestType}
                      </Badge>
                      <span className="text-xs font-bold text-white">
                        {req.name || (userAccount ? `${userAccount.firstName} ${userAccount.lastName || ''}` : 'Guest Requester')}
                      </span>
                      <span className="text-[10px] text-white/40">•</span>
                      <span className="text-xs font-mono font-bold text-purple-300">
                        {req.city || req.district}, {req.state}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/50">
                      {req.email && <span>Email: <strong className="text-white/70">{req.email}</strong></span>}
                      {req.phone && <span>Phone: <strong className="text-white/70">{req.phone}</strong></span>}
                      {req.postalCode && <span>PIN: <strong className="text-white/70">{req.postalCode}</strong></span>}
                      <span>Requested: {new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>

                    {req.adminNotes && (
                      <p className="text-[11px] text-amber-300/80 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 max-w-xl">
                        <strong>Admin Note:</strong> {req.adminNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={req.status}
                      onChange={(e) => updateMutation.mutate({ id: req.id, status: e.target.value })}
                      className="bg-[#14141f] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-bold"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="REVIEWED">REVIEWED</option>
                      <option value="APPROVED_FOR_FUTURE">APPROVE FOR FUTURE</option>
                      <option value="REJECTED">REJECT</option>
                    </select>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-white/60 hover:text-white"
                      onClick={() => {
                        setSelectedRequest(req);
                        setAdminNotes(req.adminNotes || '');
                      }}
                    >
                      Add Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Note Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0f0f18] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Admin Note</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-white/40 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-white/50">
              Note for {selectedRequest.city || selectedRequest.district}, {selectedRequest.state} request
            </p>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. High demand from local artisans; prioritize in Q1 2027 rollout..."
              className="w-full bg-[#14141f] border border-white/10 rounded-xl p-3 text-xs text-white outline-none min-h-[90px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(null)}>Cancel</Button>
              <Button
                size="sm"
                isLoading={updateMutation.isPending}
                onClick={() => updateMutation.mutate({
                  id: selectedRequest.id,
                  status: selectedRequest.status,
                  adminNotes
                })}
              >
                Save Note
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
