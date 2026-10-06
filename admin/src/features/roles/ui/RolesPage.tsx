"use client";

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi, type AdminRole, type PermissionGroup } from '@/lib/api/rolesApi';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Card, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Dialog } from '@/shared/components/Dialog';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { Edit2, Plus, Search, ShieldAlert, Shield, Trash2, Users } from 'lucide-react';

interface RoleFormState {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'An unexpected error occurred');

export function RolesPage() {
  const { can, roleName, roleId } = usePermissions();
  const { showToast } = useUIStore();
  const { showConfirm } = useConfirmStore();
  const queryClient = useQueryClient();

  const canManage = can('admin.roles.manage');

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [form, setForm] = useState<RoleFormState>({ name: '', displayName: '', description: '', permissions: [] });

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.getRoles,
    staleTime: 30 * 1000,
  });

  const { data: catalog } = useQuery({
    queryKey: ['permission-catalog'],
    queryFn: rolesApi.getCatalog,
    staleTime: 10 * 60 * 1000,
  });

  const roles = useMemo(() => rolesData?.roles ?? [], [rolesData]);
  const groups = catalog?.groups ?? [];
  const allPermissionKeys = catalog?.permissions ?? [];

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.displayName || '').toLowerCase().includes(q)
    );
  }, [roles, search]);

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: '', displayName: '', description: '', permissions: [] });
    setDialogOpen(true);
  };

  const openEdit = (role: AdminRole) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description || '',
      permissions: role.permissions ?? [],
    });
    setDialogOpen(true);
  };

  const updateField = (key: 'name' | 'displayName' | 'description', value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const togglePermission = (permissionKey: string) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(permissionKey)
        ? f.permissions.filter((k) => k !== permissionKey)
        : [...f.permissions, permissionKey],
    }));

  const toggleGroup = (group: PermissionGroup) =>
    setForm((f) => {
      const keys = group.permissions.map((p) => p.key);
      const allSelected = keys.every((k) => f.permissions.includes(k));
      if (allSelected) return { ...f, permissions: f.permissions.filter((k) => !keys.includes(k)) };
      return { ...f, permissions: Array.from(new Set([...f.permissions, ...keys])) };
    });

  const toggleAll = () =>
    setForm((f) => {
      const allSelected = allPermissionKeys.length > 0 && allPermissionKeys.every((k) => f.permissions.includes(k));
      if (allSelected) return { ...f, permissions: f.permissions.filter((k) => !allPermissionKeys.includes(k)) };
      return { ...f, permissions: Array.from(new Set([...f.permissions, ...allPermissionKeys])) };
    });

  const createMutation = useMutation({
    mutationFn: (payload: RoleFormState) =>
      rolesApi.createRole({
        name: payload.name.trim().toUpperCase(),
        displayName: payload.displayName.trim(),
        description: payload.description.trim() || undefined,
        permissions: payload.permissions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast('Role created.', 'success');
      setDialogOpen(false);
    },
    onError: (e) => showToast(errorMessage(e), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RoleFormState }) =>
      rolesApi.updateRole(id, {
        displayName: payload.displayName.trim(),
        description: payload.description.trim() || undefined,
        permissions: payload.permissions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      if (editingRole?.id === roleId) queryClient.invalidateQueries({ queryKey: ['my-permissions'] });
      showToast('Role updated.', 'success');
      setDialogOpen(false);
    },
    onError: (e) => showToast(errorMessage(e), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast('Role deleted.', 'info');
    },
    onError: (e) => showToast(errorMessage(e), 'error'),
  });

  const handleDelete = (role: AdminRole) => {
    showConfirm({
      title: 'Delete Role',
      message: `Are you sure you want to delete "${role.displayName}"?`,
      confirmText: 'Delete Role',
      onConfirm: () => deleteMutation.mutate(role.id),
    });
  };

  if (!canManage) {
    return <NoPermission title="Roles & Permissions" />;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Roles & Permissions</h1>
          <p className="text-xs text-white/45 mt-1">Create admin roles and control what each admin can access</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-3.5 w-3.5" /> Create Role
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <Input className="pl-9" placeholder="Filter by role name or display name" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
          <Shield className="mx-auto h-12 w-12 text-white/20 mb-4" />
          <h4 className="text-base font-bold text-white/60">No roles found</h4>
          <p className="text-sm text-white/30 mt-1">{search ? 'Try a different search.' : 'Create your first role to get started.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRoles.map((role) => {
            const isCurrent = role.name === roleName || (roleId != null && role.id === roleId);
            return (
              <Card key={role.id} className={`border glass-hover ${isCurrent ? 'border-emerald-500/30' : 'border-white/[0.06]'}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white/90 flex items-center gap-2">
                        <span className="truncate">{role.displayName}</span>
                        {role.isSystem && <Badge variant="outline" className="text-[8px] shrink-0">System</Badge>}
                        {isCurrent && <Badge variant="success" className="text-[8px] shrink-0">You</Badge>}
                      </p>
                      <p className="font-mono text-[10px] text-white/35 mt-0.5 truncate">{role.name}</p>
                      <p className="text-[11px] text-white/45 mt-2 line-clamp-2">{role.description || 'No description'}</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px] shrink-0">{role.permissions?.length ?? 0} perms</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <span className="text-[10px] text-white/35 flex items-center gap-1">
                      <Users className="h-3 w-3" /> {(role.adminCount ?? 0).toLocaleString()} admin{(role.adminCount ?? 0) === 1 ? '' : 's'}
                    </span>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEdit(role)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {!role.isSystem && (
                        <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => handleDelete(role)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RoleFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editingRole={editingRole}
        groups={groups}
        allPermissionKeys={allPermissionKeys}
        form={form}
        isPending={editingRole ? updateMutation.isPending : createMutation.isPending}
        onSubmit={() => {
          if (editingRole) updateMutation.mutate({ id: editingRole.id, payload: form });
          else createMutation.mutate(form);
        }}
        onUpdateField={updateField}
        onTogglePermission={togglePermission}
        onToggleGroup={toggleGroup}
        onToggleAll={toggleAll}
      />
    </div>
  );
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">{label}</label>
      {children}
    </div>
  );
}

interface RoleFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingRole: AdminRole | null;
  groups: PermissionGroup[];
  allPermissionKeys: string[];
  form: RoleFormState;
  isPending: boolean;
  onSubmit: () => void;
  onUpdateField: (key: 'name' | 'displayName' | 'description', value: string) => void;
  onTogglePermission: (permissionKey: string) => void;
  onToggleGroup: (group: PermissionGroup) => void;
  onToggleAll: () => void;
}

function RoleFormDialog({
  open,
  onClose,
  editingRole,
  groups,
  allPermissionKeys,
  form,
  isPending,
  onSubmit,
  onUpdateField,
  onTogglePermission,
  onToggleGroup,
  onToggleAll,
}: RoleFormDialogProps) {
  const isSystem = !!editingRole?.isSystem;
  const allPermissionSelected = allPermissionKeys.length > 0 && allPermissionKeys.every((k) => form.permissions.includes(k));

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={editingRole ? 'Edit Role' : 'Create Role'}
      description={editingRole ? `Update ${editingRole.displayName}` : 'Create a new admin role with granular permissions'}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="space-y-4"
      >
        <Field label="Role Name">
          <Input
            value={form.name}
            disabled={isSystem}
            placeholder="REGIONAL_MANAGER"
            className="uppercase font-mono"
            onChange={(e) => onUpdateField('name', e.target.value)}
            onBlur={() => onUpdateField('name', form.name.trim().toUpperCase())}
          />
          {isSystem && <p className="text-[10px] text-white/30">System role names cannot be changed.</p>}
        </Field>
        <Field label="Display Name">
          <Input
            value={form.displayName}
            placeholder="Regional Manager"
            onChange={(e) => onUpdateField('displayName', e.target.value)}
          />
        </Field>
        <Field label="Description">
          <textarea
            value={form.description}
            rows={2}
            placeholder="What can this role do?"
            className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white resize-none"
            onChange={(e) => onUpdateField('description', e.target.value)}
          />
        </Field>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Permissions ({form.permissions.length})</p>
            <button type="button" onClick={onToggleAll} className="text-[10px] font-bold text-white/60 hover:text-white cursor-pointer">
              {allPermissionSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          {/* Permission catalogue */}
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 rounded-xl border border-white/10 p-3">
            {groups.length === 0 ? (
              <p className="text-xs text-white/30 py-4 text-center">No permissions available.</p>
            ) : (
              groups.map((group) => {
                const selectedCount = group.permissions.filter((p) => form.permissions.includes(p.key)).length;
                const allInGroup = group.permissions.length > 0 && selectedCount === group.permissions.length;
                return (
                  <div key={group.group} className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
                    <div className="flex items-center justify-between px-1 py-1">
                      <button type="button" onClick={() => onToggleGroup(group)} className="text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white cursor-pointer">
                        {group.group} <span className="text-white/30 font-mono normal-case">({selectedCount}/{group.permissions.length})</span>
                      </button>
                      <button type="button" onClick={() => onToggleGroup(group)} className="text-[9px] text-white/40 hover:text-white cursor-pointer">
                        {allInGroup ? 'Clear' : 'All'}
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {group.permissions.map((permission) => (
                        <label key={permission.key} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.04] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(permission.key)}
                            className="accent-white cursor-pointer"
                            onChange={() => onTogglePermission(permission.key)}
                          />
                          <span className="text-xs text-white/75">{permission.label}</span>
                          <span className="ml-auto font-mono text-[9px] text-white/25 truncate">{permission.key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isPending} disabled={!form.displayName.trim()}>
            {editingRole ? 'Save Changes' : 'Create Role'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}