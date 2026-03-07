'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store';
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
  Map,
  Shield,
  Swords,
  Sparkles,
  Castle,
  ScrollText,
} from 'lucide-react';

/**
 * MMORPG World Map Sidebar — T-0012
 *
 * Zones replace generic nav sections:
 *   🏰 Stronghold (Dashboard) → Town/Home base
 *   ⚔️  Barracks (People)     → Members, sessions, events
 *   ✨  Academy (Growth)       → Skills, ranks, learning
 *   🏰 Guild Hall (Ops)       → Projects, tickets, finance
 *   📜 Archives (Reports)     → Reports, processes, settings
 *
 * T-0015: Items filtered by role (admin sees all, leader sees ops+, member sees limited)
 */

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Minimum role required: member < leader < admin */
  minRole?: 'member' | 'leader' | 'admin';
}

interface NavZone {
  zoneName: string;
  zoneIcon: React.ReactNode;
  zoneColor: string;
  items: NavItem[];
}

const NAV_ZONES: NavZone[] = [
  {
    zoneName: 'Đại Bản Doanh',
    zoneIcon: <Castle className="h-3.5 w-3.5" />,
    zoneColor: 'text-amber-400',
    items: [
      { label: 'Tổng quan', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Thông báo', href: '/notifications', icon: <Bell className="h-4 w-4" /> },
    ],
  },
  {
    zoneName: 'Doanh Trại',
    zoneIcon: <Swords className="h-3.5 w-3.5" />,
    zoneColor: 'text-blue-400',
    items: [
      { label: 'Đoàn sinh', href: '/members', icon: <Users className="h-4 w-4" /> },
      { label: 'Sinh hoạt', href: '/sessions', icon: <Calendar className="h-4 w-4" /> },
      { label: 'Sự kiện', href: '/events', icon: <CalendarDays className="h-4 w-4" /> },
    ],
  },
  {
    zoneName: 'Học Viện',
    zoneIcon: <Sparkles className="h-3.5 w-3.5" />,
    zoneColor: 'text-emerald-400',
    items: [
      { label: 'Kỹ năng', href: '/skills', icon: <Award className="h-4 w-4" /> },
      { label: 'Bảng xếp hạng', href: '/leaderboard', icon: <Trophy className="h-4 w-4" /> },
      { label: 'Học tập', href: '/lms', icon: <BookOpen className="h-4 w-4" /> },
    ],
  },
  {
    zoneName: 'Hội Sở',
    zoneIcon: <Shield className="h-3.5 w-3.5" />,
    zoneColor: 'text-purple-400',
    items: [
      {
        label: 'Dự án',
        href: '/projects',
        icon: <FolderKanban className="h-4 w-4" />,
        minRole: 'leader',
      },
      { label: 'Yêu cầu', href: '/tickets', icon: <Ticket className="h-4 w-4" /> },
      {
        label: 'Tài chính',
        href: '/finance',
        icon: <Wallet className="h-4 w-4" />,
        minRole: 'admin',
      },
      {
        label: 'Tài sản',
        href: '/assets',
        icon: <Package className="h-4 w-4" />,
        minRole: 'leader',
      },
    ],
  },
  {
    zoneName: 'Thư Viện',
    zoneIcon: <ScrollText className="h-3.5 w-3.5" />,
    zoneColor: 'text-rose-400',
    items: [
      {
        label: 'Báo cáo',
        href: '/reports',
        icon: <BarChart3 className="h-4 w-4" />,
        minRole: 'leader',
      },
      {
        label: 'Quy trình',
        href: '/process',
        icon: <Workflow className="h-4 w-4" />,
        minRole: 'admin',
      },
      { label: 'Cài đặt', href: '/settings', icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

const ROLE_HIERARCHY: Record<string, number> = {
  member: 1,
  leader: 2,
  admin: 3,
};

function hasAccess(userRole: string | undefined, minRole?: string): boolean {
  if (!minRole) return true;
  const userLevel = ROLE_HIERARCHY[userRole || 'member'] || 1;
  const requiredLevel = ROLE_HIERARCHY[minRole] || 1;
  return userLevel >= requiredLevel;
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const userRole = user?.role || 'admin'; // Default admin for dev

  const content = (
    <div className="flex h-full flex-col">
      {/* App branding */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-[hsl(var(--border))]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
          <Hexagon className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-[hsl(var(--foreground))]">
            TTNDD Ops
          </span>
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Hệ thống quản lý</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto lg:hidden text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* World Map Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_ZONES.map((zone) => {
          const visibleItems = zone.items.filter((item) => hasAccess(userRole, item.minRole));
          if (visibleItems.length === 0) return null;

          return (
            <div key={zone.zoneName}>
              {/* Zone Header */}
              <div className="flex items-center gap-2 mb-2 px-3">
                <span className={zone.zoneColor}>{zone.zoneIcon}</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                  {zone.zoneName}
                </p>
                <div className="flex-1 h-px bg-[hsl(var(--border)_/_0.5)]" />
              </div>

              {/* Zone Items */}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                        active
                          ? 'bg-gradient-to-r from-[hsl(var(--primary)_/_0.15)] to-[hsl(var(--primary)_/_0.05)] text-[hsl(var(--primary))] font-medium border-l-2 border-[hsl(var(--primary))]'
                          : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)_/_0.5)] hover:text-[hsl(var(--foreground))] hover:translate-x-0.5',
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Mini Map indicator */}
      <div className="border-t border-[hsl(var(--border))] px-4 py-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <Map className="h-3.5 w-3.5" />
          <span className="font-mono">v0.1.0</span>
          <span className="text-[10px]">·</span>
          <span className="capitalize text-[10px]">{userRole}</span>
        </div>
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
