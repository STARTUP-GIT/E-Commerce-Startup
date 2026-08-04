"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, type PlatformRole, type PlatformUser } from '@/features/auth/api/authApi';
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
import { Users, Plus, KeyRound, Power, Shield } from 'lucide-react';

export function UsersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { showConfirm } = useConfirmStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
  const [resetTarget, setResetTarget] = useState<PlatformUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const { data: usersData, isLoading } = useQuery({ queryKey: ['platform-users'], queryFn: authApi.listUsers });
  const { data: rolesData } = useQuery({ queryKey: ['platform-roles'], queryFn: authApi.listRoles });

  const users = usersData?.users ?? [];
  const roles = rolesData?.roles as PlatformRole[] | undefined ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['platform-users'] });

  const createUser = useMutation({
    mutationFn: () => authApi.createUser({ ...form, firstName: form.firstName, roleId: form.roleId }),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      setDialogOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to create user.', 'error'),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authApi.updateUserStatus(id, status === 'active' ? 'suspended' : 'active'),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to update user.', 'error'),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: string }) => authApi.updateUserRole(id, roleId),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to update role.', 'error'),
  });

  const resetUserPassword = useMutation({
    mutationFn: (password: string) => {
      if (!resetTarget) throw new Error('No user selected');
      return authApi.resetUserPassword(resetTarget.id, password);
    },
    onSuccess: (res) => {
      showToast(res.message, 'success');
      setResetTarget(null);
      setResetPassword('');
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to reset password.', 'error'),
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Platform Users"
        description="Manage who can operate the control plane."
        actions={
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-white/60" />
            Users ({users.length})
          </CardTitle>
          <CardDescription>Each user is scoped by an assigned role.</CardDescription>
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
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black text-white/70 uppercase">
                          {user.firstName?.[0] ?? user.email[0] ?? '?'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/90">
                            {user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '—'}
                            {user.isOwner && <span className="ml-1.5 text-[8px] font-black text-yellow-400">OWNER</span>}
                          </p>
                          <p className="text-[10px] text-white/45">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <select
                        className="glass-input h-8 rounded-lg px-2 text-[10px] text-white/80 min-w-[130px]"
                        value={user.roleId ?? ''}
                        disabled={user.isOwner}
                        onChange={(e) => updateRole.mutate({ id: user.id, roleId: e.target.value })}
                      >
                        <option value="">—</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'success' : 'destructive'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-white/50 whitespace-nowrap">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Reset password"
                          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                          onClick={() => setResetTarget(user)}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        {!user.isOwner && (
                          <button
                            title={user.status === 'active' ? 'Suspend' : 'Activate'}
                            className="p-1.5 rounded-lg text-white/40 hover:text-yellow-400 hover:bg-white/5 transition-colors"
                            onClick={() =>
                              showConfirm({
                                title: user.status === 'active' ? 'Suspend user?' : 'Activate user?',
                                message: `${user.email} will be ${user.status === 'active' ? 'blocked from signing in' : 'allowed to sign in'}.`,
                                confirmText: user.status === 'active' ? 'Suspend' : 'Activate',
                                onConfirm: () => toggleStatus.mutate({ id: user.id, status: user.status }),
                              })
                            }
                          >
                            <Power className="h-3.5 w-3.5" />
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
        onClose={() => setDialogOpen(false)}
        title="Add Platform User"
        description="Invite someone to operate the platform."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.firstName.trim() && form.email.trim() && form.roleId) createUser.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">First name</label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Last name</label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Email</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Initial password</label>
            <Input
              type="password"
              placeholder="Leave empty for generated password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Role</label>
            <select
              className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white"
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            className="w-full gap-2"
            isLoading={createUser.isPending}
            disabled={!form.firstName.trim() || !form.email.trim() || !form.roleId}
          >
            <Shield className="h-4 w-4" />
            Create User
          </Button>
        </form>
      </Dialog>

      <Dialog
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Password"
        description={`Set a new password for ${resetTarget?.email ?? ''}.`}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (resetPassword) resetUserPassword.mutate(resetPassword);
          }}
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">New password</label>
            <Input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full gap-2" isLoading={resetUserPassword.isPending} disabled={!resetPassword}>
            <KeyRound className="h-4 w-4" />
            Set Password
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
