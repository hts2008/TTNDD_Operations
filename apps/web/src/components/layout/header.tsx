'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronRight, LogOut, Menu, User } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Tong quan',
  members: 'Doan sinh',
  compliance: 'Tuan thu',
  sessions: 'Sinh hoat',
  events: 'Su kien',
  skills: 'Ky nang',
  scout: 'Scout',
  rewards: 'Rewards',
  badges: 'Badges',
  leaderboard: 'Bang xep hang',
  lms: 'Hoc tap',
  battle: 'Battle',
  projects: 'Du an',
  plans: 'Ke hoach',
  tickets: 'Yeu cau',
  approvals: 'Phe duyet',
  finance: 'Tai chinh',
  assets: 'Tai san',
  reports: 'Bao cao',
  process: 'Quy trinh',
  sops: 'SOP',
  templates: 'Mau quy trinh',
  settings: 'Cai dat',
  notifications: 'Thong bao',
  enrichment: 'Tam linh',
};

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((segment) => breadcrumbMap[segment] || segment);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[hsl(var(--border)_/_0.75)] bg-[hsl(var(--card)_/_0.94)] px-4 shadow-sm backdrop-blur lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
            TTNDD Operations
          </div>
          <nav className="flex min-w-0 items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                )}
                <span
                  className={
                    index === breadcrumbs.length - 1
                      ? 'truncate font-medium text-[hsl(var(--foreground))]'
                      : 'truncate text-[hsl(var(--muted-foreground))]'
                  }
                >
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => router.push('/notifications')}
          className="relative rounded-md p-2 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[hsl(var(--destructive))]" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-[hsl(var(--muted))]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))]">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="hidden max-w-52 truncate text-sm font-medium text-[hsl(var(--foreground))] md:inline-block">
              {user?.email || 'Nguoi dung'}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-1 shadow-lg">
              <div className="border-b border-[hsl(var(--border))] px-3 py-2">
                <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                  {user?.email || 'user@ttndd.org'}
                </p>
                <p className="text-xs capitalize text-[hsl(var(--muted-foreground))]">
                  {user?.role || 'member'}
                </p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push('/settings');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <User className="h-4 w-4" />
                Ho so ca nhan
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--destructive))] transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Dang xuat
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
