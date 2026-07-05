"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { authApi } from "@/features/auth/api/authApi";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store/uiStore";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  Key,
  Upload,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Edit3,
} from "lucide-react";

function formatDate(val?: string | null) {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function authProviderLabel(p?: string) {
  if (!p) return "Email";
  if (p === "GOOGLE") return "Google";
  if (p === "EMAIL_AND_GOOGLE") return "Email & Google";
  return "Email";
}

export default function ProfilePage() {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  // ── Edit Profile ──────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setName(`${admin?.firstName ?? ""} ${admin?.lastName ?? ""}`.trim());
    setPhone(admin?.phone ?? "");
    setAvatarUrl(admin?.avatarUrl ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile({ name, phone: phone || undefined, avatarUrl: avatarUrl || undefined });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      showToast("Profile updated successfully.", "success");
      setEditing(false);
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Password ──────────────────────────────────────────────────
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const hasPassword = admin?.authProvider !== "GOOGLE";

  const savePassword = async () => {
    if (newPw !== confirmPw) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (newPw.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: hasPassword ? currentPw : undefined,
        newPassword: newPw,
      });
      showToast("Password updated successfully.", "success");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwOpen(false);
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Failed to update password.", "error");
    } finally {
      setPwSaving(false);
    }
  };

  if (!admin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="h-8 w-8 rounded-full border-4 border-white/10 border-t-white animate-spin" />
      </div>
    );
  }

  const initials = `${admin.firstName?.[0] ?? ""}${admin.lastName?.[0] ?? ""}`.toUpperCase() || "A";
  const fullName = `${admin.firstName} ${admin.lastName ?? ""}`.trim();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Admin Profile</h1>
        <p className="text-white/40 text-sm mt-1">Manage your personal information and security settings.</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {/* Top banner */}
        <div className="h-24 bg-gradient-to-r from-white/5 via-white/[0.02] to-transparent border-b border-white/5 relative">
          <div className="absolute -bottom-10 left-6">
            <div className="h-20 w-20 rounded-2xl border-4 border-[#07070a] bg-white/10 flex items-center justify-center text-2xl font-black text-white overflow-hidden">
              {admin.avatarUrl ? (
                <img src={admin.avatarUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </div>
        </div>

        <div className="pt-14 pb-6 px-6 space-y-6">
          {/* Name / Role row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">{fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${admin.isSuperAdmin ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-white/10 text-white/60"}`}>
                  <Shield className="h-2.5 w-2.5" />
                  {admin.isSuperAdmin ? "Super Admin" : (admin.role ?? "Admin")}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${admin.isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                  {admin.isActive ? <CheckCircle className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                  {admin.isActive ? "Active" : "Disabled"}
                </span>
              </div>
            </div>

            {!editing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-white/70 hover:text-white hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            )}
          </div>

          {/* Edit form */}
          {editing ? (
            <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Editing Profile</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/50">Full Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/50">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 00000 00000"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-white/50">Avatar URL</label>
                  <input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Info grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Mail, label: "Email", value: admin.email },
                { icon: Phone, label: "Phone", value: admin.phone || "Not set" },
                { icon: Shield, label: "Auth Provider", value: authProviderLabel(admin.authProvider) },
                { icon: User, label: "Role", value: admin.isSuperAdmin ? "Super Admin" : (admin.role ?? "Admin") },
                { icon: Calendar, label: "Member Since", value: formatDate(admin.createdAt) },
                { icon: Clock, label: "Last Login", value: formatDate(admin.lastLoginAt) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-white/40" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/35 font-semibold uppercase tracking-wider">{label}</p>
                    <p className="text-sm text-white/80 font-medium mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password Management */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Key className="h-4 w-4 text-white/50" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Password & Security</p>
              <p className="text-xs text-white/40 mt-0.5">
                {hasPassword ? "Change your current password." : "Set a password to enable email login."}
              </p>
            </div>
          </div>
          {!pwOpen && (
            <button
              onClick={() => setPwOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-white/70 hover:text-white hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              <Key className="h-3.5 w-3.5" />
              {hasPassword ? "Change Password" : "Set Password"}
            </button>
          )}
        </div>

        {pwOpen && (
          <div className="p-6 space-y-4">
            {hasPassword && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={savePassword}
                disabled={pwSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                {pwSaving ? "Saving..." : "Update Password"}
              </button>
              <button
                onClick={() => { setPwOpen(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
