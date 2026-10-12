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
import { MultiFileUploadField } from '@/shared/components/MultiFileUploadField';
import {
  Gavel,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Plus,
  X,
  Search,
  Eye,
  RotateCcw,
  Ban,
  FileText,
  ExternalLink,
  Info,
  Clock
} from 'lucide-react';
import { SellerSearchSelect, type SellerOption } from '@/shared/components/SellerSearchSelect';

export default function SellerEnforcementPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'ALL' | 'WARNING' | 'STRIKE' | 'SUSPENDED'>('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Drawers
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedEnforcementId, setSelectedEnforcementId] = useState<string | null>(null);

  // Status Action Dialog (replaces browser prompt)
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    title: string;
    status: 'WITHDRAWN' | 'OVERTURNED' | null;
    reason: string;
  }>({
    isOpen: false,
    title: '',
    status: null,
    reason: '',
  });

  // Issue Enforcement Form
  const [selectedSeller, setSelectedSeller] = useState<SellerOption | null>(null);
  const [enforcementType, setEnforcementType] = useState<'WARNING' | 'STRIKE'>('WARNING');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [guidelineVersion, setGuidelineVersion] = useState('v1.0-2026');
  const [guidelineClause, setGuidelineClause] = useState('Section 3.2 - Prohibited Items');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-enforcements', { page, activeTab, search, statusFilter }],
    queryFn: async () => {
      const typeParam = activeTab === 'WARNING' ? 'WARNING' : activeTab === 'STRIKE' ? 'STRIKE' : undefined;
      const res = await axiosInstance.get('/api/admin/seller-enforcement', {
        params: {
          page,
          limit: 20,
          type: typeParam,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-enforcement-detail', selectedEnforcementId],
    queryFn: async () => {
      if (!selectedEnforcementId) return null;
      const res = await axiosInstance.get(`/api/admin/seller-enforcement/${selectedEnforcementId}`);
      return res.data;
    },
    enabled: !!selectedEnforcementId,
  });

  const issueMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSeller) throw new Error('Please select a seller.');
      if (!reason.trim()) throw new Error('Violation reason is required.');

      const res = await axiosInstance.post('/api/admin/seller-enforcement', {
        sellerId: selectedSeller.id,
        type: enforcementType,
        reason: reason.trim(),
        description: description.trim() || undefined,
        guidelineVersion: enforcementType === 'STRIKE' ? guidelineVersion.trim() : undefined,
        guidelineClause: enforcementType === 'STRIKE' ? guidelineClause.trim() : undefined,
        evidenceUrls,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-enforcements'] });
      if (data.triggeredSuspension) {
        showToast('Qualifying strike 3/3 issued: Seller account has been SUSPENDED.', 'error');
      } else if (enforcementType === 'STRIKE') {
        showToast(`Strike issued (${data.qualifyingCount}/3). Seller notified.`, 'success');
      } else {
        showToast('Policy warning issued. Recorded in enforcement history.', 'success');
      }
      closeIssueModal();
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Unable to issue enforcement action.', 'error');
    },
  });

  const statusUpdateMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason: string }) => {
      const res = await axiosInstance.patch(`/api/admin/seller-enforcement/${id}/status`, { status, reason });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-enforcements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-enforcement-detail', selectedEnforcementId] });
      if (data.reinstated) {
        showToast('Strike overturned and seller account automatically REINSTATED!', 'success');
      } else {
        showToast('Enforcement status updated successfully.', 'success');
      }
      setActionDialog({ isOpen: false, title: '', status: null, reason: '' });
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to update enforcement status.', 'error');
    },
  });

  const closeIssueModal = () => {
    setShowIssueModal(false);
    setSelectedSeller(null);
    setReason('');
    setDescription('');
    setEnforcementType('WARNING');
    setEvidenceUrls([]);
  };

  const items = data?.items ?? [];
  const summary = data?.summary ?? {
    totalWarnings: 0,
    totalQualifyingStrikes: 0,
    totalPendingAppeals: 0,
    totalSuspendedSellers: 0,
  };
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <Gavel className="h-6 w-6 text-rose-400" />
            Seller Enforcement &amp; Policy Governance
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Authoritative marketplace discipline: Type A Warnings (unlimited) and Type B Community Guidelines Strikes (3-strike suspension rule).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowIssueModal(true)}
            className="bg-rose-600 hover:bg-rose-500 font-bold gap-2 text-white shadow-lg shadow-rose-950/40"
          >
            <Plus className="h-4 w-4" />
            Issue Enforcement Action
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Warnings</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.totalWarnings}</div>
          <p className="text-[11px] text-slate-400 mt-1">No limit • 0 strike impact</p>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Strikes</span>
            <Gavel className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.totalQualifyingStrikes}</div>
          <p className="text-[11px] text-rose-400/80 mt-1">3 qualifying strikes = suspension</p>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Appeals</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.totalPendingAppeals}</div>
          <p className="text-[11px] text-cyan-400/80 mt-1">Awaiting reviewer decision</p>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Suspended Sellers</span>
            <Ban className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.totalSuspendedSellers}</div>
          <p className="text-[11px] text-red-400/80 mt-1">Restricted commercial access</p>
        </Card>
      </div>

      {/* Navigation Tabs & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {(['ALL', 'WARNING', 'STRIKE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab === 'ALL' && 'All Enforcement Records'}
              {tab === 'WARNING' && 'Type A: Policy Warnings'}
              {tab === 'STRIKE' && 'Type B: Formal Strikes'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search seller, shop, clause..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Statuses</option>
            <option value="ISSUED">Issued</option>
            <option value="UNDER_APPEAL">Under Appeal</option>
            <option value="UPHELD">Upheld</option>
            <option value="OVERTURNED">Overturned</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Enforcement Records Table */}
      <Card className="border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-800 bg-slate-900/80">
              <TableHead className="text-slate-400 text-xs font-semibold">Reference &amp; Date</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Type</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Seller &amp; Shop</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Violation / Clause</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Status &amp; Strike Metric</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-slate-800/50">
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full bg-slate-800/40" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                  No enforcement records found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => (
                <TableRow key={item.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                  <TableCell>
                    <div className="font-mono text-xs text-white font-medium">{item.reference || item.id.slice(0, 8)}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(item.issuedAt).toLocaleDateString()} by {item.admin?.firstName || 'Admin'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.type === 'WARNING' ? (
                      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                        Type A Warning
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]">
                        Type B Strike
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-white font-medium">{item.seller?.shop?.name || `${item.seller?.firstName} ${item.seller?.lastName}`}</div>
                    <div className="text-[11px] text-slate-400">{item.seller?.email}</div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-xs text-slate-200 line-clamp-1">{item.reason}</div>
                    {item.guidelineClause && (
                      <div className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                        {item.guidelineClause} ({item.guidelineVersion || 'v1'})
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${
                        item.status === 'ISSUED' || item.status === 'UPHELD'
                          ? 'bg-rose-400'
                          : item.status === 'UNDER_APPEAL'
                          ? 'bg-cyan-400'
                          : 'bg-slate-500'
                      }`} />
                      <span className="text-xs text-slate-300 font-medium capitalize">{item.status.replace('_', ' ')}</span>
                    </div>
                    {item.type === 'STRIKE' && (
                      <div className="text-[11px] text-rose-400/90 font-mono mt-0.5">
                        Seller: {item.seller?.strikeCount}/3 qualifying
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEnforcementId(item.id)}
                      className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-xs gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} records
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-xs border-slate-800"
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs border-slate-800"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Issue Enforcement Action Modal (Using Viewport-Centered Shared Dialog) */}
      <Dialog
        isOpen={showIssueModal}
        onClose={closeIssueModal}
        maxWidth="max-w-xl"
        title="Issue Enforcement Action"
        description="Select exactly one primary enforcement classification."
        footer={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={closeIssueModal}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedSeller || !reason.trim() || issueMutation.isPending}
              onClick={() => issueMutation.mutate()}
              className="bg-rose-600 hover:bg-rose-500 font-bold text-white text-xs"
            >
              {issueMutation.isPending ? 'Processing...' : 'Issue Enforcement Action'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Classification type selector */}
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setEnforcementType('WARNING')}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                enforcementType === 'WARNING'
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-xs flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Type A: Warning
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                No numeric limit. Does NOT increase strike count. Mandatory reason.
              </p>
            </div>

            <div
              onClick={() => setEnforcementType('STRIKE')}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                enforcementType === 'STRIKE'
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-xs flex items-center gap-1.5">
                <Gavel className="h-4 w-4" />
                Type B: Formal Strike
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Requires guideline clause. Max 3 qualifying strikes triggers suspension.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Target Seller *</label>
            <SellerSearchSelect
              selected={selectedSeller}
              onSelect={(_id, seller) => setSelectedSeller(seller)}
              onClear={() => setSelectedSeller(null)}
            />
          </div>

          {enforcementType === 'STRIKE' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Guideline Version *</label>
                <input
                  type="text"
                  value={guidelineVersion}
                  onChange={(e) => setGuidelineVersion(e.target.value)}
                  placeholder="e.g. v1.0-2026"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Specific Clause *</label>
                <input
                  type="text"
                  value={guidelineClause}
                  onChange={(e) => setGuidelineClause(e.target.value)}
                  placeholder="e.g. Section 4.1"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Violation Reason *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief summary of policy violation"
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Detailed Explanation (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Investigative facts, order identifiers, and context"
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white resize-none focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Cloudinary Multi-File Uploader + External URL Support */}
          <div>
            <MultiFileUploadField
              value={evidenceUrls}
              onChange={setEvidenceUrls}
              folder="evidence"
              label="Evidence Attachments (Cloudinary Files or External URLs)"
              hint="Upload screenshot proof, chat transcripts, or packaging photo evidence"
              maxFiles={6}
              allowExternalUrls={true}
            />
          </div>
        </div>
      </Dialog>

      {/* Enforcement Detail Drawer (Using Viewport-Aware Drawer) */}
      <Drawer
        isOpen={!!selectedEnforcementId}
        onClose={() => setSelectedEnforcementId(null)}
        maxWidth="max-w-lg"
        title="Enforcement Record"
        subtitle={
          detailData?.enforcement && (
            <span className="font-mono text-xs text-slate-400">
              {detailData.enforcement.reference || selectedEnforcementId}
            </span>
          )
        }
      >
        {isDetailLoading ? (
          <Skeleton className="h-48 w-full bg-slate-800/40" />
        ) : detailData?.enforcement ? (
          <div className="space-y-6">
            {/* Status banner */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Classification</span>
                <Badge className={detailData.enforcement.type === 'STRIKE' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}>
                  {detailData.enforcement.type === 'STRIKE' ? 'Formal Community Guidelines Strike' : 'Formal Warning'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Current Status</span>
                <span className="text-xs font-semibold text-white capitalize">{detailData.enforcement.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Seller Standing</span>
                <span className="text-xs font-mono font-bold text-rose-400">
                  {detailData.enforcement.seller?.strikeCount}/3 qualifying strikes
                </span>
              </div>
            </div>

            {/* Seller Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Affected Seller</h4>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="text-xs text-white font-semibold">
                  {detailData.enforcement.seller?.shop?.name || `${detailData.enforcement.seller?.firstName} ${detailData.enforcement.seller?.lastName}`}
                </div>
                <div className="text-[11px] text-slate-400">{detailData.enforcement.seller?.email}</div>
                <div className="text-[11px] text-slate-500">ID: {detailData.enforcement.seller?.id}</div>
              </div>
            </div>

            {/* Violation Facts */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Violation Details</h4>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                <div>
                  <span className="text-[11px] text-slate-500 block">Primary Reason</span>
                  <p className="text-xs text-white font-medium">{detailData.enforcement.reason}</p>
                </div>
                {detailData.enforcement.guidelineClause && (
                  <div>
                    <span className="text-[11px] text-slate-500 block">Applicable Policy Clause</span>
                    <p className="text-xs text-slate-300 font-mono">
                      {detailData.enforcement.guidelineClause} ({detailData.enforcement.guidelineVersion})
                    </p>
                  </div>
                )}
                {detailData.enforcement.description && (
                  <div>
                    <span className="text-[11px] text-slate-500 block">Investigative Context</span>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{detailData.enforcement.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Evidence Attachments */}
            {detailData.enforcement.evidenceUrls && detailData.enforcement.evidenceUrls.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Evidence Attachments ({detailData.enforcement.evidenceUrls.length})</h4>
                <div className="space-y-1.5">
                  {detailData.enforcement.evidenceUrls.map((url: string, idx: number) => (
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

            {/* Appeal status */}
            {detailData.enforcement.appeal && (
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Associated Appeal</span>
                  <Badge className="bg-cyan-500/10 text-cyan-300 text-[10px]">
                    {detailData.enforcement.appeal.status}
                  </Badge>
                </h4>
                <p className="text-xs text-slate-400">
                  Ref: {detailData.enforcement.appeal.reference} • Submitted:{' '}
                  {new Date(detailData.enforcement.appeal.submittedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Authorized Actions */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Authorized Management</h4>
              <div className="flex flex-wrap gap-2">
                {detailData.enforcement.status !== 'WITHDRAWN' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActionDialog({
                        isOpen: true,
                        title: 'Withdraw Enforcement Action',
                        status: 'WITHDRAWN',
                        reason: '',
                      });
                    }}
                    className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
                  >
                    Withdraw Enforcement
                  </Button>
                )}
                {detailData.enforcement.status !== 'OVERTURNED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActionDialog({
                        isOpen: true,
                        title: 'Overturn Enforcement Decision',
                        status: 'OVERTURNED',
                        reason: '',
                      });
                    }}
                    className="text-xs border-emerald-800/60 hover:bg-emerald-950/40 text-emerald-300"
                  >
                    Overturn Decision
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Confirmation / Reason Dialog for Overturning or Withdrawing (Replaces browser prompt) */}
      <Dialog
        isOpen={actionDialog.isOpen}
        onClose={() => setActionDialog({ isOpen: false, title: '', status: null, reason: '' })}
        maxWidth="max-w-md"
        title={actionDialog.title}
        description="Provide a documented administrative justification for this change."
        footer={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActionDialog({ isOpen: false, title: '', status: null, reason: '' })}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!actionDialog.reason.trim() || statusUpdateMutation.isPending}
              onClick={() => {
                if (selectedEnforcementId && actionDialog.status) {
                  statusUpdateMutation.mutate({
                    id: selectedEnforcementId,
                    status: actionDialog.status,
                    reason: actionDialog.reason.trim(),
                  });
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs"
            >
              {statusUpdateMutation.isPending ? 'Submitting...' : 'Confirm Action'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">Mandatory Reason *</label>
          <textarea
            rows={3}
            placeholder="Detailed administrative grounds for amending this enforcement status..."
            value={actionDialog.reason}
            onChange={(e) => setActionDialog((prev) => ({ ...prev, reason: e.target.value }))}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white resize-none focus:outline-none focus:border-emerald-500"
          />
        </div>
      </Dialog>
    </div>
  );
}
