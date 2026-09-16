'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, Boxes, KeyRound, FlaskConical, Plug, BarChart3, User, ShieldCheck, Users, Settings, ChevronLeft, Menu, Terminal, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/primitives';
import { logout } from '@/lib/firebase/client';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/apis', label: 'API Management', icon: Boxes },
  { href: '/keys', label: 'API Keys', icon: KeyRound },
  { href: '/tester', label: 'API Tester', icon: FlaskConical },
  { href: '/providers', label: 'Providers', icon: Plug },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: User },
];
const ADMIN_NAV = [
  { href: '/admin', label: 'Admin Overview', icon: ShieldCheck },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/settings', label: 'Platform Settings', icon: Settings },
];

export function Sidebar({ user }: { user: { email: string | null; displayName: string | null; role: string; photoURL: string | null } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const onLogout = async () => { await logout(); router.push('/login'); router.refresh(); };

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return (
      <Link href={href} onClick={() => setMobileOpen(false)}
        className={cn('group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          active ? 'bg-gradient-to-r from-neon-purple/20 to-neon-blue/10 text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          collapsed && 'justify-center px-2')} title={collapsed ? label : undefined}>
        {active && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-neon-purple to-neon-blue shadow-neon" />}
        <Icon className={cn('h-4 w-4 shrink-0', active && 'text-neon-purple')} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className={cn('flex items-center gap-2 px-4 py-5', collapsed && 'justify-center px-2')}>
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue shadow-neon">
          <Terminal className="h-4 w-4 text-white" />
        </div>
        {!collapsed && <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">Anonymous</p>
          <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">API Manager</p>
        </div>}
        <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="h-4 w-4" /></button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {NAV.map((n) => <NavLink key={n.href} {...n} />)}
        {user.role === 'admin' && (
          <>
            <div className={cn('px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground', collapsed && 'text-center')}>
              {collapsed ? '•••' : 'Administration'}
            </div>
            {ADMIN_NAV.map((n) => <NavLink key={n.href} {...n} />)}
          </>
        )}
      </nav>
      <div className="border-t border-border p-3">
        <div className={cn('flex items-center gap-3 rounded-lg p-2', collapsed && 'justify-center')}>
          {user.photoURL ? <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full ring-1 ring-border" />
            : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-neon-purple to-neon-blue text-xs font-bold text-white">
              {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
            </div>}
          {!collapsed && <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user.displayName ?? 'User'}</p>
            <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
          </div>}
        </div>
        <div className={cn('mt-2 flex gap-2', collapsed && 'flex-col')}>
          <Button variant="ghost" size="sm" onClick={onLogout} className="flex-1 justify-start">
            <LogOut className="h-3.5 w-3.5" />{!collapsed && 'Logout'}
          </Button>
          <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={() => setCollapsed((c) => !c)} aria-label="Collapse">
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-border bg-card/80 p-2 backdrop-blur lg:hidden" aria-label="Open menu">
        <Menu className="h-4 w-4" />
      </button>
      <aside className={cn('hidden shrink-0 border-r border-border bg-card/40 backdrop-blur-xl transition-all duration-300 lg:block', collapsed ? 'w-[76px]' : 'w-64')}>
        {content}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-border bg-card animate-in slide-in-from-left">{content}</aside>
        </div>
      )}
    </>
  );
}
