'use client';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/primitives';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-center">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="relative z-10">
        <AlertOctagon className="mx-auto h-14 w-14 text-red-400/70" />
        <h1 className="mt-6 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">An unexpected error occurred. The issue has been logged.</p>
        {error.digest && <p className="mt-2 font-mono text-[11px] text-muted-foreground">Reference: {error.digest}</p>}
        <div className="mt-8 flex justify-center gap-2">
          <Button onClick={reset}><RotateCcw className="h-4 w-4" /> Try again</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>Go to dashboard</Button>
        </div>
      </div>
    </div>
  );
}
