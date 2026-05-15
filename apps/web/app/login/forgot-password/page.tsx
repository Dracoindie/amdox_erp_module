'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Building2, Loader2, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../../../lib/axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      // Always show success (prevents email enumeration)
      setSent(true);
    } catch {
      setError('Cannot reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 ' +
    'placeholder-slate-400 focus:border-[#ff5a00] focus:ring-1 focus:ring-[#ff5a00] outline-none text-sm transition-all duration-300';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-[#ff5a00] opacity-10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-2xl border border-slate-100 relative z-10">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff5a00] to-orange-600 shadow-lg shadow-orange-500/20">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            AMDOX <span className="text-[#ff5a00]">ERP</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Reset your password</p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-800">Check your email</p>
                <p className="mt-1 text-sm text-emerald-700">
                  If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-[#ff5a00] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label htmlFor="email" className="sr-only">Email address</label>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="Your registered email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5a00] to-orange-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending...</> : 'Send Reset Link'}
              </button>
            </form>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-[#ff5a00] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
