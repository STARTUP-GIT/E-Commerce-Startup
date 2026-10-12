"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Dialog, Drawer } from '@/shared/components/Dialog';
import {
  ShieldAlert,
  Search,
  Eye,
  CheckCircle,
  Clock,
  ExternalLink,
  Plus,
  X,
  MessageSquare,
  Lock,
  ArrowRight
} from 'lucide-react';

export default function CasesManagementPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Timeline Event Form
  const [eventType, setEventType] = useState('NOTE_ADDED');
  const [eventDescription, setEventDescription] = useState('');
  const [isInternal, setIsInternal] = useState(true);

  // Resolution Form
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<'RESOLVED' | 'DISMISSED' | 'ACTION_TAKEN'>('RESOLVED');
  const [resolutionOutcome, setResolutionOutcome] = useState('');

  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-cases', { page, statusFilter, search }],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/cases', {
        params: { page, limit: 20, status: statusFilter || undefined, search: search || undefined },
      });
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-case-detail', selectedCaseId],
    queryFn: async () => {
      if (!selectedCaseId) return null;
      const res = await axiosInstance.get(`/api/admin/cases/${selectedCaseId}`);
      return res.data;
    },
    enabled: !!selectedCaseId,
  });

  const addTimelineMutation = useMutation({
    mutationFn: async () => {
      if (!eventDescription.trim()) throw new Error('Description required.');
      const res = await axiosInstance.post(`/api/admin/cases/${selectedCaseId}/timeline`, {
        eventType,
        description: eventDescription.trim(),
        isInternal,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-case-detail', selectedCaseId] });
      showToast('Timeline event added to case history.', 'success');
      setEventDescription('');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to add timeline event.', 'error'),
  });

  const resolveCaseMutation = useMutation({
    mutationFn: async () => {
      if (!resolutionOutcome.trim()) throw new Error('Resolution outcome required.');
      const res = await axiosInstance.post(`/api/admin/cases/${selectedCaseId}/resolve`, {
        status: resolutionStatus,
        outcome: resolutionOutcome.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cases'] });
      queryClient.invalidateQueries({ queryKey: ['admin-case-detail', selectedCaseId] });
      showToast(`Case marked as ${resolutionStatus}.`, 'success');
      setShowResolveModal(false);
      setResolutionOutcome('');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to resolve case.', 'error'),
  });

  const reports = data?.reports ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
            Customer Reports &amp; Case Management
          </h1>
          <p className="text-xs text-white/50 mt-1">
            End-to-end incident investigations: immutable receipt timestamps, append-only timelines, evidence storage, and resolution auditing.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {['', 'PENDING', 'UNDER_REVIEW', 'INVESTIGATING', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {st === '' ? 'All Cases' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search reference, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-800 bg-slate-900/80">
              <TableHead className="text-slate-400 text-xs font-semibold">Case Reference &amp; Date</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Customer</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Target / Seller</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Reason &amp; Category</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Status &amp; Priority</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-b border-slate-800/50">
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full bg-slate-800/40" />
                  </TableCell>
                </TableRow>
              ))
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                  No cases found in this category.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((r: any) => (
                <TableRow key={r.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                  <TableCell>
                    <div className="font-mono text-xs text-white font-medium">{r.reference}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{new Date(r.createdAt).toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-white font-medium">{r.customer?.firstName} {r.customer?.lastName}</div>
                    <div className="text-[11px] text-slate-400">{r.customer?.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-slate-800 text-slate-300 text-[10px]">{r.targetType}</Badge>
                    <div className="text-xs text-slate-200 mt-0.5">{r.targetSeller?.shop?.name || r.targetSeller?.firstName || 'N/A'}</div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-xs text-white line-clamp-1">{r.reason}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">{r.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      r.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-300' :
                      r.status === 'INVESTIGATING' ? 'bg-cyan-500/10 text-cyan-300' :
                      'bg-amber-500/10 text-amber-300'
                    }>
                      {r.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCaseId(r.id)}
                      className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-xs gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Investigate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Case Investigation Drawer (Using Viewport-Aware Drawer) */}
      <Drawer
        isOpen={!!selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
        maxWidth="max-w-xl"
        title="Case File"
        subtitle={
          detailData?.report && (
            <span className="font-mono text-xs text-amber-400">{detailData.report.reference}</span>
          )
        }
      >
        {isDetailLoading ? (
          <Skeleton className="h-48 w-full bg-slate-800/40" />
        ) : detailData?.report ? (
          <div className="space-y-6">
            {/* Original Complaint */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-semibold">Original Customer Submission</span>
                <Badge className="bg-amber-500/20 text-amber-300 text-[10px]">{detailData.report.targetType}</Badge>
              </div>
              <h4 className="text-sm font-bold text-white">{detailData.report.reason}</h4>
              <p className="text-xs text-slate-300 whitespace-pre-wrap">{detailData.report.description}</p>
            </div>

            {/* Evidence Attachments */}
            {detailData.report.evidenceUrls && detailData.report.evidenceUrls.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Customer Evidence</h4>
                <div className="space-y-1.5">
                  {detailData.report.evidenceUrls.map((url: string, idx: number) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-2 rounded bg-slate-800/50 border border-slate-700/60 text-xs text-cyan-400 hover:text-cyan-300 truncate"
                    >
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Append-Only Timeline */}
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Case Investigation Timeline</h4>
              <div className="space-y-2 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-800">
                {detailData.report.timelineEvents?.map((evt: any) => (
                  <div key={evt.id} className="relative pl-7 text-xs space-y-1">
                    <div className="absolute left-1.5 top-1.5 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-amber-400 border border-slate-900" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{evt.eventType.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-500">{new Date(evt.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300">{evt.description}</p>
                    {evt.isInternal && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 font-mono">
                        <Lock className="h-2.5 w-2.5" /> Confidential Admin Note
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Event Form */}
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2 pt-3">
                <h5 className="text-[11px] font-bold text-slate-400 uppercase">Append Case Event / Note</h5>
                <div className="flex gap-2">
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                  >
                    <option value="NOTE_ADDED">Internal Note</option>
                    <option value="SELLER_CONTACTED">Seller Contacted</option>
                    <option value="EVIDENCE_VERIFIED">Evidence Verified</option>
                    <option value="ENFORCEMENT_ISSUED">Enforcement Issued</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Observation or action taken..."
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="flex-1 px-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                  />
                  <Button
                    size="sm"
                    disabled={!eventDescription.trim() || addTimelineMutation.isPending}
                    onClick={() => addTimelineMutation.mutate()}
                    className="bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white"
                  >
                    Append
                  </Button>
                </div>
              </div>
            </div>

            {/* Resolution Controls */}
            <div className="border-t border-slate-800 pt-4">
              {detailData.report.status !== 'RESOLVED' && detailData.report.status !== 'DISMISSED' ? (
                <Button
                  onClick={() => setShowResolveModal(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Resolve / Close Case
                </Button>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-300">
                  Case resolved on {new Date(detailData.report.resolvedAt).toLocaleDateString()}.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Resolve Modal (Using Viewport-Centered Shared Dialog) */}
      <Dialog
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        maxWidth="max-w-md"
        title="Record Case Resolution"
        description="Specify final investigation outcome and administrative disposition."
        footer={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowResolveModal(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!resolutionOutcome.trim() || resolveCaseMutation.isPending}
              onClick={() => resolveCaseMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs"
            >
              {resolveCaseMutation.isPending ? 'Resolving...' : 'Complete Resolution'}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Resolution Outcome</label>
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="RESOLVED">Resolved (Satisfactory Resolution)</option>
              <option value="ACTION_TAKEN">Action Taken (Enforcement Applied)</option>
              <option value="DISMISSED">Dismissed (Unsubstantiated)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Mandatory Outcome Details *</label>
            <textarea
              rows={3}
              placeholder="Comprehensive record of resolution, actions taken, or reason for dismissal..."
              value={resolutionOutcome}
              onChange={(e) => setResolutionOutcome(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white resize-none focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
