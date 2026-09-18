'use client';
import { Sidebar } from './sidebar';
import { ThemeToggle } from './theme-toggle';
import { ToastProvider } from '@/components/ui/toast';
import type { SessionUser } from '@/lib/auth/session';

export function Shell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="relative flex min-h-screen bg-background">
        <div className="pointer-events-none fixed inset-0 grid-bg opacity-40" />
        <div className="pointer-events-none fixed inset-0 bg-grid-glow" />
        <Sidebar user={user} />
        <main className="relative flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/80 px-4 pl-16 shadow-sm backdrop-blur-xl sm:px-6 lg:pl-6">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-400" />
              <span className="text-xs text-muted-foreground">All systems operational</span>
            </div>
            <ThemeToggle />
          </header>
          <div className="mx-auto max-w-7xl p-4 pb-6 animate-fade-up sm:p-6">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
