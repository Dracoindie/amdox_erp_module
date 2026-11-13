'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import api, { apiErrorMessage } from '../../../lib/axios';
import { AuthCard } from '../../../components/AuthCard';
import { Alert, Button, Field, Form, Input, Skeleton } from '../../../components/ui';

const back = (
  <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-fg-muted hover:text-fg">
    <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
  </Link>
);

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthCard title="Link not valid" footer={back}>
        <Alert tone="danger" title="This reset link is missing its token.">
          <Link href="/login/forgot-password" className="font-medium underline">Request a new link</Link>
        </Alert>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Password updated" footer={back}>
        <div className="flex gap-3 text-sm text-fg-muted">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
          <p>You can now sign in with your new password.</p>
        </div>
        <Button className="mt-5 w-full" onClick={() => router.push('/login')}>Go to sign in</Button>
      </AuthCard>
    );
  }

  const submit = async () => {
    setError(null);
    if (password !== confirm) {
      setMismatch('The passwords do not match.');
      return;
    }
    setMismatch(null);
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reset the password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Choose a new password" description="Use at least 8 characters." footer={back}>
      <Form onSubmit={submit}>
        <Field label="New password" name="password" hint="At least 8 characters">
          <div className="relative">
            <Input type={show ? 'text' : 'password'} icon={Lock} required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="[&_input]:pr-10" />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide passwords' : 'Show passwords'}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-fg-subtle hover:text-fg"
            >
              {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </Field>
        <Field label="Confirm new password" name="confirm" error={mismatch}>
          <Input type={show ? 'text' : 'password'} icon={Lock} required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setMismatch(null); }} />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" loading={loading} className="w-full">{loading ? 'Saving…' : 'Set new password'}</Button>
      </Form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-32 w-full max-w-sm px-4"><Skeleton className="h-72 rounded-2xl" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
