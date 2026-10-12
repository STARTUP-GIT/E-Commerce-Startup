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
  BellRing,
  Plus,
  Eye,
  CheckCircle,
  X,
  Users,
  Search,
  ExternalLink
} from 'lucide-react';

export default function IssuePolicyPage() {
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);

  // Draft form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('OPERATIONS');
  const [content, setContent] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [audience, setAudience] = useState('ALL_SELLERS');
  const [attachments, setAttachments] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-policy-notices', { page }],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/policy-notices', { params: { page, limit: 20 } });
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-policy-notice-detail', selectedNoticeId],
    queryFn: async () => {
      if (!selectedNoticeId) return null;
      const res = await axiosInstance.get(`/api/admin/policy-notices/${selectedNoticeId}`);
      return res.data;
    },
    enabled: !!selectedNoticeId,
  });

  const { data: readsData } = useQuery({
    queryKey: ['admin-policy-notice-reads', selectedNoticeId],
    queryFn: async () => {
      if (!selectedNoticeId) return null;
      const res = await axiosInstance.get(`/api/admin/policy-notices/${selectedNoticeId}/reads`);
      return res.data;
    },
    enabled: !!selectedNoticeId,
  });

  const createNoticeMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !content.trim()) throw new Error('Title and content are required.');
      if (!effectiveDate) throw new Error('Effective date is required.');

      // Format content with any uploaded attachment links if backend stores content as string
      let finalContent = content.trim();
      if (attachments.length > 0) {
        finalContent += '\n\n---\n**Official Attachments & References:**\n' +
          attachments.map((url, i) => `${i + 1}. ${url}`).join('\n');
      }

      const res = await axiosInstance.post('/api/admin/policy-notices', {
        title: title.trim(),
        category,
        content: finalContent,
        effectiveDate,
        audience,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policy-notices'] });
      showToast('Policy notice drafted.', 'success');
      setShowCreateModal(false);
      resetForm();
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to create notice.', 'error'),
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post(`/api/admin/policy-notices/${id}/publish`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policy-notices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-policy-notice-detail', selectedNoticeId] });
      showToast('Policy notice published and broadcasted to sellers.', 'success');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to publish notice.', 'error'),
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEffectiveDate('');
    setAttachments([]);
  };

  const notices = data?.notices ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <BellRing className="h-6 w-6 text-sky-400" />
            Issue Policy Notices &amp; Operational Bulletins
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Publish operational rules, packaging guidelines, and marketplace updates. Tracks real view and read rates (no signatures required).
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-sky-600 hover:bg-sky-500 font-bold gap-2 text-white shadow-lg shadow-sky-950/40"
        >
          <Plus className="h-4 w-4" />
          Draft Policy Notice
        </Button>
      </div>

      {/* Table */}
      <Card className="border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-800 bg-slate-900/80">
              <TableHead className="text-slate-400 text-xs font-semibold">Title &amp; Category</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Status</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Target Audience</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Effective Date</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Read Receipts</TableHead>
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
            ) : notices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                  No policy notices issued yet.
                </TableCell>
              </TableRow>
            ) : (
              notices.map((n: any) => (
                <TableRow key={n.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-xs text-white">{n.title}</div>
                    <Badge className="bg-slate-800 text-slate-300 text-[10px] mt-1">{n.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={n.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}>
                      {n.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-300">{n.audience.replace('_', ' ')}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-300">{new Date(n.effectiveDate).toLocaleDateString()}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-semibold text-white">{n._count?.reads ?? 0} sellers read</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedNoticeId(n.id)}
                      className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-xs gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Draft Modal (Using Centered Shared Dialog) */}
      <Dialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="max-w-lg"
        title="Draft Policy Notice"
        description="Notice will be broadcasted to sellers upon publishing."
        footer={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!title.trim() || !content.trim() || !effectiveDate || createNoticeMutation.isPending}
              onClick={() => createNoticeMutation.mutate()}
              className="bg-sky-600 hover:bg-sky-500 font-bold text-white text-xs"
            >
              {createNoticeMutation.isPending ? 'Saving...' : 'Save Draft Notice'}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Title *</label>
            <input
              type="text"
              placeholder="e.g. Mandatory Packaging Guidelines for Monsoon Season"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="OPERATIONS">Operations</option>
                <option value="SHIPPING">Shipping &amp; Delivery</option>
                <option value="FINANCE">Finance &amp; Taxes</option>
                <option value="PRODUCT_RULES">Product Rules</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Effective Date *</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="ALL_SELLERS">All Sellers</option>
              <option value="VERIFIED_ONLY">Verified Sellers Only</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Notice Content *</label>
            <textarea
              rows={4}
              placeholder="Complete policy text, guidance, and instructions..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white resize-none focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Cloudinary File Attachments */}
          <div className="pt-1">
            <MultiFileUploadField
              value={attachments}
              onChange={setAttachments}
              folder="policies"
              label="Policy Attachments (Cloudinary)"
              hint="Upload PDF circulars, guidelines, or reference documents"
              maxFiles={4}
            />
          </div>
        </div>
      </Dialog>

      {/* Detail Drawer (Using Viewport-Aware Drawer) */}
      <Drawer
        isOpen={!!selectedNoticeId}
        onClose={() => setSelectedNoticeId(null)}
        maxWidth="max-w-lg"
        title="Policy Notice"
        subtitle={
          detailData?.notice && (
            <span className="text-xs text-slate-400">Category: {detailData.notice.category}</span>
          )
        }
      >
        {isDetailLoading ? (
          <Skeleton className="h-48 w-full bg-slate-800/40" />
        ) : detailData?.notice ? (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-white mb-2">{detailData.notice.title}</h4>
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {detailData.notice.content}
              </div>
            </div>

            {detailData.notice.status === 'DRAFT' && (
              <Button
                onClick={() => { if (selectedNoticeId) publishMutation.mutate(selectedNoticeId); }}
                disabled={publishMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                {publishMutation.isPending ? 'Publishing...' : 'Publish Announcement'}
              </Button>
            )}

            {/* Read Receipts */}
            <div className="space-y-2 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Seller Read Log ({readsData?.reads?.length ?? 0})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {readsData?.reads?.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2">No seller reads recorded yet.</p>
                ) : (
                  readsData?.reads?.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded bg-slate-950/40 text-xs border border-slate-800">
                      <span className="text-white">{r.seller?.shop?.name || `${r.seller?.firstName} ${r.seller?.lastName}`}</span>
                      <span className="text-slate-500 text-[11px]">{new Date(r.readAt).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
