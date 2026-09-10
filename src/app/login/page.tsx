"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push("/dashboard");
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-blue-100/50 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-indigo-100/50 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-3xl" />
      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="hidden lg:block">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm mb-6">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Business Management Platform
            </div>

            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight text-[#0a1628] leading-tight">
              One Platform.
              <br />
              Every Business.
            </h1>

            <p className="mt-6 text-lg text-slate-500 leading-8 max-w-lg">
              Manage customers, appointments, sales, teams and conversations
              with powerful tools built for modern businesses.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
              <div className="rounded-xl bg-white/80 border border-slate-200 px-4 py-3 shadow-sm">
                <p className="text-sm font-semibold text-[#0a1628]">Customers</p>
                <p className="text-xs text-slate-500 mt-1">Manage relationships</p>
              </div>

              <div className="rounded-xl bg-white/80 border border-slate-200 px-4 py-3 shadow-sm">
                <p className="text-sm font-semibold text-[#0a1628]">Automation</p>
                <p className="text-xs text-slate-500 mt-1">Save valuable time</p>
              </div>

              <div className="rounded-xl bg-white/80 border border-slate-200 px-4 py-3 shadow-sm">
                <p className="text-sm font-semibold text-[#0a1628]">Appointments</p>
                <p className="text-xs text-slate-500 mt-1">Stay organized</p>
              </div>

              <div className="rounded-xl bg-white/80 border border-slate-200 px-4 py-3 shadow-sm">
                <p className="text-sm font-semibold text-[#0a1628]">WhatsApp</p>
                <p className="text-xs text-slate-500 mt-1">Connect instantly</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
          <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img
              src="/branding/zivexo-logo.png"
              alt="ZIVEXO"
              className="h-10 w-10 object-contain"
            />
            <span className="text-2xl font-bold text-[#0a1628]">ZIVEXO</span>
          </Link>
          <h2 className="text-2xl font-bold text-[#0a1628] mt-6">
            One Platform. Every Business.
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            Manage your business, customers, teams and conversations — all in one place.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[#0a1628]">
              Sign in to ZIVEXO
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Access your business workspace securely.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0a1628] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-[#0a1628]">Password</label>
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-[#0a1628] caret-[#0a1628] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm font-medium"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0a1628] to-[#1d3557] text-white py-3.5 rounded-xl font-semibold hover:from-[#12213a] hover:to-[#27466f] transition-all duration-200 shadow-lg shadow-slate-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <span className="text-sm">🔒</span>
            <span className="text-xs font-medium text-slate-600">
              Secure login • Your account is protected
            </span>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              New to ZIVEXO?{" "}
              <Link
                href="/signup"
                className="text-[#0a1628] hover:text-blue-600 font-semibold transition-colors"
              >
                Create your account
              </Link>
            </p>
          </div>
        </div>

        <footer className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img
              src="/branding/zivexo-logo.png"
              alt="ZIVEXO"
              className="h-6 w-6 object-contain"
            />
            <span className="text-sm font-bold tracking-wide text-[#0a1628]">
              ZIVEXO
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            One Platform. Every Business.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
            <Link href="/privacy-policy" className="hover:text-[#0a1628] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#0a1628] transition-colors">
              Terms
            </Link>
            <Link href="/refund-policy" className="hover:text-[#0a1628] transition-colors">
              Refund Policy
            </Link>
            <Link href="/" className="hover:text-[#0a1628] transition-colors">
              Contact
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/70">
            <p className="text-[11px] text-slate-400">
              © 2026 ZIVEXO Enterprises. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
    </div>
  );
}
