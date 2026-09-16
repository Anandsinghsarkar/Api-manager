'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Terminal, Mail, Lock, Chrome } from 'lucide-react';
import { Button, Input, Label, Card } from '@/components/ui/primitives';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, establishSession } from '@/lib/firebase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);

  const finish = async (user: any) => {
    const { role } = await establishSession(user);
    push({ tone: 'success', title: 'Signed in', description: `Welcome back${role === 'admin' ? ', admin' : ''}.` });
    router.push(next);
    router.refresh();
  };

  const onGoogle = async () => {
    setLoading('google');
    try { const cred = await signInWithPopup(auth, googleProvider); await finish(cred.user); }
    catch (e: any) { push({ tone: 'error', title: 'Google sign-in failed', description: e.message }); }
    finally { setLoading(null); }
  };

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('email');
    try { const cred = await signInWithEmailAndPassword(auth, email, password); await finish(cred.user); }
    catch (e: any) { push({ tone: 'error', title: 'Sign-in failed', description: e.code === 'auth/invalid-credential' ? 'Invalid email or password.' : e.message }); }
    finally { setLoading(null); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
      <Card className="relative z-10 w-full max-w-md p-8">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue shadow-neon">
            <Terminal className="h-5 w-5 text-white" />
          </div>
        </Link>
        <h1 className="text-center text-xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Sign in to your console</p>
        <Button variant="outline" className="mt-8 w-full" onClick={onGoogle} loading={loading === 'google'}>
          <Chrome className="h-4 w-4" /> Continue with Google
        </Button>
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={onEmail} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" autoComplete="email" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-[11px] text-neon-purple hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" autoComplete="current-password" />
            </div>
          </div>
          <Button type="submit" className="w-full" loading={loading === 'email'}>Sign in</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account? <Link href="/register" className="text-neon-purple hover:underline">Create one</Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return <ToastProvider><Suspense fallback={null}><LoginForm /></Suspense></ToastProvider>;
}
