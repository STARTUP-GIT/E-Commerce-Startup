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
  FileText,
  Plus,
  Eye,
  CheckCircle,
  Hash,
  X,
  Lock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Calendar,
  ExternalLink
} from 'lucide-react';

interface ClauseItem {
  id: string;
  number: string;
  title: string;
  content: string;
}

export default function CommunityGuidelinesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGuidelineId, setSelectedGuidelineId] = useState<string | null>(null);

  // Draft form
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('v1.0-2026');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [summary, setSummary] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [clauses, setClauses] = useState<ClauseItem[]>([
    { id: '1', number: '1.0', title: 'Authenticity & Intellectual Property', content: 'Sellers must only list authentic goods...' },
    { id: '2', number: '2.0', title: 'Fulfillment & SLA Commitments', content: 'Orders must be dispatched within the agreed SLA...' }
  ]);
  const [requiresAcceptance, setRequiresAcceptance] = useState(true);

  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-guidelines'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/guidelines');
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-guideline-detail', selectedGuidelineId],
    queryFn: async () => {
      if (!selectedGuidelineId) return null;
      const res = await axiosInstance.get(`/api/admin/guidelines/${selectedGuidelineId}`);
      return res.data;
    },
    enabled: !!selectedGuidelineId,
  });

  const createDraftMutation = useMutation({
    mutationFn: async () => {
      if (!title || !version) throw new Error('Title and version are required.');
      if (!effectiveDate) throw new Error('Effective date is required.');
      if (clauses.length === 0) throw new Error('At least one clause is required.');

      // Bundle clauses, summary, and attachments into sections structure
      const sections = clauses.map(c => ({
        number: c.number,
        title: c.title,
        content: c.content,
      }));

      const res = await axiosInstance.post('/api/admin/guidelines', {
        title: title.trim(),
        version: version.trim(),
        sections,
        summary: summary.trim(),
        effectiveDate,
        attachments,
        requiresAcceptance,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-guidelines'] });
      showToast('Guideline draft created successfully.', 'success');
      setShowCreateModal(false);
      resetForm();
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to create guideline draft.', 'error'),
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post(`/api/admin/guidelines/${id}/publish`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-guidelines'] });
      queryClient.invalidateQueries({ queryKey: ['admin-guideline-detail', selectedGuidelineId] });
      showToast(`Guideline version ${data.guideline?.version} published with SHA-256 integrity hash!`, 'success');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to publish guideline.', 'error'),
  });

  const resetForm = () => {
    setTitle('');
    setVersion('');
    setEffectiveDate('');
    setSummary('');
    setAttachments([]);
  };

  const addClause = () => {
    const nextNum = (clauses.length + 1).toFixed(1);
    setClauses([
      ...clauses,
      { id: Date.now().toString(), number: nextNum, title: 'New Clause', content: 'Clause content...' }
    ]);
  };

  const updateClause = (index: number, field: keyof ClauseItem, val: string) => {
    const next = [...clauses];
    next[index][field] = val;
    setClauses(next);
  };

  const removeClause = (index: number) => {
    setClauses(clauses.filter((_, i) => i !== index));
  };

  const guidelines = data?.guidelines ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-400" />
            Community Guidelines &amp; Policies
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Authoritative, versioned guideline governance with cryptographic SHA-256 document hashing and seller acceptance tracking.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 font-bold gap-2 text-white shadow-lg shadow-indigo-950/40"
        >
          <Plus className="h-4 w-4" />
          Create New Draft Version
        </Button>
      </div>

      {/* Guidelines Version List */}
      <Card className="border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-800 bg-slate-900/80">
              <TableHead className="text-slate-400 text-xs font-semibold">Title &amp; Version</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Status</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Effective Date</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Integrity Hash</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Seller Acceptances</TableHead>
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
            ) : guidelines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                  No community guidelines created yet. Click "Create New Draft Version" to begin.
                </TableCell>
              </TableRow>
            ) : (
              guidelines.map((g: any) => (
                <TableRow key={g.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-xs text-white">{g.title}</div>
                    <div className="text-[11px] font-mono text-indigo-400 mt-0.5">Version: {g.version}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      g.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                      g.status === 'SUPERSEDED' ? 'bg-slate-500/10 text-slate-400' :
                      'bg-amber-500/10 text-amber-300'
                    }>
                      {g.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-300">
                      {g.effectiveDate ? new Date(g.effectiveDate).toLocaleDateString() : 'Immediate'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {g.contentHash ? (
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {g.contentHash.slice(0, 12)}...
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Pending publication</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-white">
                      {g._count?.agreements ?? 0} sellers accepted
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedGuidelineId(g.id)}
                      className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-xs gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Inspect &amp; Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Draft Modal (Using Viewport-Centered Shared Dialog) */}
      <Dialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="max-w-2xl"
        title="Draft Community Guidelines Version"
        description="Published guidelines are immutable and require explicit versioning."
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
              disabled={!title || !version || !effectiveDate || clauses.length === 0 || createDraftMutation.isPending}
              onClick={() => createDraftMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-xs"
            >
              {createDraftMutation.isPending ? 'Saving...' : 'Save Draft Version'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Document Title *</label>
              <input
                type="text"
                placeholder="e.g. Marketplace Community Guidelines"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Version Identifier *</label>
              <input
                type="text"
                placeholder="e.g. v2.0-2026"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Effective Date *</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center pt-2 sm:pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={requiresAcceptance}
                  onChange={(e) => setRequiresAcceptance(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0"
                />
                Require In-App Seller Agreement
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Executive Summary</label>
            <textarea
              rows={2}
              placeholder="Overview of terms, scope, and marketplace enforcement standards..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white resize-none focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Cloudinary Supporting Documents Upload */}
          <div className="pt-1">
            <MultiFileUploadField
              value={attachments}
              onChange={setAttachments}
              folder="guidelines"
              label="Policy Attachments & Supporting Documents (Cloudinary)"
              hint="Upload legal terms, supplementary schedules, or standards docs (PDF, DOCX, Images)"
              maxFiles={5}
            />
          </div>

          {/* Clauses Editor */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Numbered Clauses ({clauses.length})</h4>
              <Button size="sm" variant="outline" onClick={addClause} className="text-xs border-slate-700 gap-1 hover:bg-slate-800">
                <Plus className="h-3 w-3" />
                Add Clause
              </Button>
            </div>

            {clauses.map((clause, idx) => (
              <div key={clause.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Num"
                    value={clause.number}
                    onChange={(e) => updateClause(idx, 'number', e.target.value)}
                    className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Clause Title"
                    value={clause.title}
                    onChange={(e) => updateClause(idx, 'title', e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  {clauses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeClause(idx)}
                      className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  placeholder="Clause terms and operational guidelines..."
                  value={clause.content}
                  onChange={(e) => updateClause(idx, 'content', e.target.value)}
                  className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>
      </Dialog>

      {/* Guideline Detail Drawer (Using Viewport-Aware Drawer) */}
      <Drawer
        isOpen={!!selectedGuidelineId}
        onClose={() => setSelectedGuidelineId(null)}
        maxWidth="max-w-xl"
        title="Guideline Version Details"
        subtitle={
          detailData?.guideline && (
            <span className="font-mono text-xs text-indigo-400">
              {detailData.guideline.version} • {detailData.guideline.title}
            </span>
          )
        }
      >
        {isDetailLoading ? (
          <Skeleton className="h-48 w-full bg-slate-800/40" />
        ) : detailData?.guideline ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Status</span>
                <Badge className={detailData.guideline.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}>
                  {detailData.guideline.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Effective Date</span>
                <span className="text-xs font-semibold text-white">
                  {detailData.guideline.effectiveDate ? new Date(detailData.guideline.effectiveDate).toLocaleDateString() : 'Immediate'}
                </span>
              </div>
              {detailData.guideline.contentHash && (
                <div className="space-y-1 pt-1 border-t border-slate-800/60">
                  <span className="text-[11px] text-slate-400 font-mono block">SHA-256 Checksum:</span>
                  <p className="text-[10px] font-mono text-indigo-300 break-all bg-slate-900 p-2 rounded border border-slate-800">
                    {detailData.guideline.contentHash}
                  </p>
                </div>
              )}
            </div>

            {/* Clauses list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Document Clauses</h4>
              {Array.isArray(detailData.guideline.sections) &&
                detailData.guideline.sections.map((clause: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/40 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-indigo-400 font-bold">{clause.number || `${idx + 1}.0`}</span>
                      <span className="text-xs text-white font-semibold">{clause.title}</span>
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{clause.content}</p>
                  </div>
                ))}
            </div>

            {/* Actions */}
            <div className="border-t border-slate-800 pt-4">
              {detailData.guideline.status === 'DRAFT' && (
                <Button
                  onClick={() => { if (selectedGuidelineId) publishMutation.mutate(selectedGuidelineId); }}
                  disabled={publishMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  {publishMutation.isPending ? 'Publishing & Hashing...' : 'Publish Version Immutably'}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
