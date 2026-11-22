"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, type AdminInvitationItem, type AdminAccessRequestItem, type AdminAuditLogItem } from "@/features/auth/api/authApi";
import { rolesApi, type AdminRole } from "@/lib/api/rolesApi";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUIStore } from "@/lib/store/uiStore";
import { useConfirmStore } from "@/lib/store/confirmStore";
import { Dialog } from "@/shared/components/Dialog";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { PasswordInput } from "@/shared/components/PasswordInput";
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Search,
  X,
  Save,
  Clock,
  Mail,
  CheckCircle,
  AlertCircle,
  Key,
  RotateCcw,
  Trash2,
  Ban,
  Lock,
  Calendar,
  LogOut,
  Send,
  Activity,
  ChevronDown,
  Sparkles,
} from "lucide-react";

type TabType = "admins" | "invitations" | "requests" | "audit";

function roleBadge(role?: string, isSuper?: boolean) {
  const label = isSuper ? "Super Admin" : (role ?? "Admin");
  const color = isSuper
    ? "bg-white/10 border-white/20 text-white"
    : "bg-white/5 border-white/10 text-white/60";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${color}`}>
      {isSuper ? <ShieldAlert className="h-2.5 w-2.5 text-amber-400" /> : <Shield className="h-2.5 w-2.5 text-zinc-400" />}
      {label}
    </span>
  );
}

function statusBadge(status?: string, isActive?: boolean) {
  const actual = status || (isActive ? "ACTIVE" : "DISABLED");
  let color = "bg-white/5 border-white/10 text-white/50";
  let icon = <Clock className="h-2.5 w-2.5" />;

  if (actual === "ACTIVE") {
    color = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    icon = <CheckCircle className="h-2.5 w-2.5" />;
  } else if (actual === "SUSPENDED") {
    color = "bg-rose-500/10 border-rose-500/20 text-rose-400";
    icon = <Ban className="h-2.5 w-2.5" />;
  } else if (actual === "DISABLED") {
    color = "bg-zinc-800 border-zinc-700 text-zinc-400";
    icon = <AlertCircle className="h-2.5 w-2.5" />;
  } else if (actual === "PENDING" || actual === "PENDING_INVITATION" || actual === "PENDING_APPROVAL") {
    color = "bg-amber-500/10 border-amber-500/20 text-amber-400";
    icon = <Clock className="h-2.5 w-2.5" />;
  } else if (actual === "EXPIRED") {
    color = "bg-red-500/10 border-red-500/20 text-red-400";
    icon = <AlertCircle className="h-2.5 w-2.5" />;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${color}`}>
      {icon}
      {actual.replace("_", " ")}
    </span>
  );
}

function formatDate(val?: string | null) {
  if (!val) return "Never";
  return new Date(val).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeExpiry(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m left`;
}

export default function AdminManagementPage() {
  const { admin: me } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const showConfirm = useConfirmStore((s) => s.showConfirm);

  const [activeTab, setActiveTab] = useState<TabType>("admins");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ─── Invite Admin Modal State ─────────────────────────────────
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    fullName: "",
    phone: "",
    roleId: "",
  });

  // ─── Edit Admin Role Modal State ──────────────────────────────
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  // ─── Reset Password Modal State ───────────────────────────────
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [resetPw, setResetPw] = useState("");

  // ─── Approve Access Request Modal State ───────────────────────
  const [approvingRequest, setApprovingRequest] = useState<AdminAccessRequestItem | null>(null);
  const [approvalRoleId, setApprovalRoleId] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");

  // ─── Fetch Admins, Roles, Invitations, Access Requests, Audit ─
  const { data: adminsData, isLoading: adminsLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: authApi.listAdmins,
    enabled: !!me?.isSuperAdmin,
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: rolesApi.getRoles,
    enabled: !!me?.isSuperAdmin,
  });

  const { data: invitationsData, isLoading: invitationsLoading } = useQuery({
    queryKey: ["admin-invitations"],
    queryFn: authApi.listInvitations,
    enabled: !!me?.isSuperAdmin,
  });

  const { data: accessRequestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin-access-requests"],
    queryFn: authApi.listAccessRequests,
    enabled: !!me?.isSuperAdmin,
  });

  const { data: auditLogsData, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => authApi.getAuditLogs(),
    enabled: !!me?.isSuperAdmin && activeTab === "audit",
  });

  const roles: AdminRole[] = rolesData?.roles ?? [];
  const admins = adminsData?.admins ?? [];
  const invitations = invitationsData?.invitations ?? [];
  const accessRequests = accessRequestsData?.requests ?? [];
  const pendingRequestsCount = accessRequests.filter((r) => r.status === "PENDING" && new Date(r.expiresAt) > new Date()).length;

  // Selected role preview for invitation modal
  const selectedInviteRole = useMemo(
    () => roles.find((r) => r.id === inviteForm.roleId) || roles[0],
    [roles, inviteForm.roleId]
  );

  // Selected role preview for approval modal
  const selectedApprovalRole = useMemo(
    () => roles.find((r) => r.id === approvalRoleId) || roles[0],
    [roles, approvalRoleId]
  );

  // ─── Mutations ────────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: () =>
      authApi.inviteAdmin({
        email: inviteForm.email,
        fullName: inviteForm.fullName || undefined,
        phone: inviteForm.phone || undefined,
        roleId: inviteForm.roleId || roles[0]?.id,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      showToast(res.message || "Invitation sent successfully.", "success");
      setShowInviteModal(false);
      setInviteForm({ email: "", fullName: "", phone: "", roleId: "" });
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to send invitation.", "error"),
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (id: string) => authApi.resendInvitation(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      showToast(res.message || "Invitation re-sent.", "success");
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to resend invitation.", "error"),
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: (id: string) => authApi.revokeInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      showToast("Invitation revoked.", "info");
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to revoke invitation.", "error"),
  });

  const approveRequestMutation = useMutation({
    mutationFn: () =>
      authApi.approveAccessRequest(approvingRequest!.id, {
        roleId: approvalRoleId || roles[0]?.id,
        notes: approvalNotes || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-badges"] });
      showToast(res.message || "Access approved successfully.", "success");
      setApprovingRequest(null);
      setApprovalRoleId("");
      setApprovalNotes("");
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to approve request.", "error"),
  });

  const rejectRequestMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => authApi.rejectAccessRequest(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-badges"] });
      showToast("Access request rejected.", "info");
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to reject request.", "error"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, isActive }: { id: string; status?: string; isActive?: boolean }) =>
      authApi.updateAdminStatus(id, { status, isActive }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      showToast(res.message || "Admin status updated.", "success");
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to update status.", "error"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: string }) => authApi.updateAdminRole(id, { roleId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      showToast(res.message || "Role updated successfully.", "success");
      setEditingAdmin(null);
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to update role.", "error"),
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: (id: string) => authApi.revokeAdminSessions(id),
    onSuccess: (res) => {
      showToast(res.message || "Active sessions revoked.", "success");
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to revoke sessions.", "error"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => authApi.resetAdminPassword(id, password),
    onSuccess: () => {
      showToast("Password reset successfully.", "success");
      setResetTarget(null);
      setResetPw("");
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to reset password.", "error"),
  });

  if (!me?.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8 text-white/30" />
        </div>
        <div className="text-center">
          <p className="text-white/60 font-semibold">Access Restricted</p>
          <p className="text-white/30 text-sm mt-1">Only Super Admins can manage administrator accounts.</p>
        </div>
      </div>
    );
  }

  // Filtered admins
  const filteredAdmins = admins.filter((a: any) => {
    const matchesSearch =
      !search ||
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.roleName || "").toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "ALL" || a.role === roleFilter || a.roleId === roleFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && (a.status === "ACTIVE" || a.isActive)) ||
      (statusFilter === "SUSPENDED" && a.status === "SUSPENDED") ||
      (statusFilter === "DISABLED" && (a.status === "DISABLED" || !a.isActive));

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleStatus = (admin: any) => {
    const isCurrentlyActive = admin.status === "ACTIVE" || admin.isActive;
    const isSuperSelf = admin.isSuperAdmin && admin.id === me?.id;

    if (isCurrentlyActive && isSuperSelf) {
      showToast("Cannot disable or suspend your own Super Admin account.", "error");
      return;
    }

    showConfirm({
      title: isCurrentlyActive ? "Suspend Administrator" : "Activate Administrator",
      message: isCurrentlyActive
        ? `Are you sure you want to suspend ${admin.firstName} ${admin.lastName}? All active sessions will be terminated immediately.`
        : `Activate ${admin.firstName} ${admin.lastName}'s account and permit sign-in?`,
      confirmText: isCurrentlyActive ? "Suspend Account" : "Activate Account",
      onConfirm: async () => {
        statusMutation.mutate({
          id: admin.id,
          status: isCurrentlyActive ? "SUSPENDED" : "ACTIVE",
          isActive: !isCurrentlyActive,
        });
      },
    });
  };

  const handleRevokeSessions = (admin: any) => {
    showConfirm({
      title: "Revoke Active Sessions",
      message: `Disconnect all active devices and sessions for ${admin.firstName} ${admin.lastName}? They will be required to re-authenticate.`,
      confirmText: "Revoke Sessions",
      onConfirm: async () => {
        revokeSessionsMutation.mutate(admin.id);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-zinc-300" />
            Admin Management
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Centrally manage administrators, invitations, Google OAuth approvals, and role assignments.
          </p>
        </div>

        <Button
          onClick={() => {
            if (roles.length > 0) setInviteForm((f) => ({ ...f, roleId: roles[0].id }));
            setShowInviteModal(true);
          }}
          className="bg-white text-black font-bold text-xs shadow-md shrink-0"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Invite Administrator
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab("admins")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "admins" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Administrators ({admins.length})
        </button>

        <button
          onClick={() => setActiveTab("invitations")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "invitations" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Invitations ({invitations.filter((i) => i.status === "PENDING").length})
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
            activeTab === "requests" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Access Requests
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-black animate-pulse">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "audit" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Audit Log
        </button>
      </div>

      {/* TAB 1: ADMINISTRATORS */}
      {activeTab === "admins" && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search administrators by name, email or role..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 pr-8 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-[#0b0b0e]">All Roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[#0b0b0e]">
                      {r.displayName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 pr-8 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-[#0b0b0e]">All Statuses</option>
                  <option value="ACTIVE" className="bg-[#0b0b0e]">Active</option>
                  <option value="SUSPENDED" className="bg-[#0b0b0e]">Suspended</option>
                  <option value="DISABLED" className="bg-[#0b0b0e]">Disabled</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Admins Table */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            {adminsLoading ? (
              <div className="flex justify-center py-20">
                <span className="h-8 w-8 rounded-full border-4 border-white/10 border-t-white animate-spin" />
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Users className="h-10 w-10 text-white/15" />
                <p className="text-white/40 text-sm">No administrators found matching criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      {["Administrator", "Assigned Role", "Status", "Auth Method", "Last Login", "Actions"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-white/35 font-semibold uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredAdmins.map((admin: any) => {
                      const fullName = `${admin.firstName} ${admin.lastName ?? ""}`.trim();
                      const initials = `${admin.firstName?.[0] ?? ""}${admin.lastName?.[0] ?? ""}`.toUpperCase() || "A";
                      const isActive = admin.status === "ACTIVE" || admin.isActive;
                      const isSelf = admin.id === me?.id;

                      return (
                        <tr key={admin.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden text-xs">
                                {admin.avatarUrl ? (
                                  <img src={admin.avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                                ) : (
                                  initials
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-white flex items-center gap-1.5">
                                  {fullName}
                                  {isSelf && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/60 font-semibold">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-white/40 text-[11px]">{admin.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {roleBadge(admin.roleName || admin.role, admin.isSuperAdmin)}
                          </td>

                          <td className="px-4 py-3.5">
                            {statusBadge(admin.status, admin.isActive)}
                          </td>

                          <td className="px-4 py-3.5 text-white/60">
                            {admin.authProvider === "GOOGLE"
                              ? "Google"
                              : admin.authProvider === "EMAIL_AND_GOOGLE"
                              ? "Email & Google"
                              : "Email"}
                          </td>

                          <td className="px-4 py-3.5 text-white/50 text-[11px]">
                            {formatDate(admin.lastLoginAt)}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {/* Edit Role Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingAdmin(admin);
                                  setSelectedRoleId(admin.roleId || roles[0]?.id || "");
                                }}
                                className="h-7 px-2 text-[11px] text-white/70 hover:text-white hover:bg-white/5"
                                title="Change Role"
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                Role
                              </Button>

                              {/* Reset Password Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setResetTarget(admin);
                                  setResetPw("");
                                }}
                                className="h-7 px-2 text-[11px] text-white/70 hover:text-white hover:bg-white/5"
                                title="Reset Password"
                              >
                                <Key className="h-3 w-3 mr-1" />
                                Password
                              </Button>

                              {/* Revoke Sessions Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRevokeSessions(admin)}
                                className="h-7 px-2 text-[11px] text-white/70 hover:text-white hover:bg-white/5"
                                title="Revoke All Sessions"
                              >
                                <LogOut className="h-3 w-3" />
                              </Button>

                              {/* Suspend / Activate Toggle */}
                              {!isSelf && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleStatus(admin)}
                                  className={`h-7 px-2 text-[11px] ${
                                    isActive
                                      ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                                      : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                  }`}
                                  title={isActive ? "Suspend Admin" : "Activate Admin"}
                                >
                                  {isActive ? <Ban className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                                  {isActive ? "Suspend" : "Activate"}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INVITATIONS */}
      {activeTab === "invitations" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            {invitationsLoading ? (
              <div className="flex justify-center py-20">
                <span className="h-8 w-8 rounded-full border-4 border-white/10 border-t-white animate-spin" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Mail className="h-10 w-10 text-white/15" />
                <p className="text-white/40 text-sm">No administrator invitations sent yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      {["Recipient Email", "Assigned Role", "Status", "Sent", "Expires In", "Actions"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-white/35 font-semibold uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {invitations.map((inv: AdminInvitationItem) => (
                      <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-white">{inv.email}</p>
                          {inv.fullName && <p className="text-white/40 text-[11px]">{inv.fullName}</p>}
                        </td>

                        <td className="px-4 py-3.5">
                          {roleBadge(inv.adminRole?.displayName || inv.roleName)}
                        </td>

                        <td className="px-4 py-3.5">
                          {statusBadge(inv.status)}
                        </td>

                        <td className="px-4 py-3.5 text-white/50 text-[11px]">
                          {formatDate(inv.createdAt)}
                        </td>

                        <td className="px-4 py-3.5 text-[11px]">
                          {inv.status === "PENDING" ? (
                            <span className="text-amber-300 font-medium">{formatRelativeExpiry(inv.expiresAt)}</span>
                          ) : inv.status === "ACCEPTED" ? (
                            <span className="text-emerald-400">Accepted</span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {inv.status === "EXPIRED" || inv.status === "PENDING" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resendInvitationMutation.mutate(inv.id)}
                                className="h-7 px-2.5 text-[11px] border-white/10 text-zinc-300 hover:text-white"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Resend
                              </Button>
                            ) : null}

                            {inv.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => revokeInvitationMutation.mutate(inv.id)}
                                className="h-7 px-2.5 text-[11px] text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Revoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ACCESS REQUESTS (Google OAuth Pending) */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-300">24-Hour Google OAuth Access Approval Rule</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Google OAuth authentication alone never grants administrative privileges. When uninvited users attempt login, a time-limited 24-hour access request is created. Super Admin must explicitly assign a role and approve. Unapproved requests automatically expire after 24 hours.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            {requestsLoading ? (
              <div className="flex justify-center py-20">
                <span className="h-8 w-8 rounded-full border-4 border-white/10 border-t-white animate-spin" />
              </div>
            ) : accessRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Clock className="h-10 w-10 text-white/15" />
                <p className="text-white/40 text-sm">No pending administrator access requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      {["User Identity", "Status", "Requested At", "Expires In", "Actions"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-white/35 font-semibold uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {accessRequests.map((req: AdminAccessRequestItem) => {
                      const isPending = req.status === "PENDING" && new Date(req.expiresAt) > new Date();

                      return (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                                {req.avatarUrl ? (
                                  <img src={req.avatarUrl} alt={req.email} className="h-full w-full object-cover" />
                                ) : (
                                  req.email[0].toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-white">
                                  {req.firstName ? `${req.firstName} ${req.lastName || ""}` : req.email}
                                </p>
                                <p className="text-white/40 text-[11px]">{req.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {statusBadge(req.status)}
                          </td>

                          <td className="px-4 py-3.5 text-white/50 text-[11px]">
                            {formatDate(req.createdAt)}
                          </td>

                          <td className="px-4 py-3.5 text-[11px]">
                            {isPending ? (
                              <span className="text-amber-300 font-semibold">{formatRelativeExpiry(req.expiresAt)}</span>
                            ) : req.status === "APPROVED" ? (
                              <span className="text-emerald-400">Approved</span>
                            ) : (
                              <span className="text-white/30">Expired / Closed</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {isPending ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setApprovingRequest(req);
                                    setApprovalRoleId(roles[0]?.id || "");
                                  }}
                                  className="h-7 px-3 bg-white text-black font-bold text-[11px]"
                                >
                                  Approve & Assign Role
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => rejectRequestMutation.mutate({ id: req.id })}
                                  className="h-7 px-2 text-[11px] text-red-400 hover:bg-red-500/10"
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-white/30 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            {auditLoading ? (
              <div className="flex justify-center py-20">
                <span className="h-8 w-8 rounded-full border-4 border-white/10 border-t-white animate-spin" />
              </div>
            ) : !auditLogsData?.logs || auditLogsData.logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Activity className="h-10 w-10 text-white/15" />
                <p className="text-white/40 text-sm">No administrative audit records found.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {auditLogsData.logs.map((log: AdminAuditLogItem) => (
                  <div key={log.id} className="p-4 hover:bg-white/[0.01] transition-colors space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-300 font-bold bg-white/5 px-2 py-0.5 rounded text-[11px]">
                          {log.actionType}
                        </span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/70 font-medium">
                          Actor: {log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : "System / Self"}
                        </span>
                      </div>
                      <span className="text-white/40 text-[11px]">{formatDate(log.performedAt)}</span>
                    </div>
                    <p className="text-xs text-white/90">{log.description}</p>
                    {log.ipAddress && (
                      <p className="text-[10px] text-white/30 font-mono">IP: {log.ipAddress}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: INVITE ADMINISTRATOR ──────────────────────────── */}
      <Dialog
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        maxWidth="max-w-lg"
        title="Invite Administrator"
        description="The invited administrator will receive a secure 24-hour invitation link via email."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteModal(false)}
              className="border-white/10 text-white/60 hover:text-white text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !inviteForm.email}
              className="bg-white text-black font-bold text-xs"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {inviteMutation.isPending ? "Sending Invitation..." : "Send Invitation"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50">Email Address (Required)</label>
            <Input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="admin@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50">Full Name (optional)</label>
              <Input
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50">Phone Number (optional)</label>
              <Input
                value={inviteForm.phone}
                onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50">Assign Role</label>
            <div className="relative">
              <select
                value={inviteForm.roleId}
                onChange={(e) => setInviteForm((f) => ({ ...f, roleId: e.target.value }))}
                className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/25 transition-all cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#0b0b0e]">
                    {r.displayName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Role Permissions Live Preview */}
          {selectedInviteRole && (
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                  Role: {selectedInviteRole.displayName}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {selectedInviteRole.permissions?.length ?? 0} permissions granted
                </span>
              </div>
              <p className="text-[11px] text-white/40">{selectedInviteRole.description}</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                {(selectedInviteRole.permissions || []).map((perm: string) => (
                  <span
                    key={perm}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/5 text-zinc-300"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* ─── MODAL 2: EDIT ADMINISTRATOR ROLE ────────────────────────── */}
      <Dialog
        isOpen={!!editingAdmin}
        onClose={() => setEditingAdmin(null)}
        maxWidth="max-w-md"
        title="Change Administrator Role"
        description={`Update role permissions for ${editingAdmin?.firstName} ${editingAdmin?.lastName}.`}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingAdmin(null)}
              className="border-white/10 text-white/60 hover:text-white text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => roleMutation.mutate({ id: editingAdmin!.id, roleId: selectedRoleId })}
              disabled={roleMutation.isPending || !selectedRoleId}
              className="bg-white text-black font-bold text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {roleMutation.isPending ? "Updating Role..." : "Save Role"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50">Select Role</label>
            <div className="relative">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/25 transition-all cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#0b0b0e]">
                    {r.displayName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            </div>
          </div>
        </div>
      </Dialog>

      {/* ─── MODAL 3: RESET PASSWORD ────────────────────────────────── */}
      <Dialog
        isOpen={!!resetTarget}
        onClose={() => {
          setResetTarget(null);
          setResetPw("");
        }}
        maxWidth="max-w-sm"
        title="Reset Administrator Password"
        description={`Set a new temporary or permanent password for ${resetTarget?.email}.`}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResetTarget(null);
                setResetPw("");
              }}
              className="border-white/10 text-white/60 hover:text-white text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => resetPasswordMutation.mutate({ id: resetTarget!.id, password: resetPw })}
              disabled={resetPasswordMutation.isPending || resetPw.length < 6}
              className="bg-white text-black font-bold text-xs"
            >
              <Key className="h-3.5 w-3.5 mr-1.5" />
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/50">New Password</label>
          <PasswordInput
            value={resetPw}
            onChange={(e) => setResetPw(e.target.value)}
            placeholder="Min. 6 characters"
          />
        </div>
      </Dialog>

      {/* ─── MODAL 4: APPROVE ACCESS REQUEST ────────────────────────── */}
      <Dialog
        isOpen={!!approvingRequest}
        onClose={() => {
          setApprovingRequest(null);
          setApprovalRoleId("");
          setApprovalNotes("");
        }}
        maxWidth="max-w-md"
        title="Approve Google OAuth Access Request"
        description={`Assign a role to ${approvingRequest?.email} to grant Admin Panel access.`}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApprovingRequest(null)}
              className="border-white/10 text-white/60 hover:text-white text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => approveRequestMutation.mutate()}
              disabled={approveRequestMutation.isPending || !approvalRoleId}
              className="bg-white text-black font-bold text-xs"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              {approveRequestMutation.isPending ? "Approving..." : "Confirm & Grant Access"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 text-xs">
            <p className="text-white/40">Requesting User:</p>
            <p className="font-bold text-white">{approvingRequest?.email}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50">Assigned Role</label>
            <div className="relative">
              <select
                value={approvalRoleId}
                onChange={(e) => setApprovalRoleId(e.target.value)}
                className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/25 transition-all cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#0b0b0e]">
                    {r.displayName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50">Approval Notes (optional)</label>
            <Input
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. Approved for operations team"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
