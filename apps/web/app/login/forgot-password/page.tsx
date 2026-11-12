'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import api, { apiErrorMessage } from '../../../lib/axios';
import { AuthCard } from '../../../components/AuthCard';
import { Alert, Button, Field, Form, Input } from '../../../components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true); // same answer whether or not the address exists (no enumeration)
    } catch (err) {
      setError(apiErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const back = (
    <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-fg-muted hover:text-fg">
      <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
    </Link>
  );

  if (sent) {
    return (
      <AuthCard title="Request received" footer={back}>
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          <div className="space-y-2 text-sm text-fg-muted">
            <p>
              If <span className="font-medium text-fg">{email}</span> belongs to an account, the reset request has been recorded.
            </p>
            {/* No e-mail provider is configured yet (see README → Limitations), so don't promise an e-mail. */}
            <p>E-mail delivery isn&apos;t set up yet, so please contact your administrator to reset your password.</p>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" description="Enter the e-mail address you sign in with." footer={back}>
      <Form onSubmit={submit}>
        <Field label="Email" name="email">
          <Input type="email" icon={Mail} required autoComplete="username" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@amdox.com" />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" loading={loading} className="w-full">{loading ? 'Sending…' : 'Request reset'}</Button>
      </Form>
    </AuthCard>
  );
}
