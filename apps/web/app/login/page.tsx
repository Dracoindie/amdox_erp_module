'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Mail,
  Building2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { login } from '../../lib/auth';
import { apiErrorMessage } from '../../lib/axios';

// Only same-origin paths are accepted as a post-login redirect.
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.replace(safeNext());
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8fafc] px-4">

      {/* Background Blur Effects */}
      <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-orange-300/20 blur-3xl" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md rounded-[32px] border border-white/40 bg-white/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
            <Building2 className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            AMDOX
            <span className="text-orange-500"> ERP</span>
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Intelligent Enterprise Management Platform
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end">
            <Link
              href="/login/forgot-password"
              className="text-sm font-medium text-orange-500 transition hover:text-orange-600"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-orange-500/30 transition-all duration-300 hover:scale-[1.01] hover:shadow-orange-500/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Authenticating...
              </>
            ) : (
              'ENTER SYSTEM'
            )}
          </button>
        </form>

        

          </div>
        </div>
    
    
  );
}