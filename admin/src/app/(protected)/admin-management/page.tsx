"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/authApi";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUIStore } from "@/lib/store/uiStore";
import { useConfirmStore } from "@/lib/store/confirmStore";
import {
  Users,
  Plus,
  Shield,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Key,
  ChevronDown,
  Search,
  X,
  Save,
  Clock,
  Mail,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

function roleBadge(role?: string, isSuper?: boolean) {
  const label = isSuper ? "Super Admin" : (role ?? "Admin");
  const color = isSuper
    ? "bg-white/10 border-white/20 text-white"
    : "bg-white/5 border-white/10 text-white/60";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${color}`}>
      {isSuper ? <ShieldAlert className="h-2.5 w-2.5" /> : <Shield className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

function formatDate(val?: string | null) {
  if (!val) return "Never";
  return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminManagementPage() {
  const { admin: me } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const showConfirm = useConfirmStore((s) => s.showConfirm);

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "ADMIN" });
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admins"],
    queryFn: authApi.listAdmins,
    enabled: !!me?.isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: () => authApi.createAdmin(createForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      showToast("Admin created successfully.", "success");
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", role: "ADMIN" });
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to create admin.", "error"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => authApi.updateAdminStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      showToast("Admin status updated.", "success");
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to update status.", "error"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => authApi.updateAdminRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      showToast("Admin role updated.", "success");
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to update role.", "error"),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => authApi.resetAdminPassword(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      showToast("Password reset successfully.", "success");
      setResetTarget(null);
      setResetPw("");
    },
    onError: (e: any) => showToast(e?.response?.data?.message || "Failed to reset password.", "error"),
  });

  const handleToggleStatus = (id: string, current: boolean, isSuperSelf: boolean) => {
    if (!current && isSuperSelf) {
      showToast("Cannot disable the last active Super Admin.", "error");
      return;
    }
    showConfirm({
      title: current ? "Disable Admin" : "Enable Admin",
      message: current
        ? "This admin will lose access to the system immediately."
        : "This admin will be able to sign in again.",
      confirmText: current ? "Disable" : "Enable",
      onConfirm: async () => {
        statusMutation.mutate({ id, isActive: !current });
      },
    });
  };

  if (!me?.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8 text-white/30" />
        </div>
        <div className="text-center">
          <p className="text-white/60 font-semibold">Access Restricted</p>
          <p className="text-white/30 text-sm mt-1">Only Super Admins can manage other admins.</p>
        </div>
      </div>
    );
  }

  const admins = (data?.admins ?? []).filter(
    (a: any) =>
      !search ||
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin Management</h1>
          <p className="text-white/40 text-sm mt-1">
            {data?.admins?.length ?? 0} admin{(data?.admins?.length ?? 0) !== 1 ? "s" : ""} in the system.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Admin
        </button>
      </div>

      {/* Create Admin Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0f] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-white">Create Admin Account</h3>
              <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "Full Name", key: "name", placeholder: "e.g. Jane Doe" },
                { label: "Email", key: "email", placeholder: "jane@company.com" },
                { label: "Initial Password (optional)", key: "password", placeholder: "Min. 6 characters" },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/50">{label}</label>
                  <input
                    type={key === "password" ? "password" : "text"}
                    value={(createForm as any)[key]}
                    onChange={(e) => setCreateForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-all"
                  />
                </div>
              ))}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50">Role</label>
                <div className="relative">
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-all cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="bg-[#0a0a0f]">
                        {r.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !createForm.name || !createForm.email}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  {createMutation.isPending ? "Creating..." : "Create Admin"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0a0f] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-white">Reset Password</h3>
              <button onClick={() => { setResetTarget(null); setResetPw(""); }} className="text-white/40 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50">New Password</label>
                <input
                  type="password"
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => resetMutation.mutate({ id: resetTarget, password: resetPw })}
                  disabled={resetMutation.isPending || resetPw.length < 6}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Key className="h-3.5 w-3.5" />
                  {resetMutation.isPending ? "Resetting..." : "Reset Password"}
                </button>
                <button
                  onClick={() => { setResetTarget(null); setResetPw(""); }}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full bg-white/[0.03] border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-all"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <span className="h-8 w-8 rounded-full border-4 border-white/10 border-t-white animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users className="h-10 w-10 text-white/15" />
            <p className="text-white/40 text-sm">{search ? "No admins match your search." : "No admins found."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {["Admin", "Role", "Status", "Last Login", "Created", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-white/35 font-semibold uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {admins.map((a: any) => {
                  const isSelf = a.id === me?.id;
                  return (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Admin */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {a.avatarUrl ? (
                              <img src={a.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              `${a.firstName?.[0] ?? ""}${a.lastName?.[0] ?? ""}`.toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white/90">
                              {a.firstName} {a.lastName}
                              {isSelf && <span className="ml-1.5 text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full text-white/50">You</span>}
                            </p>
                            <p className="text-white/35 flex items-center gap-1 mt-0.5">
                              <Mail className="h-2.5 w-2.5" /> {a.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {isSelf ? (
                          roleBadge(a.role, a.isSuperAdmin)
                        ) : (
                          <div className="relative">
                            <select
                              value={a.role ?? "ADMIN"}
                              onChange={(e) => {
                                showConfirm({
                                  title: "Change Role",
                                  message: `Change ${a.firstName}'s role to ${e.target.value.replace("_", " ")}?`,
                                  confirmText: "Change Role",
                                  onConfirm: async () => roleMutation.mutate({ id: a.id, role: e.target.value }),
                                });
                              }}
                              className="appearance-none bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1 pr-6 text-xs text-white font-semibold focus:outline-none focus:border-white/20 cursor-pointer"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r} className="bg-[#0a0a0f]">{r.replace("_", " ")}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30 pointer-events-none" />
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${a.isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                          {a.isActive ? <CheckCircle className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                          {a.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3 text-white/40">
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {formatDate(a.lastLoginAt)}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-white/40">{formatDate(a.createdAt)}</td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {!isSelf && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleStatus(a.id, a.isActive, a.isSuperAdmin)}
                              title={a.isActive ? "Disable" : "Enable"}
                              className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all cursor-pointer"
                            >
                              {a.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => { setResetTarget(a.id); setResetPw(""); }}
                              title="Reset Password"
                              className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all cursor-pointer"
                            >
                              <Key className="h-3.5 w-3.5" />
                            </button>
                          </div>
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
  );
}
