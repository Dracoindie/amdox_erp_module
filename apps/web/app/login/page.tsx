'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, Building2, Loader2, AlertCircle } from 'lucide-react';
import api from '../../lib/axios';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [tenant,   setTenant]   = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });

      localStorage.setItem('amx_access_token', data.data.accessToken);
      localStorage.setItem('amx_user', JSON.stringify(data.data.user));
      router.push('/');
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Cannot reach the API server. Make sure the backend is running on port 4000.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 ' +
    'placeholder-slate-400 focus:border-[#ff5a00] focus:ring-1 focus:ring-[#ff5a00] ' +
    'outline-none text-sm transition-all duration-300';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-[#ff5a00] opacity-10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-[#ff5a00] opacity-5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-2xl border border-slate-100 relative z-10">

        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff5a00] to-orange-600 shadow-lg shadow-orange-500/20">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            AMDOX <span className="text-[#ff5a00]">ERP</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Intelligent Resource Planning Platform
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant */}
          <div className="relative">
            <label htmlFor="tenant-id" className="sr-only">Organisation ID</label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Building2 className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="tenant-id"
              type="text"
              value={tenant}
              onChange={e => setTenant(e.target.value)}
              className={inputCls}
              placeholder="Organisation ID (optional)"
            />
          </div>

          {/* Email */}
          <div className="relative">
            <label htmlFor="email-address" className="sr-only">Email address</label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="email-address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputCls}
              placeholder="Email address"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <label htmlFor="password" className="sr-only">Password</label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputCls}
              placeholder="Password"
            />
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <Link
              href="/login/forgot-password"
              className="text-xs font-medium text-[#ff5a00] hover:text-orange-700 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5a00] to-orange-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:from-orange-500 hover:to-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5a00] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Authenticating...</>
              : 'ENTER SYSTEM'}
          </button>
        </form>

        {/* Dev hint */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500 mt-8">
          <p className="font-semibold text-slate-700 mb-2">Development Access</p>
          <div className="space-y-1.5">
            <p className="flex justify-between"><span>Email:</span> <code className="font-mono text-[#ff5a00] font-bold">admin@amdox.com</code></p>
            <p className="flex justify-between"><span>Password:</span> <code className="font-mono text-[#ff5a00] font-bold">Admin@1234</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}