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
import { Drawer } from '@/shared/components/Dialog';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  ExternalLink,
  MessageSquare,
  X,
  UserCheck,
  Send,
  FileText
} from 'lucide-react';

export default function AppealsPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'UNDER_REVIEW' | 'MORE_INFO_REQUESTED' | 'DECIDED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedAppealId, setSelectedAppealId] = useState<string | null>(null);

  // Review action forms
  const [questionText, setQuestionText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [decisionType, setDecisionType] = useState<'UPHELD' | 'OVERTURNED' | 'PARTIALLY_UPHELD' | 'CLOSED'>('OVERTURNED');
  const [decisionReason, setDecisionReason] = useState('');

  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-appeals', { page, activeTab, search }],
    queryFn: async () => {
      let statusParam: string | undefined = undefined;
      if (activeTab === 'PENDING') statusParam = 'PENDING';
      else if (activeTab === 'UNDER_REVIEW') statusParam = 'UNDER_REVIEW';
      else if (activeTab === 'MORE_INFO_REQUESTED') statusParam = 'MORE_INFO_REQUESTED';

      const res = await axiosInstance.get('/api/admin/appeals', {
        params: {
          page,
          limit: 20,
          status: statusParam,
          search: search || undefined,
        },
      });
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-appeal-detail', selectedAppealId],
    queryFn: async () => {
      if (!selectedAppealId) return null;
      const res = await axiosInstance.get(`/api/admin/appeals/${selectedAppealId}`);
      return res.data;
    },
    enabled: !!selectedAppealId,
  });

  const assignReviewerMutation = useMutation({
    mutationFn: async (appealId: string) => {
      const res = await axiosInstance.post(`/api/admin/appeals/${appealId}/assign`, {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appeals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-appeal-detail', selectedAppealId] });
      showToast('Assigned yourself as reviewer for this appeal.', 'success');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to assign reviewer.', 'error'),
  });

  const requestInfoMutation = useMutation({
    mutationFn: async () => {
      if (!questionText.trim()) throw new Error('Question is required');
      const res = await axiosInstance.post(`/api/admin/appeals/${selectedAppealId}/request-info`, {
        question: questionText.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appeals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-appeal-detail', selectedAppealId] });
      showToast('Information request sent to seller.', 'success');
      setQuestionText('');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to request info.', 'error'),
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!internalNoteText.trim()) throw new Error('Note is required');
      const res = await axiosInstance.post(`/api/admin/appeals/${selectedAppealId}/notes`, {
        note: internalNoteText.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appeal-detail', selectedAppealId] });
      showToast('Internal confidential note saved.', 'success');
      setInternalNoteText('');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to save note.', 'error'),
  });

  const recordDecisionMutation = useMutation({
    mutationFn: async () => {
      if (!decisionReason.trim()) throw new Error('Decision reason is required');
      const res = await axiosInstance.post(`/api/admin/appeals/${selectedAppealId}/decision`, {
        decision: decisionType,
        decisionReason: decisionReason.trim(),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-appeals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-appeal-detail', selectedAppealId] });
      if (data.reinstated) {
        showToast('Appeal Overturned! Strike count reduced and seller REINSTATED.', 'success');
      } else {
        showToast(`Appeal recorded as ${decisionType}. Seller notified.`, 'success');
      }
      setDecisionReason('');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to record decision.', 'error'),
  });

  const appeals = data?.appeals ?? [];
  const summary = data?.summary ?? {
    total: 0,
    pendingCount: 0,
    underReviewCount: 0,
    moreInfoCount: 0,
    decidedCount: 0,
  };
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-cyan-400" />
            Seller Appeals Management
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Review appeals against warnings, strikes, and suspensions with evidence timeline, confidential notes, and strike recalculation.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Inflow</span>
            <ShieldAlert className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.total}</div>
          <p className="text-[11px] text-slate-500 mt-1">All submitted appeals</p>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Triage</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.pendingCount}</div>
          <p className="text-[11px] text-amber-400/80 mt-1">Awaiting reviewer assignment</p>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Under Review</span>
            <UserCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.underReviewCount}</div>
          <p className="text-[11px] text-cyan-400/80 mt-1">Active investigations</p>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Info Requested</span>
            <MessageSquare className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.moreInfoCount}</div>
          <p className="text-[11px] text-purple-400/80 mt-1">Awaiting seller response</p>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {(['ALL', 'PENDING', 'UNDER_REVIEW', 'MORE_INFO_REQUESTED', 'DECIDED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search reference, seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-800 bg-slate-900/80">
              <TableHead className="text-slate-400 text-xs font-semibold">Appeal Ref &amp; Date</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Seller &amp; Shop</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Contested Violation</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Status &amp; Reviewer</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-slate-800/50">
                  <TableCell colSpan={5}>
                    <Skeleton className="h-10 w-full bg-slate-800/40" />
                  </TableCell>
                </TableRow>
              ))
            ) : appeals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-xs">
                  No appeals found in this category.
                </TableCell>
              </TableRow>
            ) : (
              appeals.map((appeal: any) => (
                <TableRow key={appeal.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                  <TableCell>
                    <div className="font-mono text-xs text-white font-medium">{appeal.reference}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(appeal.submittedAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-white font-medium">
                      {appeal.seller?.shop?.name || `${appeal.seller?.firstName} ${appeal.seller?.lastName}`}
                    </div>
                    <div className="text-[11px] text-slate-400">{appeal.seller?.email}</div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-xs text-slate-200 line-clamp-1">{appeal.enforcement?.reason}</div>
                    <div className="text-[11px] text-slate-500">
                      {appeal.enforcement?.type} • {appeal.enforcement?.reference}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      appeal.status === 'PENDING' ? 'bg-amber-500/10 text-amber-300' :
                      appeal.status === 'UNDER_REVIEW' ? 'bg-cyan-500/10 text-cyan-300' :
                      appeal.status === 'OVERTURNED' ? 'bg-emerald-500/10 text-emerald-300' :
                      appeal.status === 'UPHELD' ? 'bg-rose-500/10 text-rose-300' :
                      'bg-slate-500/10 text-slate-300'
                    }>
                      {appeal.status.replace('_', ' ')}
                    </Badge>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {appeal.assignedAdmin ? `Reviewer: ${appeal.assignedAdmin.firstName}` : 'Unassigned'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAppealId(appeal.id)}
                      className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-xs gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Review Case
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Appeal Review Drawer (Using Viewport-Aware Drawer) */}
      <Drawer
        isOpen={!!selectedAppealId}
        onClose={() => setSelectedAppealId(null)}
        maxWidth="max-w-xl"
        title="Appeal Investigation Case"
        subtitle={
          detailData?.appeal && (
            <span className="font-mono text-xs text-slate-400">{detailData.appeal.reference}</span>
          )
        }
      >
        {isDetailLoading ? (
          <Skeleton className="h-48 w-full bg-slate-800/40" />
        ) : detailData?.appeal ? (
          <div className="space-y-6">
            {/* Contested Decision */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase">Contested Decision</span>
                <Badge className="bg-rose-500/10 text-rose-300 text-[10px]">
                  {detailData.appeal.enforcement?.type}
                </Badge>
              </div>
              <p className="text-xs text-white font-medium">{detailData.appeal.enforcement?.reason}</p>
              {detailData.appeal.enforcement?.guidelineClause && (
                <p className="text-[11px] text-slate-400 font-mono">
                  Clause: {detailData.appeal.enforcement.guidelineClause} ({detailData.appeal.enforcement.guidelineVersion})
                </p>
              )}
            </div>

            {/* Seller Statement & Attachments */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Seller's Written Statement</h4>
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap">
                {detailData.appeal.sellerExplanation}
              </div>

              {detailData.appeal.evidenceUrls && detailData.appeal.evidenceUrls.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] text-slate-400 block font-semibold">Supporting Evidence Submitted</span>
                  {detailData.appeal.evidenceUrls.map((url: string, idx: number) => (
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
              )}
            </div>

            {/* Confidential Internal Notes */}
            <div className="space-y-2 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Confidential Internal Notes</span>
                <span className="text-[10px] text-slate-500 font-normal">Never visible to seller</span>
              </h4>
              {detailData.appeal.internalNotes ? (
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200/90 whitespace-pre-wrap font-mono">
                  {detailData.appeal.internalNotes}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No internal notes added yet.</p>
              )}

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add internal investigation observation..."
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
                <Button
                  size="sm"
                  onClick={() => addNoteMutation.mutate()}
                  disabled={!internalNoteText.trim() || addNoteMutation.isPending}
                  className="bg-slate-800 hover:bg-slate-700 text-xs"
                >
                  Save Note
                </Button>
              </div>
            </div>

            {/* Request More Information */}
            {detailData.appeal.status !== 'UPHELD' && detailData.appeal.status !== 'OVERTURNED' && (
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Request Clarification / More Info
                </h4>
                <p className="text-[11px] text-slate-400">
                  Sends an in-app prompt to the seller requesting specific evidence or explanations.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Specify questions or missing documents..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <Button
                    size="sm"
                    onClick={() => requestInfoMutation.mutate()}
                    disabled={!questionText.trim() || requestInfoMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white"
                  >
                    Request
                  </Button>
                </div>
              </div>
            )}

            {/* Record Evidence-Based Decision */}
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Record Final Appeal Decision
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDecisionType('OVERTURNED')}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                    decisionType === 'OVERTURNED'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  Overturn Violation
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionType('UPHELD')}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                    decisionType === 'UPHELD'
                      ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  Upheld Violation
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Mandatory Decision Reason *
                </label>
                <textarea
                  rows={2}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Comprehensive evidence-based justification for this decision"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white resize-none"
                />
              </div>

              <Button
                size="sm"
                disabled={!decisionReason.trim() || recordDecisionMutation.isPending}
                onClick={() => recordDecisionMutation.mutate()}
                className={`w-full font-bold text-white text-xs ${
                  decisionType === 'OVERTURNED' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {recordDecisionMutation.isPending ? 'Recording...' : `Submit Decision (${decisionType})`}
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
