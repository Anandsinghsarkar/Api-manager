'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Terminal, Mail, Lock, User, Chrome } from 'lucide-react';
import { Button, Input, Label, Card } from '@/components/ui/primitives';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { auth, googleProvider, signInWithPopup, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, establishSession } from '@/lib/firebase/client';

function RegisterForm() {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);

  const finish = async (user: any) => {
    await establishSession(user);
    push({ tone: 'success', title: 'Account ready', description: 'Welcome to Anonymous API Manager.' });
    router.push('/dashboard');
    router.refresh();
  };

  const onGoogle = async () => {
    setLoading('google');
    try { const c = await signInWithPopup(auth, googleProvider); await finish(c.user); }
    catch (e: any) { push({ tone: 'error', title: 'Google sign-up failed', description: e.message }); }
    finally { setLoading(null); }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return push({ tone: 'warning', title: 'Weak password', description: 'Use at least 8 characters.' });
    if (form.password !== form.confirm) return push({ tone: 'warning', title: 'Passwords do not match' });
    setLoading('email');
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.name });
      await sendEmailVerification(cred.user);
      await finish(cred.user);
      push({ tone: 'info', title: 'Verify your email', description: 'We sent a verification link to your inbox.' });
    } catch (e: any) {
      push({ tone: 'error', title: 'Registration failed', description: e.code === 'auth/email-already-in-use' ? 'That email is already registered.' : e.message });
    } finally { setLoading(null); }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
      <Card className="relative z-10 w-full max-w-md p-8">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue shadow-neon">
            <Terminal className="h-5 w-5 text-white" />
          </div>
        </Link>
        <h1 className="text-center text-xl font-semibold">Create your account</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Free tier includes 10,000 requests / month</p>
        <Button variant="outline" className="mt-6 w-full" onClick={onGoogle} loading={loading === 'google'}>
          <Chrome className="h-4 w-4" /> Sign up with Google
        </Button>
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {[
            { k: 'name' as const, label: 'Full name', icon: User, type: 'text', ph: 'Jane Doe' },
            { k: 'email' as const, label: 'Email', icon: Mail, type: 'email', ph: 'you@example.com' },
            { k: 'password' as const, label: 'Password', icon: Lock, type: 'password', ph: '••••••••' },
            { k: 'confirm' as const, label: 'Confirm password', icon: Lock, type: 'password', ph: '••••••••' },
          ].map(({ k, label, icon: Icon, type, ph }) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={k}>{label}</Label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id={k} type={type} required value={form[k]} onChange={set(k)} placeholder={ph} className="pl-9" />
              </div>
            </div>
          ))}
          <Button type="submit" className="w-full" loading={loading === 'email'}>Create account</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered? <Link href="/login" className="text-neon-purple hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return <ToastProvider><RegisterForm /></ToastProvider>;
}
