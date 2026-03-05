'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Bell, Menu, LogOut, User, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: 'Tổng quan',
  members: 'Đoàn sinh',
  sessions: 'Sinh hoạt',
  events: 'Sự kiện',
  skills: 'Kỹ năng',
  leaderboard: 'Bảng xếp hạng',
  lms: 'Học tập',
  projects: 'Dự án',
  tickets: 'Yêu cầu',
  finance: 'Tài chính',
  assets: 'Tài sản',
  reports: 'Báo cáo',
  process: 'Quy trình',
  settings: 'Cài đặt',
  notifications: 'Thông báo',
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
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg) => BREADCRUMB_MAP[seg] || seg);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />}
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? 'font-medium text-[hsl(var(--foreground))]'
                    : 'text-[hsl(var(--muted-foreground))]'
                }
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/notifications')}
          className="relative rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))]">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="hidden text-sm font-medium text-[hsl(var(--foreground))] md:inline-block">
              {user?.email || 'Người dùng'}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-1 shadow-lg">
              <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">{user?.email || 'user@ttndd.org'}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">{user?.role || 'admin'}</p>
              </div>
              <button
                onClick={() => { setDropdownOpen(false); router.push('/settings'); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <User className="h-4 w-4" />
                Hồ sơ cá nhân
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
