import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const fmtNumber = (n: number) =>
  new Intl.NumberFormat('en-US', { notation: n >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n ?? 0);

export const fmtDate = (v: unknown) => {
  if (!v) return '—';
  const d = typeof v === 'object' && v !== null && 'toDate' in v ? (v as any).toDate() : new Date(v as any);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

export const maskEmail = (e?: string) => (e ? e.replace(/(.{2}).*(@.*)/, '$1***$2') : '—');
