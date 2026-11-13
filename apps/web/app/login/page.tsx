'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { login } from '../../lib/auth';
import { apiErrorMessage } from '../../lib/axios';
import { AuthCard } from '../../components/AuthCard';
import { Alert, Button, Field, Form, Input } from '../../components/ui';

// Only same-origin paths are accepted as a post-login redirect.
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

const noop = () => () => {};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // ?expired=1 is set when a session ends mid-use (static page: read on the client only)
  const expired = useSyncExternalStore(noop, () => new URLSearchParams(window.location.search).has('expired'), () => false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace(safeNext());
    } catch (err) {
      setError(apiErrorMessage(err, 'Sign-in failed. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Sign in" description="Use your Amdox work account.">
      {expired && !error && <Alert tone="info" className="mb-4">Your session ended. Please sign in again.</Alert>}
      <Form onSubmit={submit}>
        <Field label="Email" name="email">
          <Input
            type="email"
            icon={Mail}
            required
            autoComplete="username"
            inputMode="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@amdox.com"
          />
        </Field>
        <Field label="Password" name="password">
          <div className="relative">
            <Input
              type={show ? 'text' : 'password'}
              icon={Lock}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="[&_input]:pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-fg-subtle hover:text-fg"
            >
              {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Link href="/login/forgot-password" className="text-sm font-medium text-primary hover:underline dark:text-primary-soft-fg">
            Forgot password?
          </Link>
        </div>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" loading={loading} className="w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </Form>
    </AuthCard>
  );
}
