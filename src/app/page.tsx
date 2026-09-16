import Link from 'next/link';
import { Terminal, ShieldCheck, KeyRound, BarChart3, Zap, Globe, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/primitives';

const FEATURES = [
  { icon: KeyRound, title: 'Key Vault', desc: 'Issue, rotate and revoke scoped API keys. Secrets are hashed server-side and shown exactly once.' },
  { icon: ShieldCheck, title: 'SSRF-Guarded Proxy', desc: 'Every outbound call is validated against private IP ranges, metadata endpoints and your allowlist.' },
  { icon: BarChart3, title: 'Live Analytics', desc: 'Requests per day, error rate, latency distribution and rate-limit pressure — exportable to CSV.' },
  { icon: Globe, title: 'Provider Integrations', desc: 'OpenAI, Gemini, Anthropic and any REST API. Real key verification against official endpoints.' },
  { icon: Lock, title: 'Encrypted at Rest', desc: 'Provider credentials sealed with AES-256-GCM. Ciphertext never reaches the browser.' },
  { icon: Zap, title: 'Built on Firebase', desc: 'Firebase Auth + Firestore with hardened security rules and server-side Admin SDK operations.' },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue shadow-neon">
            <Terminal className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Anonymous API Manager</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link href="/register"><Button size="sm">Get started</Button></Link>
        </nav>
      </header>
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-16 text-center sm:pt-24">
        <div className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-400" />
          Production-ready · Firebase-backed · Server-authorized
        </div>
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          Command every API<br /><span className="neon-text">from one dark console.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Connect providers, issue scoped keys, test endpoints, and watch usage in real time — with credentials encrypted server-side and never exposed to the browser.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register"><Button size="lg" className="group">Start free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Button></Link>
          <Link href="/login"><Button size="lg" variant="outline">Sign in</Button></Link>
        </div>
      </section>
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass neon-border group rounded-2xl p-6 transition-transform hover:-translate-y-1">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-blue/10 p-2.5">
                <Icon className="h-5 w-5 text-neon-purple" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="relative z-10 border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Anonymous API Manager. Credentials encrypted with AES-256-GCM.
      </footer>
    </div>
  );
}
