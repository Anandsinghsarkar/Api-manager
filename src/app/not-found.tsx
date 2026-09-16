import Link from 'next/link';
import { Ghost, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/primitives';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-center">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
      <div className="relative z-10">
        <Ghost className="mx-auto h-14 w-14 text-neon-purple/60" />
        <h1 className="mt-6 text-6xl font-bold tracking-tight neon-text">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">This route doesn't exist in the console.</p>
        <Link href="/dashboard" className="mt-8 inline-block">
          <Button><ArrowLeft className="h-4 w-4" /> Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
