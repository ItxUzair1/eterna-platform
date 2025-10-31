// client/src/pages/Register.jsx
import React, { useMemo, useState } from "react";
import { signup } from "../services/authService";

// Password strength helpers
const strengthLabel = (score) => {
  if (score >= 4) return { text: "Strong", color: "text-emerald-400", bar: "bg-emerald-500" };
  if (score === 3) return { text: "Good", color: "text-lime-300", bar: "bg-lime-400" };
  if (score === 2) return { text: "Weak", color: "text-yellow-300", bar: "bg-yellow-400" };
  return { text: "Very weak", color: "text-red-300", bar: "bg-red-400" };
};

const scorePassword = (pwd = "") => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
};

// Stable Input component
const Input = React.memo(function Input({ label, hint, right, className = "", ...props }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-slate-200">{label}</label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      <div className="relative group">
        <input
          {...props}
          value={props.value ?? ""}
          onChange={props.onChange}
          className={`w-full rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-400 px-4 py-3 pr-11 outline-none ring-0 transition focus:border-indigo-400 focus:bg-slate-900/70 ${className}`}
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/5 group-focus-within:ring-indigo-400/40 transition" />
      </div>
    </div>
  );
});

const Register = () => {
  const [accountType, setAccountType] = useState("Entrepreneur"); // role
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    enterpriseName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const pwdScore = useMemo(() => scorePassword(form.password), [form.password]);
  const pwdLabel = useMemo(() => strengthLabel(pwdScore), [pwdScore]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.username || !form.password) {
      return setError("Please fill in all required fields.");
    }
    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        role: accountType, // "Entrepreneur" | "Enterprise"
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        enterpriseName: accountType === "Enterprise" ? form.enterpriseName.trim() : undefined,
      };
      const res = await signup(payload);
      console.log("Signup success:", res);
      alert("Registration successful! Check your email to verify your account.");
      // Optionally redirect: window.location.href = "/"
    } catch (err) {
      setError(err?.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 p-6">
      <div className="w-full max-w-2xl grid md:grid-cols-2 gap-6">
        {/* Left: Brand panel */}
        <div className="hidden md:flex flex-col justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mb-4">
              <span className="text-indigo-300 font-bold text-xl">∞</span>
            </div>
            <h2 className="text-white text-3xl font-semibold leading-tight">
              Create your Eterna account
            </h2>
            <p className="text-slate-300 mt-2 text-sm">
              One identity, multiple apps. Manage CRM, Kanban, Emails, To‑Dos and more in a unified workspace.
            </p>
            <ul className="mt-6 space-y-2 text-slate-300 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Secure by design with JWT
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Multi-tenant & role‑based access
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                Consistent UI across apps
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Form card */}
        <div className="relative rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative p-8">
            <div className="mb-6">
              <h3 className="text-white text-2xl font-semibold">Create account</h3>
              <p className="text-slate-300 text-sm mt-1">Join Eterna as an Entrepreneur or Enterprise</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* Role selector */}
            <div className="flex items-center gap-2 mb-5">
              {["Entrepreneur", "Enterprise"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAccountType(type)}
                  className={`px-4 py-2 rounded-full text-xs font-medium border transition ${
                    accountType === type
                      ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-900/30"
                      : "bg-slate-900/40 text-slate-200 border-white/10 hover:bg-slate-900/60"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First name"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="John"
                />
                <Input
                  label="Last name"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                />
              </div>

              {/* Enterprise name */}
              {accountType === "Enterprise" && (
                <Input
                  label="Enterprise name"
                  name="enterpriseName"
                  value={form.enterpriseName}
                  onChange={handleChange}
                  placeholder="ABC Pvt. Ltd."
                />
              )}

              {/* Username */}
              <Input
                label="Username"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="johndoe"
              />

              {/* Email */}
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />

              {/* Password */}
              <Input
                label="Password"
                name="password"
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                right={
                  <button
                    type="button"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    onClick={() => setShowPwd((s) => !s)}
                    className="text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPwd ? "🙈" : "👁️"}
                  </button>
                }
              />

              {/* Strength meter */}
              <div className="mt-1">
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full ${pwdLabel.bar}`}
                    style={{ width: `${(pwdScore / 4) * 100}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${pwdLabel.color}`}>Password strength: {pwdLabel.text}</p>
              </div>

              {/* Confirm Password */}
              <Input
                label="Confirm password"
                name="confirmPassword"
                type={showConfirmPwd ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                right={
                  <button
                    type="button"
                    aria-label={showConfirmPwd ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirmPwd((s) => !s)}
                    className="text-slate-400 hover:text-slate-200 transition"
                  >
                    {showConfirmPwd ? "🙈" : "👁️"}
                  </button>
                }
              />

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  submitting ||
                  !form.email ||
                  !form.username ||
                  !form.password ||
                  !form.confirmPassword
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-4 py-3 transition shadow-lg shadow-indigo-900/40 mt-2"
              >
                {submitting ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>Sign Up</>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <p className="text-center text-sm text-slate-300">
              Already have an account?{" "}
              <a href="/" className="text-indigo-300 hover:text-indigo-200 font-medium transition">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
