"use client";

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  contentApi,
  CONTENT_PLACEMENTS,
  CONTENT_STATUSES,
  type ContentBlock,
  type ContentBlockPayload,
  type ContentPlacement,
  type ContentStatus,
} from '../api/contentApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/Card';
import { Badge, type BadgeProps } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Dialog } from '@/shared/components/Dialog';
import { ImageUploadField, type UploadResult } from '@/shared/components/ImageUploadField';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { ChevronLeft, ChevronRight, Edit2, LayoutGrid, Plus, Save, Search, ShieldAlert, Trash2 } from 'lucide-react';

const PAGE_SIZE = 10;

interface BlockFormState {
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  imagePublicId: string;
  linkUrl: string;
  placement: string;
  status: string;
  sortOrder: number;
  visibleFrom: string;
  visibleTo: string;
}

const prettify = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const statusVariant = (status: string): BadgeProps['variant'] =>
  status === 'PUBLISHED' ? 'success' : status === 'ARCHIVED' ? 'destructive' : 'warning';

const toLocalInput = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const errorMessage = () => 'Unable to save content block. Please try again.';

export function ContentPage() {
  const { can } = usePermissions();
  const { showToast } = useUIStore();
  const { showConfirm } = useConfirmStore();
  const queryClient = useQueryClient();

  const canView = can('content.view');
  const canManage = can('content.manage');

  const [placementFilter, setPlacementFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
  const [form, setForm] = useState<BlockFormState>(() => defaultForm('', ''));

  const queryKey = useMemo(
    () => ['content-blocks', { placement: placementFilter, status: statusFilter, search, page, limit: PAGE_SIZE }],
    [placementFilter, statusFilter, search, page]
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      contentApi.getBlocks({
        placement: placementFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    staleTime: 30 * 1000,
  });

  const blocks = data?.blocks ?? [];
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: PAGE_SIZE, pages: 0 };
  const totalPages = Math.max(1, pagination.pages || 1);

  const setPlacement = (value: string) => { setPlacementFilter(value); setPage(1); };
  const setStatus = (value: string) => { setStatusFilter(value); setPage(1); };
  const setSearchQuery = (value: string) => { setSearch(value); setPage(1); };

  const buildPayload = (f: BlockFormState): ContentBlockPayload => ({
    title: f.title.trim(),
    subtitle: f.subtitle.trim() || undefined,
    body: f.body.trim() || undefined,
    imageUrl: f.imageUrl.trim() || null,
    imagePublicId: f.imagePublicId || null,
    linkUrl: f.linkUrl.trim() || undefined,
    placement: f.placement as ContentPlacement,
    status: f.status as ContentStatus,
    sortOrder: Number(f.sortOrder) || 0,
    visibleFrom: f.visibleFrom ? new Date(f.visibleFrom).toISOString() : null,
    visibleTo: f.visibleTo ? new Date(f.visibleTo).toISOString() : null,
  });

  const openCreate = () => {
    setEditingBlock(null);
    setForm(defaultForm(placementFilter, statusFilter));
    setDialogOpen(true);
  };

  const openEdit = (block: ContentBlock) => {
    setEditingBlock(block);
    setForm({
      title: block.title,
      subtitle: block.subtitle || '',
      body: block.body || '',
      imageUrl: block.imageUrl || '',
      imagePublicId: block.imagePublicId || '',
      linkUrl: block.linkUrl || '',
      placement: block.placement,
      status: block.status,
      sortOrder: block.sortOrder ?? 0,
      visibleFrom: toLocalInput(block.visibleFrom),
      visibleTo: toLocalInput(block.visibleTo),
    });
    setDialogOpen(true);
  };

  const updateField = (key: keyof BlockFormState, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleImageUpload = (result: UploadResult) => {
    setForm((f) => ({ ...f, imageUrl: result.url, imagePublicId: result.publicId }));
  };

  const handleImageRemove = () => {
    setForm((f) => ({ ...f, imageUrl: '', imagePublicId: '' }));
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['content-blocks'] });

  const createMutation = useMutation({
    mutationFn: (payload: ContentBlockPayload) => contentApi.createBlock(payload),
    onSuccess: () => {
      invalidate();
      showToast('Content block created.', 'success');
      setDialogOpen(false);
    },
    onError: () => showToast(errorMessage(), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ContentBlockPayload> }) => contentApi.updateBlock(id, payload),
    onSuccess: () => {
      invalidate();
      showToast('Content block updated.', 'success');
      setDialogOpen(false);
    },
    onError: () => showToast(errorMessage(), 'error'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) => contentApi.updateBlockStatus(id, status),
    onSuccess: () => {
      invalidate();
      showToast('Content block status updated.', 'success');
    },
    onError: () => showToast(errorMessage(), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentApi.deleteBlock(id),
    onSuccess: () => {
      invalidate();
      showToast('Content block deleted.', 'info');
    },
    onError: () => showToast(errorMessage(), 'error'),
  });

  const handleDelete = (block: ContentBlock) => {
    showConfirm({
      title: 'Delete Content Block',
      message: `Are you sure you want to delete "${block.title}"? This cannot be undone.`,
      confirmText: 'Delete',
      onConfirm: () => deleteMutation.mutate(block.id),
    });
  };

  if (!canView) {
    return <NoPermission title="Content Management" />;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Content Management</h1>
          <p className="text-xs text-white/45 mt-1">Schedule and manage banners, promos, and storefront content blocks</p>
        </div>
        <Button size="sm" disabled={!canManage} onClick={openCreate}>
          <Plus className="mr-2 h-3.5 w-3.5" /> New Content Block
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_180px_1fr] gap-3">
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Placement</label>
          <select
            value={placementFilter}
            onChange={(e) => setPlacement(e.target.value)}
            className="glass-input w-full h-10 rounded-xl px-3 text-sm text-white cursor-pointer"
          >
            <option value="">All placements</option>
            {CONTENT_PLACEMENTS.map((placement) => (
              <option key={placement} value={placement}>{prettify(placement)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatus(e.target.value)}
            className="glass-input w-full h-10 rounded-xl px-3 text-sm text-white cursor-pointer"
          >
            <option value="">All statuses</option>
            {CONTENT_STATUSES.map((status) => (
              <option key={status} value={status}>{prettify(status)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <Input className="pl-9" placeholder="Search by title…" value={search} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Content Blocks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-16">
              <LayoutGrid className="mx-auto h-10 w-10 text-white/20 mb-3" />
              <p className="text-sm text-white/30">No content blocks found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell>
                      <div className="min-w-0 flex items-center gap-2">
                        {block.imageUrl && (
                          <img src={block.imageUrl} alt="" className="h-8 w-12 rounded-md object-cover border border-white/10 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white/90 truncate">{block.title}</p>
                          {block.subtitle && <p className="text-[10px] text-white/35 truncate">{block.subtitle}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[8px]">{prettify(block.placement)}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(block.status)} className="text-[8px]">{block.status}</Badge></TableCell>
                    <TableCell className="text-xs text-white/60 font-mono">{block.sortOrder ?? 0}</TableCell>
                    <TableCell className="text-[11px] text-white/40">{block.updatedAt ? new Date(block.updatedAt).toLocaleString() : '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {canManage && block.status !== 'ARCHIVED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[9px]"
                            isLoading={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ id: block.id, status: block.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' })}
                          >
                            {block.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                          </Button>
                        )}
                        {canManage && (
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEdit(block)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canManage && (
                          <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => handleDelete(block)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {blocks.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-[10px] text-white/35">
                {pagination.total.toLocaleString()} block{pagination.total === 1 ? '' : 's'} — page {Math.min(page, totalPages)} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ContentBlockDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editingBlock={editingBlock}
        form={form}
        isPending={editingBlock ? updateMutation.isPending : createMutation.isPending}
        onSubmit={() => {
          const payload = buildPayload(form);
          if (editingBlock) updateMutation.mutate({ id: editingBlock.id, payload });
          else createMutation.mutate(payload);
        }}
        onUpdateField={updateField}
        onImageUpload={handleImageUpload}
        onImageRemove={handleImageRemove}
      />
    </div>
  );
}

function defaultForm(placement: string, status: string): BlockFormState {
  return {
    title: '',
    subtitle: '',
    body: '',
    imageUrl: '',
    imagePublicId: '',
    linkUrl: '',
    placement: placement || 'HOME_HERO',
    status: status || 'DRAFT',
    sortOrder: 0,
    visibleFrom: '',
    visibleTo: '',
  };
}

function NoPermission({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[55vh] animate-fade-up">
      <Card className="border border-white/10 w-full max-w-md">
        <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
          <ShieldAlert className="h-9 w-9 text-white/20" />
          <p className="text-sm font-bold text-white/80">You don&apos;t have permission to view {title}.</p>
          <p className="text-[11px] text-white/40 max-w-xs">Contact a super admin if you believe this is a mistake.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-white/30">{hint}</p>}
    </div>
  );
}

interface ContentBlockDialogProps {
  open: boolean;
  onClose: () => void;
  editingBlock: ContentBlock | null;
  form: BlockFormState;
  isPending: boolean;
  onSubmit: () => void;
  onUpdateField: (key: keyof BlockFormState, value: string | number) => void;
  onImageUpload: (result: UploadResult) => void;
  onImageRemove: () => void;
}

function ContentBlockDialog({ open, onClose, editingBlock, form, isPending, onSubmit, onUpdateField, onImageUpload, onImageRemove }: ContentBlockDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-[#0d0d12] border border-white/10 rounded-2xl flex flex-col overflow-hidden"
        style={{ width: '100%', maxWidth: 640, maxHeight: 'calc(100dvh - 32px)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 shrink-0">
          <h2 className="text-sm font-bold text-white">
            {editingBlock ? `Edit Content Block` : 'New Content Block'}
          </h2>
          {editingBlock && (
            <p className="text-[11px] text-white/35 mt-0.5 truncate">Editing: {editingBlock.title}</p>
          )}
        </div>

        {/* Scrollable form */}
        <form
          id="content-block-form"
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
          className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-6 py-4 sm:py-5 space-y-4"
        >
          {/* Title + Subtitle row on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title">
              <input
                value={form.title}
                placeholder="Summer Sale Banner"
                onChange={(e) => onUpdateField('title', e.target.value)}
                className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
            </Field>
            <Field label="Subtitle">
              <input
                value={form.subtitle}
                placeholder="Supporting text"
                onChange={(e) => onUpdateField('subtitle', e.target.value)}
                className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
            </Field>
          </div>

          <Field label="Body">
            <textarea
              value={form.body}
              rows={3}
              placeholder="Longer description or copy"
              className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none"
              onChange={(e) => onUpdateField('body', e.target.value)}
            />
          </Field>

          {/* Image Upload — replaces Image URL field */}
          <ImageUploadField
            label="Image"
            hint="Displayed as the banner or content image"
            folder="banners"
            value={form.imageUrl}
            onChange={onImageUpload}
            onRemove={onImageRemove}
          />

          <Field label="Link URL">
            <input
              value={form.linkUrl}
              placeholder="/collections/sale"
              onChange={(e) => onUpdateField('linkUrl', e.target.value)}
              className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Placement">
              <select value={form.placement} onChange={(e) => onUpdateField('placement', e.target.value)} className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors cursor-pointer">
                {CONTENT_PLACEMENTS.map((placement) => (
                  <option key={placement} value={placement}>{placement.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => onUpdateField('status', e.target.value)} className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors cursor-pointer">
                {CONTENT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Sort Order" hint="Lower shows first">
              <input
                type="number"
                value={form.sortOrder}
                className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-colors"
                onChange={(e) => onUpdateField('sortOrder', Number(e.target.value))}
              />
            </Field>
            <Field label="Visible From" hint="Optional">
              <input
                type="datetime-local"
                value={form.visibleFrom}
                onChange={(e) => onUpdateField('visibleFrom', e.target.value)}
                className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-colors"
              />
            </Field>
          </div>

          <Field label="Visible To" hint="Optional">
            <input
              type="datetime-local"
              value={form.visibleTo}
              onChange={(e) => onUpdateField('visibleTo', e.target.value)}
              className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-colors"
            />
          </Field>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/5 shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="content-block-form" isLoading={isPending} disabled={!form.title.trim()}>
            <Save className="mr-2 h-3.5 w-3.5" /> {editingBlock ? 'Save Changes' : 'Create Block'}
          </Button>
        </div>
      </div>
    </div>
  );
}