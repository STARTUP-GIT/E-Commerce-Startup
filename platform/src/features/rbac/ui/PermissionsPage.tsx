"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/authApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { KeySquare, Plus, Trash2 } from 'lucide-react';
import type { PermissionRecord } from '@/features/rbac/ui/RolesPage';

export function PermissionsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { showConfirm } = useConfirmStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ key: '', name: '', description: '', module: '' });

  const { data, isLoading } = useQuery({ queryKey: ['platform-permissions'], queryFn: authApi.listPermissions });

  const grouped = React.useMemo(() => {
    const perms = (data?.permissions ?? []) as PermissionRecord[];
    const groups = new Map<string, PermissionRecord[]>();
    for (const perm of perms) {
      const list = groups.get(perm.module) ?? [];
      list.push(perm);
      groups.set(perm.module, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['platform-permissions'] });

  const createPermission = useMutation({
    mutationFn: () =>
      authApi.createPermission({
        key: form.key.toUpperCase(),
        name: form.name,
        description: form.description || undefined,
        module: form.module,
      }),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      setDialogOpen(false);
      setForm({ key: '', name: '', description: '', module: '' });
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to create permission.', 'error'),
  });

  const deletePermission = useMutation({
    mutationFn: (id: string) => authApi.deletePermission(id),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to delete permission.', 'error'),
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Permissions"
        description="Atomic capabilities that roles grant to users."
        actions={
          <Button
            onClick={() => {
              setForm({ key: '', name: '', description: '', module: '' });
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Permission
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {grouped.map(([module, perms]) => (
            <Card key={module}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeySquare className="h-4 w-4 text-white/60" />
                  {module}
                  <Badge variant="secondary" className="text-[9px]">{perms.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {perms.map((perm) => (
                  <div key={perm.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] font-mono font-bold text-white/90">{perm.key}</code>
                      </div>
                      <p className="text-[10px] text-white/50 mt-0.5">{perm.name}</p>
                      {perm.description && (
                        <p className="text-[9px] text-white/30 mt-0.5">{perm.description}</p>
                      )}
                    </div>
                    <button
                      title="Delete permission"
                      className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors shrink-0"
                      onClick={() =>
                        showConfirm({
                          title: 'Delete permission?',
                          message: `"${perm.key}" will be removed from the catalogue. Roles using it may be affected.`,
                          confirmText: 'Delete',
                          onConfirm: () => deletePermission.mutate(perm.id),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="New Permission"
        description="Add an atomic capability to the permission catalogue."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.key.trim() && form.name.trim() && form.module.trim()) createPermission.mutate();
          }}
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Key</label>
            <Input
              placeholder="e.g. SETTINGS_MANAGE"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Name</label>
            <Input placeholder="e.g. Manage Settings" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Module</label>
            <Input placeholder="e.g. settings" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value.toLowerCase() })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Description</label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Button
            type="submit"
            className="w-full gap-2"
            isLoading={createPermission.isPending}
            disabled={!form.key.trim() || !form.name.trim() || !form.module.trim()}
          >
            <KeySquare className="h-4 w-4" />
            Create Permission
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
