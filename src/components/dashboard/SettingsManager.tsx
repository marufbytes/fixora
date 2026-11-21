"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  CheckCircle2,
  KeyRound,
  Landmark,
  Loader2,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { formatDate } from "@/components/ui/Badges";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
  organizationName: string | null;
  unitSummary: string | null;
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";
const readOnlyClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

export default function SettingsManager({ profile }: { profile: UserProfileData }) {
  const router = useRouter();

  // Edit profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  function handleCancelEdit() {
    setName(profile.name);
    setPhone(profile.phone ?? "");
    setProfileError("");
    setEditingProfile(false);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!name.trim()) {
      setProfileError("Full name cannot be empty.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_PROFILE",
          name,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Failed to update profile");
        setSavingProfile(false);
        return;
      }

      setProfileSuccess(data.message || "Profile updated successfully.");
      setEditingProfile(false);
      setSavingProfile(false);
      router.refresh();
    } catch {
      setProfileError("Network error while updating profile.");
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_PASSWORD",
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password");
        setSavingPassword(false);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(data.message || "Password updated successfully.");
      setSavingPassword(false);
    } catch {
      setPasswordError("Network error while updating password.");
      setSavingPassword(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Account & Security Settings"
        subtitle="Manage your profile details, contact information, and password."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left Column: Account Overview + Profile Details */}
        <div className="space-y-5">
          {/* Account Overview Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-lg font-semibold text-white shadow-sm">
                {getInitials(name || profile.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-slate-900">
                    {name || profile.name}
                  </h2>
                  <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    {ROLE_LABELS[profile.role]}
                  </span>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {profile.email}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <Landmark className="h-4 w-4 shrink-0 text-blue-600" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-400">Organization</dt>
                  <dd className="truncate font-medium text-slate-800">
                    {profile.organizationName ?? "Not linked"}
                  </dd>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <Building2 className="h-4 w-4 shrink-0 text-violet-600" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-400">Building &amp; Unit</dt>
                  <dd className="truncate font-medium text-slate-800">
                    {profile.unitSummary ?? "Not assigned"}
                  </dd>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <Phone className="h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-400">Phone</dt>
                  <dd className="truncate font-medium text-slate-800">
                    {profile.phone ?? "Not provided"}
                  </dd>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <Calendar className="h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-400">Joined</dt>
                  <dd className="truncate font-medium text-slate-800">
                    {formatDate(profile.createdAt)}
                  </dd>
                </div>
              </div>
            </dl>
          </section>

          {/* Profile Details Form Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <User className="h-4 w-4 text-blue-600" />
                Profile Details
              </h2>
              {!editingProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileSuccess("");
                    setEditingProfile(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Profile
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-3.5">
              {profileError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {profileError}
                </p>
              )}
              {profileSuccess && (
                <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {profileSuccess}
                </p>
              )}

              <div className="space-y-1.5">
                <label htmlFor="p-name" className="block text-xs font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  id="p-name"
                  type="text"
                  required
                  readOnly={!editingProfile}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={editingProfile ? inputClass : readOnlyClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="p-phone" className="block text-xs font-medium text-slate-700">
                  Phone Number
                </label>
                <input
                  id="p-phone"
                  type="text"
                  readOnly={!editingProfile}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={editingProfile ? "e.g. +880 1700-000000" : "Not provided"}
                  className={editingProfile ? inputClass : readOnlyClass}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="p-email" className="block text-xs font-medium text-slate-700">
                    Email Address
                  </label>
                  <input id="p-email" type="email" readOnly value={profile.email} className={readOnlyClass} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="p-role" className="block text-xs font-medium text-slate-700">
                    Account Role
                  </label>
                  <input id="p-role" type="text" readOnly value={ROLE_LABELS[profile.role]} className={readOnlyClass} />
                </div>
              </div>

              {editingProfile && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={savingProfile}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </section>
        </div>

        {/* Right Column: Security & Password */}
        <div>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <KeyRound className="h-4 w-4 text-blue-600" />
                Security &amp; Password
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Update your account password. Use at least 6 characters.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="mt-4 space-y-3.5">
              {passwordError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  {passwordSuccess}
                </p>
              )}

              <div className="space-y-1.5">
                <label htmlFor="pw-current" className="block text-xs font-medium text-slate-700">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="pw-current"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pw-new" className="block text-xs font-medium text-slate-700">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="pw-new"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pw-confirm" className="block text-xs font-medium text-slate-700">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="pw-confirm"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update Password
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
