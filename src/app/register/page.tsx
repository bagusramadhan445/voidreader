"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp } from "@/lib/supabase/auth";
import { VoidLogo } from "@/components/ui/VoidLogo";
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/profile";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username || !email || !password) {
      setErrorMsg("Semua kolom (Nama Pengguna, Email, Kata Sandi) wajib diisi.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Kata sandi minimal harus terdiri dari 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      // 3. Register page only uses supabase.auth.signUp()
      const res = await signUp(email, password, username);

      if (res.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }

      if (!res.session && res.user) {
        setSuccessMsg(
          "Pendaftaran berhasil! Silakan periksa kotak masuk atau spam email Anda untuk konfirmasi akun sebelum masuk."
        );
      } else {
        setSuccessMsg("Pendaftaran berhasil! Mengalihkan ke akun Anda...");
        setTimeout(() => {
          router.push(redirectPath);
        }, 1200);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem saat mendaftar."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block mb-3 hover:scale-105 transition-transform">
          <VoidLogo size="lg" />
        </Link>
        <p className="text-sm text-gray-400 mt-2">
          Portal Sinkronisasi Cloud & Komunitas Void Reader
        </p>
      </div>

      {/* Auth Card */}
      <div className="bg-[#111827] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,229,255,0.15)] backdrop-blur-xl">
        {/* Mode Switcher Tabs */}
        <div className="flex p-1 bg-[#080B14] rounded-2xl border border-white/5 mb-6">
          <Link
            href={`/login${redirectPath !== "/profile" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
            className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-gray-400 hover:text-white"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </Link>
          <button
            type="button"
            className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all bg-[#00E5FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar Akun</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-[#00E5FF] text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">
              Nama Pengguna
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="misal: KazutoOtaku"
                className="w-full bg-[#080B14] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">
              Alamat Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-[#080B14] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full bg-[#080B14] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mendaftarkan Akun...</span>
              </>
            ) : (
              <>
                <span>Buat Akun Baru</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Link to Login */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Sudah punya akun?{" "}
            <Link
              href={`/login${redirectPath !== "/profile" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
              className="text-[#00E5FF] hover:underline font-semibold"
            >
              Masuk di sini
            </Link>
          </p>
        </div>

        {/* Guest Mode Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800" />
          </div>
          <span className="relative px-3 bg-[#111827] text-xs text-gray-500 font-mono">
            atau
          </span>
        </div>

        {/* Continue as Guest */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full py-2.5 px-4 rounded-xl bg-[#080B14] hover:bg-white/5 border border-white/5 text-xs font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-2 transition-all"
        >
          <span>Lanjut sebagai Tamu (Mode Lokal)</span>
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      </div>

      {/* Footnote */}
      <p className="text-center text-[11px] text-gray-500 mt-6">
        Privasi Terjaga • Cloud Sync Tanpa Iklan Pengganggu
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#080B14] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient neon glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <Suspense
        fallback={
          <div className="w-full max-w-md flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
