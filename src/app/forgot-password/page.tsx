'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button, Input, Label, Card } from '@/components/ui/primitives';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { auth, sendPasswordResetEmail } from '@/lib/firebase/client';

function Reset() {
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await sendPasswordResetEmail(auth, email); setSent(true); push({ tone: 'success', title: 'Reset link sent', description: 'Check your inbox (and spam folder).' }); }
    catch { setSent(true); }
    finally { setLoading(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <Card className="relative z-10 w-full max-w-md p-8">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </Link>
        <h1 className="mt-6 text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">We'll email you a secure reset link.</p>
        {sent ? (
          <div className="mt-6 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Button type="submit" className="w-full" loading={loading}>Send reset link</Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return <ToastProvider><Reset /></ToastProvider>;
}
