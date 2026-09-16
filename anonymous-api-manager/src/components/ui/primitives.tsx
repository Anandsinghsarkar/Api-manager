'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-gradient-to-r from-neon-purple to-neon-blue text-white shadow-neon-sm hover:brightness-110',
      secondary: 'bg-muted text-foreground hover:bg-muted/70',
      ghost: 'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
      destructive: 'bg-destructive text-destructive-foreground hover:brightness-110',
      outline: 'border border-border bg-transparent hover:bg-muted/50',
    };
    const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base', icon: 'h-9 w-9' };
    return (
      <button ref={ref} disabled={disabled || loading}
        className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)} {...props}>
        {loading && <Spinner className="h-4 w-4" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export const Spinner = ({ className }: { className?: string }) => (
  <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
  </svg>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn('flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm',
      'placeholder:text-muted-foreground/60 transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-primary/50',
      'disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn('flex min-h-[96px] w-full rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono',
      'placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn('flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60', className)} {...props}>{children}</select>
  ),
);
Select.displayName = 'Select';

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('text-xs font-medium uppercase tracking-wider text-muted-foreground', className)} {...props} />
);

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('glass neon-border rounded-2xl', className)} {...props} />
);
export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />
);
export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-base font-semibold tracking-tight', className)} {...props} />
);
export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
);
export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 pt-0', className)} {...props} />
);

const badgeTones = {
  default: 'bg-muted text-muted-foreground border-border',
  success: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  danger: 'bg-red-500/12 text-red-400 border-red-500/25',
  info: 'bg-blue-500/12 text-blue-400 border-blue-500/25',
  purple: 'bg-purple-500/12 text-purple-300 border-purple-500/25',
};
export const Badge = ({ tone = 'default', className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof badgeTones }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', badgeTones[tone], className)} {...props} />
);

export const Switch = ({ checked, onCheckedChange, disabled, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; label?: string }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
      checked ? 'bg-gradient-to-r from-neon-purple to-neon-blue' : 'bg-muted', disabled && 'opacity-50')}>
    <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
  </button>
);

export function Dialog({ open, onClose, title, description, children, footer }: {
  open: boolean; onClose: () => void; title: string; description?: string;
  children?: React.ReactNode; footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="glass relative z-10 w-full max-w-lg animate-fade-up rounded-2xl p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }: { tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1', className)}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
            value === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('relative overflow-hidden rounded-lg bg-muted/50', className)}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent" />
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
    <div className="rounded-full bg-muted/60 p-3"><Icon className="h-6 w-6 text-muted-foreground" /></div>
    <div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
    {action}
  </div>
);
