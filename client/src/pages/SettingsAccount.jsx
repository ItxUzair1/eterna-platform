// client/src/pages/SettingsAccount.jsx
import React, { useEffect, useState } from "react";
import {
  getMe,
  updateProfile,
  changeEmail,
  changePassword,
} from "../services/authService";

export default function SettingsAccount() {
  const [me, setMe] = useState(null);
  const [toast, setToast] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

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

  const reqEmailChange = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await changeEmail(me.email?.trim());
      flash("ok", "Verification link sent to your email");
    } catch (e) {
      flash(
        "err",
        e?.response?.data?.error || "Failed to request email change"
      );
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-cyan-50">
      {/* Gradient header bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 shadow-lg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <h2 className="text-white text-2xl sm:text-3xl font-semibold">
            Account Settings
          </h2>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 -mt-6 space-y-4 sm:space-y-6">
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
          <a href="/enable-2fa">
            <Button tone="subtle">Enable WhatsApp 2FA</Button>
          </a>
        </div>

        {/* Content grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile */}
          <Card title="Profile" desc="Your name and role information.">
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
          <Card title="Security" desc="Email and password controls.">
            <form onSubmit={reqEmailChange} className="space-y-4 mb-6">
              <Input
                label="Email"
                type="email"
                value={me.email}
                onChange={(e) =>
                  setMe((m) => ({ ...m, email: e.target.value }))
                }
              />
              <div className="flex justify-end">
                <Button tone="sky" type="submit">
                  Request email change
                </Button>
              </div>
            </form>

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
    </div>
  );
}
