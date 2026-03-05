'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bell,
  Users,
  Calendar,
  CalendarDays,
  Award,
  Trophy,
  BookOpen,
  FolderKanban,
  Ticket,
  Wallet,
  Package,
  BarChart3,
  Workflow,
  Settings,
  X,
  Hexagon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Tổng quan',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Thông báo', href: '/notifications', icon: <Bell className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Con người',
    items: [
      { label: 'Đoàn sinh', href: '/members', icon: <Users className="h-4 w-4" /> },
      { label: 'Sinh hoạt', href: '/sessions', icon: <Calendar className="h-4 w-4" /> },
      { label: 'Sự kiện', href: '/events', icon: <CalendarDays className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Phát triển',
    items: [
      { label: 'Kỹ năng', href: '/skills', icon: <Award className="h-4 w-4" /> },
      { label: 'Bảng xếp hạng', href: '/leaderboard', icon: <Trophy className="h-4 w-4" /> },
      { label: 'Học tập', href: '/lms', icon: <BookOpen className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Quản lý',
    items: [
      { label: 'Dự án', href: '/projects', icon: <FolderKanban className="h-4 w-4" /> },
      { label: 'Yêu cầu', href: '/tickets', icon: <Ticket className="h-4 w-4" /> },
      { label: 'Tài chính', href: '/finance', icon: <Wallet className="h-4 w-4" /> },
      { label: 'Tài sản', href: '/assets', icon: <Package className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Nâng cao',
    items: [
      { label: 'Báo cáo', href: '/reports', icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Quy trình', href: '/process', icon: <Workflow className="h-4 w-4" /> },
      { label: 'Cài đặt', href: '/settings', icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-[hsl(var(--border))]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
          <Hexagon className="h-4 w-4" />
        </div>
        <span className="text-lg font-bold tracking-tight text-[hsl(var(--foreground))]">
          TTNDD Ops
        </span>
        {onClose && (
          <button onClick={onClose} className="ml-auto lg:hidden text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-[hsl(var(--primary)_/_0.1)] text-[hsl(var(--primary))] font-medium'
                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]',
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[hsl(var(--border))] px-4 py-3">
        <p className="text-xs text-[hsl(var(--muted-foreground))]">TTNDD Ops v0.1.0</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-full w-64 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {content}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[hsl(var(--card))] shadow-xl lg:hidden">
            {content}
          </aside>
        </>
      )}
    </>
  );
}
