import React, { useState } from "react";
import { signin } from "../services/authService"; // adjust path if needed

const Login = () => {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
// after successful signin:
try {
  const res = await signin({ identifier: form.identifier.trim(), password: form.password });
  if (res.requires2fa) {
    localStorage.setItem('twofaToken', res.twofaToken);
    window.location.href = '/verify-2fa';
    return;
  }
  localStorage.setItem('token', res.token);
  window.location.href = '/dashboard';
} catch (err) { /* existing error */ }
 finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center mb-6">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mr-3">
            <span className="text-indigo-300 font-bold text-lg">∞</span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Eterna
          </h1>
        </div>

        {/* Card */}
        <div className="relative rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">
          {/* gradient border glow */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10" />

          <div className="relative p-8">
            <div className="mb-6 text-center">
              <h2 className="text-white text-2xl font-semibold">
                Welcome back
              </h2>
              <p className="text-slate-300 text-sm mt-1">
                Sign in with your email or username
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Identifier */}
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm font-medium text-slate-200 mb-1"
                >
                  Email or Username
                </label>
                <div className="relative group">
                  <input
                    id="identifier"
                    name="identifier"
                    autoComplete="username"
                    value={form.identifier}
                    onChange={handleChange}
                    placeholder="you@example.com or johndoe"
                    className="w-full rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-400 px-4 py-3 outline-none ring-0 transition focus:border-indigo-400 focus:bg-slate-900/70"
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/5 group-focus-within:ring-indigo-400/40 transition" />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-200"
                  >
                    Password
                  </label>
                  <a
                    className="text-xs text-indigo-300 hover:text-indigo-200 transition"
                    href="/forgot-password"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative group">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 px-4 py-3 pr-11 outline-none ring-0 transition focus:border-indigo-400 focus:bg-slate-900/70"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? (
                      // Eye-off icon
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 3l18 18M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-3.42M9.88 5.5A9.76 9.76 0 0112 5c4.2 0 7.86 2.61 10 6-0.61 1.08-1.39 2.06-2.3 2.88m-2.2 1.62C15.8 16.76 14 17.5 12 17.5c-4.2 0-7.86-2.61-10-6 0.78-1.39 1.82-2.6 3.05-3.56"
                        />
                      </svg>
                    ) : (
                      // Eye icon
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.1 12.32C3.94 7.97 7.67 5 12 5c4.33 0 8.06 2.97 9.9 7.32-.8 1.79-2.03 3.34-3.53 4.49C16.96 18.56 14.58 19.5 12 19.5s-4.96-.94-6.37-2.69A13.3 13.3 0 012.1 12.32z"
                        />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/5 group-focus-within:ring-indigo-400/40 transition" />
                </div>
              </div>

              {/* Remember me (optional) */}
              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/20 bg-slate-900/60 text-indigo-500 focus:ring-indigo-500"
                  />
                  Remember me
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !form.identifier || !form.password}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-4 py-3 transition shadow-lg shadow-indigo-900/40"
              >
                {submitting ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>Sign In</>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Secondary actions */}
            <p className="text-center text-sm text-slate-300">
              Don’t have an account?{" "}
              <a
                href="/register"
                className="text-indigo-300 hover:text-indigo-200 font-medium transition"
              >
                Create one
              </a>
            </p>
          </div>
        </div>

        {/* Footer mini note */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Secure login • JWT protected • Encrypted at rest
        </p>
      </div>
    </div>
  );
};

export default Login;
