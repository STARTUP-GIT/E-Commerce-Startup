"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { FeatureFlagFormDialog } from './FeatureFlagFormDialog';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Card, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { Plus, Search, ToggleLeft, ToggleRight, Trash2, Eye } from 'lucide-react';
import type { FeatureFlag, FeatureFlagPayload } from '../types';

const statusVariant: Record<string, 'success' | 'warning' | 'secondary' | 'destructive' | 'default' | 'outline'> = {
  ENABLED: 'success',
  BETA: 'warning',
  INTERNAL: 'secondary',
  SCHEDULED: 'warning',
  DEPRECATED: 'destructive',
  DISABLED: 'outline',
};

export function FeatureFlagsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);

  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const {
    flags, isLoading, catalog,
    create, isCreating, update, isUpdating,
    toggle, remove,
  } = useFeatureFlags({ search: search || undefined, status: statusFilter || undefined, scope: scopeFilter || undefined });

  const handleCreate = async (payload: FeatureFlagPayload) => {
    await create(payload);
    setIsFormOpen(false);
  };

  const handleUpdate = async (payload: FeatureFlagPayload) => {
    if (!editingFlag) return;
    await update({ id: editingFlag.id, payload });
    setEditingFlag(null);
    setIsFormOpen(false);
  };

  const handleDelete = (flag: FeatureFlag) => {
    showConfirm({
      title: `Delete ${flag.key}?`,
      message: `This will permanently remove the feature flag "${flag.displayName}". This action cannot be undone.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        await remove(flag.id);
      },
    });
  };

  const handleToggle = (flag: FeatureFlag) => {
    toggle({ id: flag.id, enabled: !flag.enabled });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Feature Flags</h2>
          <p className="text-xs text-white/45 mt-1">
            Gate functionality platform-wide with deterministic rollout targeting.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingFlag(null);
            setIsFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Flag
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-white/25 pointer-events-none" />
            <Input
              placeholder="Search flags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            className="glass-input h-10 rounded-xl px-3 text-xs text-white/80 min-w-[140px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {catalog?.statuses?.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="glass-input h-10 rounded-xl px-3 text-xs text-white/80 min-w-[140px]"
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
          >
            <option value="">All Scopes</option>
            {catalog?.scopes?.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Flags" value={flags.length} />
        <StatCard label="Enabled" value={flags.filter((f) => f.enabled).length} accent="text-emerald-400" />
        <StatCard label="Beta / Internal" value={flags.filter((f) => f.status === 'BETA' || f.status === 'INTERNAL').length} accent="text-yellow-400" />
        <StatCard label="Disabled" value={flags.filter((f) => !f.enabled).length} accent="text-white/40" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : flags.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-bold text-white/70">No feature flags found</p>
              <p className="text-xs text-white/40 mt-1">Create your first flag to start gating features.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flag</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rollout</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell>
                      <div>
                        <p className="text-xs font-bold text-white/90 font-mono">{flag.key}</p>
                        <p className="text-[10px] text-white/40">{flag.displayName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px]">{flag.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[9px]">{flag.scope}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[flag.status] ?? 'default'}>{flag.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-white/80"
                            style={{ width: `${flag.rolloutPercentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-white/60">{flag.rolloutPercentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggle(flag)}
                        className="cursor-pointer text-white/50 hover:text-white transition-colors"
                        title={flag.enabled ? 'Disable' : 'Enable'}
                      >
                        {flag.enabled ? <ToggleRight className="h-5 w-5 text-emerald-400" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/feature-flags/${flag.id}`}
                          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setEditingFlag(flag);
                            setIsFormOpen(true);
                          }}
                          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <span className="text-xs font-bold">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(flag)}
                          className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <FeatureFlagFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingFlag(null);
        }}
        onSubmit={editingFlag ? handleUpdate : handleCreate}
        isSubmitting={editingFlag ? isUpdating : isCreating}
        editingFlag={editingFlag}
      />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-black mt-1 ${accent ?? 'text-white'}`}>{value}</p>
    </div>
  );
}
