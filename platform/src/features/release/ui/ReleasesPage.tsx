"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { releaseApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import type { ReleaseRecord } from '@/types/platform';
import { Rocket, Plus, Trash2, RotateCcw, CheckCircle2 } from 'lucide-react';

const RELEASE_STATUSES = ['pending', 'released', 'rolled_back', 'deprecated'] as const;
const STATUS_VARIANT: Record<string, 'outline' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  pending: 'warning',
  released: 'success',
  rolled_back: 'destructive',
  deprecated: 'secondary',
};

export function ReleasesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { showConfirm } = useConfirmStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ version: '', name: '', notes: '', status: 'pending' as string });

  const { data, isLoading } = useQuery({ queryKey: ['releases'], queryFn: releaseApi.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['releases'] });

  const createRelease = useMutation({
    mutationFn: () => releaseApi.create(form as { version: string; name: string; notes: string; status: string }),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      setDialogOpen(false);
      setForm({ version: '', name: '', notes: '', status: 'pending' });
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to create release.', 'error'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReleaseRecord['status'] }) => releaseApi.update(id, { status }),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to update release.', 'error'),
  });

  const removeRelease = useMutation({
    mutationFn: (id: string) => releaseApi.remove(id),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to delete release.', 'error'),
  });

  const releases = data?.versions ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Releases"
        description="Manage the release pipeline and current version state."
        actions={
          <Button
            onClick={() => {
              setForm({ version: '', name: '', notes: '', status: 'pending' });
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Release
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-white/60" />
            Version History ({releases.length})
          </CardTitle>
          <CardDescription>Every published version with its lifecycle status.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : releases.length === 0 ? (
            <p className="text-xs text-white/40 py-10 text-center">No releases yet. Create the first one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Released At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell className="text-xs font-mono font-bold text-white/90">{release.version}</TableCell>
                    <TableCell className="text-xs text-white/80">{release.name}</TableCell>
                    <TableCell className="text-[10px] text-white/45 max-w-[240px] truncate">{release.notes}</TableCell>
                    <TableCell className="text-[10px] text-white/50 whitespace-nowrap">
                      {release.releasedAt ? new Date(release.releasedAt).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[release.status] ?? 'secondary'}>{release.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {release.status === 'pending' && (
                          <button
                            title="Mark released"
                            className="p-1.5 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-white/5 transition-colors"
                            onClick={() =>
                              showConfirm({
                                title: 'Publish release?',
                                message: `Mark version ${release.version} as released.`,
                                confirmText: 'Publish',
                                onConfirm: () => updateStatus.mutate({ id: release.id, status: 'released' }),
                              })
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {release.status === 'released' && (
                          <button
                            title="Roll back"
                            className="p-1.5 rounded-lg text-white/40 hover:text-yellow-400 hover:bg-white/5 transition-colors"
                            onClick={() =>
                              showConfirm({
                                title: 'Roll back release?',
                                message: `Roll back version ${release.version}.`,
                                confirmText: 'Roll back',
                                onConfirm: () => updateStatus.mutate({ id: release.id, status: 'rolled_back' }),
                              })
                            }
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          title="Delete"
                          className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                          onClick={() =>
                            showConfirm({
                              title: 'Delete release?',
                              message: `Version ${release.version} will be permanently removed from history.`,
                              confirmText: 'Delete',
                              onConfirm: () => removeRelease.mutate(release.id),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="New Release"
        description="Record a new version in the release pipeline."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.version.trim() && form.name.trim()) createRelease.mutate();
          }}
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Version</label>
            <Input placeholder="e.g. 2.4.0" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Name</label>
            <Input placeholder="e.g. Aurora Drop" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Release notes</label>
            <textarea
              className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white min-h-[90px] resize-none"
              placeholder="What shipped in this release?"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Initial status</label>
            <select
              className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {RELEASE_STATUSES.map((status) => (
                <option key={status} value={status}>{status.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            className="w-full gap-2"
            isLoading={createRelease.isPending}
            disabled={!form.version.trim() || !form.name.trim()}
          >
            <Rocket className="h-4 w-4" />
            Create Release
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
