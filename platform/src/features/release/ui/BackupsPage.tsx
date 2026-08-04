"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { backupApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { DatabaseBackup, Plus, Trash2, RefreshCw } from 'lucide-react';

export function BackupsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { showConfirm } = useConfirmStore();
  const [label, setLabel] = useState('');
  const [location, setLocation] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['backups'],
    queryFn: backupApi.list,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['backups'] });

  const createBackup = useMutation({
    mutationFn: () => backupApi.create({ label: label.trim() || undefined, location: location.trim() || undefined }),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      setLabel('');
      setLocation('');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to create backup.', 'error'),
  });

  const removeBackup = useMutation({
    mutationFn: (id: string) => backupApi.remove(id),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to delete backup.', 'error'),
  });

  const backups = data?.backups ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Backups"
        description="Snapshot history of the platform database."
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-xs font-bold text-white/60 hover:text-white/90 hover:border-white/25 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Backup label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="sm:max-w-[220px]"
          />
          <Input
            placeholder="Storage location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => createBackup.mutate()} className="gap-2" isLoading={createBackup.isPending}>
            <Plus className="h-4 w-4" />
            Take Backup
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-4 w-4 text-white/60" />
            Snapshots ({backups.length})
          </CardTitle>
          <CardDescription>Backups created through the platform.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : backups.length === 0 ? (
            <p className="text-xs text-white/40 py-10 text-center">No backups taken yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="text-xs font-bold text-white/90">{backup.label || 'Unlabeled backup'}</TableCell>
                    <TableCell className="text-[10px] text-white/50 whitespace-nowrap">
                      {new Date(backup.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-[10px] text-white/60">{backup.sizeMb} MB</TableCell>
                    <TableCell className="text-[10px] font-mono text-white/40 max-w-[180px] truncate">
                      {backup.location}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={backup.status === 'completed' ? 'success' : backup.status === 'failed' ? 'destructive' : 'warning'}
                      >
                        {backup.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        title="Delete"
                        className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                        onClick={() =>
                          showConfirm({
                            title: 'Delete backup?',
                            message: `The snapshot "${backup.label || backup.id}" will be permanently removed.`,
                            confirmText: 'Delete',
                            onConfirm: () => removeBackup.mutate(backup.id),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
