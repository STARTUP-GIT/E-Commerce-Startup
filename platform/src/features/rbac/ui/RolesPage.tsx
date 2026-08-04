"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/authApi';
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
import { ShieldCheck, Plus, Trash2, Pencil, Lock } from 'lucide-react';

export interface PermissionRecord {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  module: string;
  createdAt: string;
}

export interface RoleRecord {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: string;
  permissions: PermissionRecord[];
  _count?: { users: number };
}

export function RolesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { showConfirm } = useConfirmStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [form, setForm] = useState({ name: '', description: '', permissionIds: [] as string[] });

  const { data: rolesData, isLoading } = useQuery({ queryKey: ['platform-roles'], queryFn: authApi.listRoles });
  const { data: permsData } = useQuery({ queryKey: ['platform-permissions'], queryFn: authApi.listPermissions });

  const roles = (rolesData?.roles ?? []) as RoleRecord[];

  const groupedPermissions = React.useMemo(() => {
    const perms = (permsData?.permissions ?? []) as PermissionRecord[];
    const groups = new Map<string, PermissionRecord[]>();
    for (const perm of perms) {
      const list = groups.get(perm.module) ?? [];
      list.push(perm);
      groups.set(perm.module, list);
    }
    return Array.from(groups.entries());
  }, [permsData]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
    queryClient.invalidateQueries({ queryKey: ['platform-permissions'] });
  };

  const createRole = useMutation({
    mutationFn: () =>
      authApi.createRole({ name: form.name, description: form.description || undefined, permissionIds: form.permissionIds }),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      closeDialog();
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to create role.', 'error'),
  });

  const updateRole = useMutation({
    mutationFn: () => {
      if (!editingRole) throw new Error('No role selected');
      return authApi.updateRole(editingRole.id, {
        name: form.name,
        description: form.description || undefined,
        permissionIds: form.permissionIds,
      });
    },
    onSuccess: (res) => {
      showToast(res.message, 'success');
      closeDialog();
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to update role.', 'error'),
  });

  const deleteRole = useMutation({
    mutationFn: (id: string) => authApi.deleteRole(id),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to delete role.', 'error'),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRole(null);
    setForm({ name: '', description: '', permissionIds: [] });
  };

  const openEdit = (role: RoleRecord) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description ?? '',
      permissionIds: role.permissions.map((p) => p.id),
    });
    setDialogOpen(true);
  };

  const togglePermission = (id: string) => {
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id)
        ? prev.permissionIds.filter((p) => p !== id)
        : [...prev.permissionIds, id],
    }));
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Roles"
        description="Define permission groups that scope platform access."
        actions={
          <Button
            onClick={() => {
              setEditingRole(null);
              setForm({ name: '', description: '', permissionIds: [] });
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Role
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-white/60" />
            Roles ({roles.length})
          </CardTitle>
          <CardDescription>System roles are locked and cannot be deleted.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white/90">{role.name}</p>
                        {role.isSystem && <Lock className="h-3 w-3 text-white/30" />}
                      </div>
                      {role.description && (
                        <p className="text-[10px] text-white/40 mt-0.5 max-w-[200px] truncate">{role.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[9px] font-mono">{role.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {role.permissions.slice(0, 4).map((perm) => (
                          <Badge key={perm.id} variant="outline" className="text-[9px] font-mono">{perm.key}</Badge>
                        ))}
                        {role.permissions.length > 4 && (
                          <Badge variant="outline" className="text-[9px]">+{role.permissions.length - 4}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-white/70">{role._count?.users ?? 0}</TableCell>
                    <TableCell className="text-[10px] text-white/50 whitespace-nowrap">
                      {new Date(role.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Edit"
                          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                          onClick={() => openEdit(role)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {!role.isSystem && (
                          <button
                            title="Delete"
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                            onClick={() =>
                              showConfirm({
                                title: 'Delete role?',
                                message: `The role "${role.name}" will be removed. Users assigned to it will lose their permissions.`,
                                confirmText: 'Delete',
                                onConfirm: () => deleteRole.mutate(role.id),
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
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
        onClose={closeDialog}
        title={editingRole ? 'Edit Role' : 'Create Role'}
        description={editingRole ? `Update permissions for ${editingRole.name}.` : 'Build a new permission set.'}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (editingRole) updateRole.mutate();
            else createRole.mutate();
          }}
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!!editingRole?.isSystem} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Description</label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Permissions</label>
            {groupedPermissions.map(([module, perms]) => (
              <div key={module} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">{module}</p>
                <div className="flex flex-wrap gap-1.5">
                  {perms.map((perm) => (
                    <button
                      key={perm.id}
                      type="button"
                      onClick={() => togglePermission(perm.id)}
                      title={perm.name}
                      className={`px-2.5 py-1 rounded-lg border text-[9px] font-mono transition-colors cursor-pointer ${
                        form.permissionIds.includes(perm.id)
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/10 bg-white/[0.02] text-white/40 hover:text-white/70'
                      }`}
                    >
                      {perm.key}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Button
            type="submit"
            className="w-full gap-2"
            isLoading={createRole.isPending || updateRole.isPending}
            disabled={!form.name.trim()}
          >
            <ShieldCheck className="h-4 w-4" />
            {editingRole ? 'Save Role' : 'Create Role'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
