'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Building2, Loader2, AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import api from '../../../lib/axios';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Cannot reach the server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-slate-900 ' +
    'placeholder-slate-400 focus:border-[#ff5a00] focus:ring-1 focus:ring-[#ff5a00] outline-none text-sm transition-all duration-300';

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="font-semibold text-rose-700">Invalid or missing reset token.</p>
        <Link href="/login/forgot-password" className="text-sm text-[#ff5a00] hover:underline">Request a new reset link</Link>
      </div>
    );
  }

  return (
    <>
      {done ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
          <div>
            <p className="font-semibold text-emerald-800">Password reset!</p>
            <p className="mt-1 text-sm text-emerald-700">Redirecting to login in 3 seconds...</p>
          </div>
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
            {/* New Password */}
            <div className="relative">
              <label htmlFor="password" className="sr-only">New Password</label>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="New password (min 8 chars)"
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <label htmlFor="confirm" className="sr-only">Confirm Password</label>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="confirm"
                type={showPwd ? 'text' : 'password'}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputCls}
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5a00] to-orange-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Resetting...</> : 'Set New Password'}
            </button>
          </form>
        </>
      )}
      <Link href="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-[#ff5a00] transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-[#ff5a00] opacity-10 blur-[120px] pointer-events-none" />
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-2xl border border-slate-100 relative z-10">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff5a00] to-orange-600 shadow-lg shadow-orange-500/20">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">AMDOX <span className="text-[#ff5a00]">ERP</span></h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Set your new password</p>
        </div>
        <Suspense fallback={<div className="text-center text-slate-400 text-sm">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
