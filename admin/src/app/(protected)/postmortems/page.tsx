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
import {
  FileCode,
  Plus,
  Eye,
  CheckCircle,
  AlertOctagon,
  Clock,
  Search,
  X,
  User,
  ShieldCheck
} from 'lucide-react';

export default function PostmortemsPage() {
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostmortemId, setSelectedPostmortemId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [severity, setSeverity] = useState('SEV2');
  const [rootCause, setRootCause] = useState('');
  const [resolution, setResolution] = useState('');
  const [responsibleOwner, setResponsibleOwner] = useState('');
  const [impact, setImpact] = useState('');

  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-postmortems', { page }],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/postmortems', { params: { page, limit: 20 } });
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-postmortem-detail', selectedPostmortemId],
    queryFn: async () => {
      if (!selectedPostmortemId) return null;
      const res = await axiosInstance.get(`/api/admin/postmortems/${selectedPostmortemId}`);
      return res.data;
    },
    enabled: !!selectedPostmortemId,
  });

  const createPostmortemMutation = useMutation({
    mutationFn: async () => {
      if (!title || !summary || !rootCause || !resolution || !responsibleOwner) {
        throw new Error('Title, summary, root cause, resolution and owner are required.');
      }
      const res = await axiosInstance.post('/api/admin/postmortems', {
        title,
        summary,
        severity,
        rootCause,
        resolution,
        responsibleOwner,
        impact,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-postmortems'] });
      showToast('Postmortem incident report drafted.', 'success');
      setShowCreateModal(false);
      resetForm();
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to create postmortem.', 'error'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, reviewStatus }: { id: string; reviewStatus: string }) => {
      const res = await axiosInstance.put(`/api/admin/postmortems/${id}`, { reviewStatus });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-postmortems'] });
      queryClient.invalidateQueries({ queryKey: ['admin-postmortem-detail', selectedPostmortemId] });
      showToast('Postmortem status updated.', 'success');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to update postmortem.', 'error'),
  });

  const resetForm = () => {
    setTitle('');
    setSummary('');
    setRootCause('');
    setResolution('');
    setResponsibleOwner('');
    setImpact('');
  };

  const postmortems = data?.postmortems ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <AlertOctagon className="h-6 w-6 text-red-400" />
            Engineering &amp; Operations Postmortems
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Blameless root cause analysis, detection timelines, corrective action items, and prevention SLA monitoring.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-red-600 hover:bg-red-500 font-bold gap-2 text-white shadow-lg shadow-red-950/40"
        >
          <Plus className="h-4 w-4" />
          Draft Postmortem
        </Button>
      </div>

      {/* Table */}
      <Card className="border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-800 bg-slate-900/80">
              <TableHead className="text-slate-400 text-xs font-semibold">Incident Reference</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Severity</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Title &amp; Impact</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Responsible Owner</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Review Status</TableHead>
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
            ) : postmortems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                  No postmortem reports filed.
                </TableCell>
              </TableRow>
            ) : (
              postmortems.map((pm: any) => (
                <TableRow key={pm.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                  <TableCell>
                    <div className="font-mono text-xs text-white font-medium">{pm.reference}</div>
                    <div className="text-[11px] text-slate-500">{new Date(pm.startTime).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      pm.severity === 'SEV1' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                      pm.severity === 'SEV2' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-slate-500/20 text-slate-300'
                    }>
                      {pm.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-xs text-white font-semibold line-clamp-1">{pm.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">{pm.summary}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-300">{pm.responsibleOwner}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={pm.reviewStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-300'}>
                      {pm.reviewStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPostmortemId(pm.id)}
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Draft Postmortem Incident Report</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Incident Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Mass Payment Webhook Retry Disruption"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="SEV1">SEV1 (Critical Marketplace Outage)</option>
                    <option value="SEV2">SEV2 (Major Degraded Operations)</option>
                    <option value="SEV3">SEV3 (Minor Incident)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Responsible Owner *</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead SRE / Operations Lead"
                    value={responsibleOwner}
                    onChange={(e) => setResponsibleOwner(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Executive Summary *</label>
                <textarea
                  rows={2}
                  placeholder="What happened and customer impact..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Root Cause *</label>
                <textarea
                  rows={2}
                  placeholder="Why did this failure occur..."
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Immediate Resolution &amp; Fix *</label>
                <textarea
                  rows={2}
                  placeholder="How was the issue remediated..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setShowCreateModal(false)} className="border-slate-700">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!title || !summary || !rootCause || !resolution || !responsibleOwner || createPostmortemMutation.isPending}
                onClick={() => createPostmortemMutation.mutate()}
                className="bg-red-600 hover:bg-red-500 font-bold text-white text-xs"
              >
                {createPostmortemMutation.isPending ? 'Saving...' : 'Save Postmortem Draft'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer */}
      {selectedPostmortemId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Postmortem Report</h3>
                <span className="font-mono text-xs text-red-400">{detailData?.postmortem?.reference}</span>
              </div>
              <button onClick={() => setSelectedPostmortemId(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {isDetailLoading ? (
              <Skeleton className="h-48 w-full bg-slate-800/40" />
            ) : detailData?.postmortem ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white">{detailData.postmortem.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-red-500/20 text-red-300">{detailData.postmortem.severity}</Badge>
                    <span className="text-xs text-slate-400">Owner: {detailData.postmortem.responsibleOwner}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                  <span className="text-slate-500 block uppercase font-semibold text-[10px]">Root Cause</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{detailData.postmortem.rootCause}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                  <span className="text-slate-500 block uppercase font-semibold text-[10px]">Resolution Applied</span>
                  <p className="text-slate-200 whitespace-pre-wrap">{detailData.postmortem.resolution}</p>
                </div>

                {detailData.postmortem.reviewStatus === 'DRAFT' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate({ id: selectedPostmortemId, reviewStatus: 'APPROVED' })}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Approve Incident Postmortem
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
