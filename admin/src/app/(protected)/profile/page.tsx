"use client";

import React, { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { authApi, type AdminAuditLogItem } from "@/features/auth/api/authApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store/uiStore";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  Key,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Edit3,
  Trash2,
  Activity,
  Send,
  Lock,
} from "lucide-react";
import { ImageUploadField, type UploadResult } from "@/shared/components/ImageUploadField";
import { PasswordInput } from "@/shared/components/PasswordInput";
import { Input } from "@/shared/components/Input";
import { Dialog } from "@/shared/components/Dialog";
import { Button } from "@/shared/components/Button";

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
  const [avatarPublicId, setAvatarPublicId] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setName(`${admin?.firstName ?? ""} ${admin?.lastName ?? ""}`.trim());
    setPhone(admin?.phone ?? "");
    setAvatarUrl(admin?.avatarUrl ?? "");
    setAvatarPublicId(admin?.avatarPublicId ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile({
        name,
        phone: phone || undefined,
        avatarUrl: avatarUrl || null,
        avatarPublicId: avatarPublicId || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      showToast("Profile updated successfully.", "success");
      setEditing(false);
    } catch {
      showToast("Unable to update profile. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await authApi.removeAvatar();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setAvatarUrl("");
      setAvatarPublicId("");
      showToast("Profile image removed.", "success");
    } catch {
      showToast("Failed to remove profile image.", "error");
    }
  };

  // ── Password ──────────────────────────────────────────────────
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
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
    if (hasPassword && !currentPw) {
      showToast("Please enter your current password.", "error");
      return;
    }

    setPwSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: hasPassword ? currentPw : undefined,
        newPassword: newPw,
        confirmPassword: confirmPw,
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

  // ── Change Email ──────────────────────────────────────────────
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      showToast("Please enter a valid new email address.", "error");
      return;
    }

    setEmailSubmitting(true);
    try {
      const res = await authApi.requestEmailChange({
        newEmail,
        currentPassword: hasPassword ? emailPw : undefined,
      });
      showToast(res.message || "Verification link sent to new email.", "success");
      setEmailModalOpen(false);
      setNewEmail("");
      setEmailPw("");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to request email change.", "error");
    } finally {
      setEmailSubmitting(false);
    }
  };

  // ── Security Activity ─────────────────────────────────────────
  const [activityOpen, setActivityOpen] = useState(false);
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit-logs", admin?.id],
    queryFn: () => authApi.getAuditLogs(admin?.id),
    enabled: activityOpen && !!admin?.id,
  });

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin Profile</h1>
          <p className="text-white/40 text-sm mt-1">Manage your identity credentials, email, and security settings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActivityOpen(true)}
            className="border-white/10 text-white/70 hover:text-white text-xs font-semibold"
          >
            <Activity className="h-3.5 w-3.5 mr-1.5" />
            Security Activity
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {/* Top banner */}
        <div className="h-28 bg-gradient-to-r from-white/10 via-white/[0.03] to-transparent border-b border-white/5 relative">
          <div className="absolute -bottom-10 left-6">
            <div className="h-20 w-20 rounded-2xl border-4 border-[#07070a] bg-zinc-900 flex items-center justify-center text-2xl font-black text-white overflow-hidden shadow-xl">
              {admin.avatarUrl ? (
                <img src={admin.avatarUrl} alt={fullName} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </div>
        </div>

        <div className="pt-14 pb-6 px-6 space-y-6">
          {/* Name / Role row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">{fullName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${admin.isSuperAdmin ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-white/10 text-white/60"}`}>
                  <Shield className="h-2.5 w-2.5" />
                  {admin.isSuperAdmin ? "Super Admin" : (admin.roleName ?? admin.role ?? "Admin")}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${admin.status === "ACTIVE" || admin.isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                  {admin.status === "ACTIVE" || admin.isActive ? <CheckCircle className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                  {admin.status ?? (admin.isActive ? "Active" : "Disabled")}
                </span>
              </div>
            </div>

            {!editing && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEmailModalOpen(true)}
                  className="border-white/10 text-white/70 hover:text-white text-xs font-semibold"
                >
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Change Email
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startEdit}
                  className="border-white/10 text-white/70 hover:text-white text-xs font-semibold"
                >
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                  Edit Profile
                </Button>
              </div>
            )}
          </div>

          {/* Edit form */}
          {editing ? (
            <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Editing Profile Details</h3>
                {admin.avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-7 px-2"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove Current Photo
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/50">Full Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/50">Phone Number</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 00000 00000"
                  />
                </div>
                <div className="md:col-span-2">
                  <ImageUploadField
                    label="Upload Profile Photo"
                    folder="admin-profile"
                    value={avatarUrl}
                    onChange={(image: UploadResult) => {
                      setAvatarUrl(image.url);
                      setAvatarPublicId(image.publicId);
                    }}
                    onRemove={() => {
                      setAvatarUrl("");
                      setAvatarPublicId("");
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={saveProfile}
                  disabled={saving}
                  className="bg-white text-black font-bold text-xs"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEdit}
                  className="border-white/10 text-white/60 hover:text-white text-xs font-bold"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* Info grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Mail, label: "Email Address", value: admin.email },
                { icon: Phone, label: "Phone", value: admin.phone || "Not configured" },
                { icon: Shield, label: "Authentication Provider", value: authProviderLabel(admin.authProvider) },
                { icon: User, label: "Assigned Role", value: admin.isSuperAdmin ? "Super Admin" : (admin.roleName ?? admin.role ?? "Admin") },
                { icon: Calendar, label: "Member Since", value: formatDate(admin.createdAt) },
                { icon: Clock, label: "Last Login", value: formatDate(admin.lastLoginAt) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-white/40" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/35 font-semibold uppercase tracking-wider">{label}</p>
                    <p className="text-sm text-white/90 font-medium mt-0.5">{value}</p>
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
                {hasPassword ? "Change your administrator password." : "Set a password to enable email login alongside Google."}
              </p>
            </div>
          </div>
          {!pwOpen && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPwOpen(true)}
              className="border-white/10 text-white/70 hover:text-white text-xs font-semibold"
            >
              <Key className="h-3.5 w-3.5 mr-1.5" />
              {hasPassword ? "Change Password" : "Set Password"}
            </Button>
          )}
        </div>

        {pwOpen && (
          <div className="p-6 space-y-4 bg-white/[0.01]">
            {hasPassword && (
              <div className="space-y-1.5 max-w-md">
                <label className="text-xs font-semibold text-white/50">Current Password</label>
                <PasswordInput
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50">New Password</label>
                <PasswordInput
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 6 characters"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50">Confirm New Password</label>
                <PasswordInput
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={savePassword}
                disabled={pwSaving || !newPw || (hasPassword && !currentPw)}
                className="bg-white text-black font-bold text-xs"
              >
                {pwSaving ? "Updating..." : "Update Password"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPwOpen(false);
                  setCurrentPw("");
                  setNewPw("");
                  setConfirmPw("");
                }}
                className="border-white/10 text-white/60 hover:text-white text-xs font-bold"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Change Email Modal */}
      <Dialog
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        maxWidth="max-w-md"
        title="Change Administrator Email"
        description="A verification link will be sent to the new email address before changes take effect."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmailModalOpen(false)}
              className="border-white/10 text-white/60 hover:text-white text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRequestEmailChange}
              disabled={emailSubmitting || !newEmail}
              className="bg-white text-black font-bold text-xs"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {emailSubmitting ? "Sending..." : "Send Verification Link"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleRequestEmailChange} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50">Current Email</label>
            <Input value={admin.email} disabled className="opacity-60 cursor-not-allowed" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50">New Email Address</label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new-admin@example.com"
              required
            />
          </div>

          {hasPassword && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50">Confirm Current Password</label>
              <PasswordInput
                value={emailPw}
                onChange={(e) => setEmailPw(e.target.value)}
                placeholder="Enter password to authorize"
                leftIcon={<Lock className="h-4 w-4" />}
                required
              />
            </div>
          )}
        </form>
      </Dialog>

      {/* Security Activity Modal */}
      <Dialog
        isOpen={activityOpen}
        onClose={() => setActivityOpen(false)}
        maxWidth="max-w-2xl"
        title="Security & Account Activity"
        description="Audit records of administrative sessions, updates, and authentication events."
        footer={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActivityOpen(false)}
            className="border-white/10 text-white/70 hover:text-white text-xs font-semibold"
          >
            Close
          </Button>
        }
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {auditLoading ? (
            <div className="flex justify-center py-8">
              <span className="h-6 w-6 rounded-full border-2 border-white/10 border-t-white animate-spin" />
            </div>
          ) : !auditData?.logs || auditData.logs.length === 0 ? (
            <p className="text-xs text-white/40 py-6 text-center">No security activity records found.</p>
          ) : (
            auditData.logs.map((log: AdminAuditLogItem) => (
              <div key={log.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1">
                <div className="flex items-center justify-between text-white/50 text-[10px]">
                  <span className="font-mono text-zinc-400">{log.actionType}</span>
                  <span>{formatDate(log.performedAt)}</span>
                </div>
                <p className="text-white/80 font-medium">{log.description}</p>
                {log.ipAddress && (
                  <p className="text-[10px] text-white/30">IP: {log.ipAddress}</p>
                )}
              </div>
            ))
          )}
        </div>
      </Dialog>
    </div>
  );
}
