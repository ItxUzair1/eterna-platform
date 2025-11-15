// client/src/pages/SettingsAccount.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  getMe,
  updateProfile,
  uploadPhoto,
  changePassword,
} from "../services/authService";
import PageContainer from "../components/PageContainer";
import PageHeader from "../components/PageHeader";

export default function SettingsAccount() {
  const [me, setMe] = useState(null);
  const [toast, setToast] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => setMe(await getMe()))();
  }, []);

  const flash = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: "", text: "" }), 3000);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const out = await updateProfile({
        firstName: me.firstName?.trim() || "",
        lastName: me.lastName?.trim() || "",
        jobTitle: me.jobTitle?.trim() || "",
      });
      setMe(out);
      flash("ok", "Profile updated");
    } catch (e) {
      flash("err", e?.response?.data?.error || "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  const doChangePassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    const oldPassword = e.target.oldPassword.value;
    const newPassword = e.target.newPassword.value;
    try {
      await changePassword(oldPassword, newPassword);
      e.target.reset();
      flash("ok", "Password changed");
    } catch (e) {
      flash("err", e?.response?.data?.error || "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    console.log('[SettingsAccount] handlePhotoUpload called');
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    console.log('[SettingsAccount] Photo upload started:', { name: file.name, size: file.size, type: file.type });
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      flash("err", "Please select an image file");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      flash("err", "Image size must be less than 5MB");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    setUploadingPhoto(true);
    try {
      console.log('[SettingsAccount] Uploading photo to server...');
      const updated = await uploadPhoto(file);
      console.log('[SettingsAccount] Photo upload successful:', updated);
      setMe(updated);
      flash("ok", "Profile picture updated");
    } catch (err) {
      console.error('[SettingsAccount] Photo upload error:', err);
      console.error('[SettingsAccount] Error response:', err.response?.data);
      const errorMsg = err?.response?.data?.error || err?.message || "Failed to upload photo";
      if (errorMsg.includes('Spaces') || errorMsg.includes('DigitalOcean') || errorMsg.includes('SPACES_CONFIG')) {
        flash("err", "File storage is not configured. Please contact your administrator.");
      } else {
        flash("err", errorMsg);
      }
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
    }
  };

  if (!me) {
    return (
      <div className="p-6">
        <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  const Banner = () =>
    toast.text ? (
      <div
        className={`rounded-xl px-4 py-3 text-sm border transition ${
          toast.type === "ok"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-rose-50 border-rose-200 text-rose-700"
        }`}
      >
        {toast.text}
      </div>
    ) : null;

  const Card = ({ title, desc, children }) => (
    <div className="rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all">
      <div className="p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-slate-900 font-semibold">{title}</h3>
          {desc && <p className="text-slate-500 text-sm mt-1">{desc}</p>}
        </div>
        {children}
      </div>
    </div>
  );

  const Input = ({ label, hint, ...props }) => (
    <label className="block">
      <span className="block text-xs text-slate-700 mb-1">{label}</span>
      <input
        {...props}
        className={`w-full rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm text-slate-900 placeholder-slate-400 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-400 transition ${props.className || ""
          }`}
      />
      {hint && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );

  const Button = ({
    children,
    tone = "primary",
    className = "",
    ...rest
  }) => {
    const tones = {
      primary:
        "bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 hover:from-indigo-600 hover:via-violet-600 hover:to-cyan-600 text-white",
      sky: "bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white",
      danger:
        "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white",
      subtle:
        "bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-800",
    };
    return (
      <button
        {...rest}
        className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-medium shadow-sm hover:shadow-md active:scale-[0.98] transition-all ${tones[tone]
          } ${className}`}
      >
        {children}
      </button>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Account Settings"
        description="Manage your profile, security, and preferences"
      />
      <div className="space-y-4 sm:space-y-6">
        <Banner />

        {/* Actions row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-slate-500 text-sm">
            {busy ? (
              <div className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin text-indigo-500"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-20"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-70"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Saving…
              </div>
            ) : (
              <span>Make changes and click save.</span>
            )}
          </div>
        </div>

        {/* Content grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile */}
          <Card title="Profile" desc="Your name and role information.">
            {/* Profile Picture */}
            <div className="mb-6">
              <label className="block text-xs text-slate-700 mb-2">Profile Picture</label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={me.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((me.firstName || '') + ' ' + (me.lastName || '') || me.username || 'User')}&background=indigo&color=fff&size=128`}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                  />
                  {uploadingPhoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-70" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
          
                      if (fileInputRef.current && !fileInputRef.current.disabled) {
                        fileInputRef.current.click();
                      }
                    }}
                    disabled={uploadingPhoto}
                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 hover:from-indigo-600 hover:via-violet-600 hover:to-cyan-600 text-white font-medium shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG or GIF. Max 5MB.</p>
                </div>
              </div>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="First name"
                  value={me.firstName || ""}
                  onChange={(e) =>
                    setMe((m) => ({ ...m, firstName: e.target.value }))
                  }
                />
                <Input
                  label="Last name"
                  value={me.lastName || ""}
                  onChange={(e) =>
                    setMe((m) => ({ ...m, lastName: e.target.value }))
                  }
                />
              </div>
              <Input
                label="Job title"
                value={me.jobTitle || ""}
                onChange={(e) =>
                  setMe((m) => ({ ...m, jobTitle: e.target.value }))
                }
              />
              <div className="flex justify-end">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </Card>

          {/* Security */}
          <Card title="Security" desc="Manage your password.">
            <form onSubmit={doChangePassword} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Current password"
                  name="oldPassword"
                  type="password"
                  placeholder="••••••••"
                />
                <Input
                  label="New password"
                  name="newPassword"
                  type="password"
                  placeholder="••••••••"
                  hint="Use 8+ chars, with numbers and case mix."
                />
              </div>
              <div className="flex justify-end">
                <Button tone="danger" type="submit">
                  Change password
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Footer helper */}
        <div className="text-xs text-slate-500 pb-6 text-center">
          Tip: You can revisit these settings anytime from the top-right menu.
        </div>
      </div>
    </PageContainer>
  );
}
