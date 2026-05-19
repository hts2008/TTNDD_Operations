'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CalendarDays,
  Castle,
  FolderKanban,
  Hexagon,
  LayoutDashboard,
  Map,
  Package,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Ticket,
  Trophy,
  Users,
  Wallet,
  Workflow,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  minRole?: 'member' | 'leader' | 'admin';
}

interface NavZone {
  zoneName: string;
  zoneIcon: React.ReactNode;
  zoneColor: string;
  items: NavItem[];
}

const navZones: NavZone[] = [
  {
    zoneName: 'Trung tam dieu hanh',
    zoneIcon: <Castle className="h-3.5 w-3.5" />,
    zoneColor: 'text-[hsl(var(--sidebar-accent))]',
    items: [
      { label: 'Tong quan', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Thong bao', href: '/notifications', icon: <Bell className="h-4 w-4" /> },
    ],
  },
  {
    zoneName: 'Doan va sinh hoat',
    zoneIcon: <Swords className="h-3.5 w-3.5" />,
    zoneColor: 'text-sky-300',
    items: [
      { label: 'Doan sinh', href: '/members', icon: <Users className="h-4 w-4" /> },
      { label: 'Sinh hoat', href: '/sessions', icon: <Calendar className="h-4 w-4" /> },
      { label: 'Su kien', href: '/events', icon: <CalendarDays className="h-4 w-4" /> },
    ],
  },
  {
    zoneName: 'Dao tao va tien bo',
    zoneIcon: <Sparkles className="h-3.5 w-3.5" />,
    zoneColor: 'text-emerald-300',
    items: [
      { label: 'Ky nang', href: '/skills', icon: <Award className="h-4 w-4" /> },
      { label: 'Bang xep hang', href: '/leaderboard', icon: <Trophy className="h-4 w-4" /> },
      { label: 'Hoc tap', href: '/lms', icon: <BookOpen className="h-4 w-4" /> },
    ],
  },
  {
    zoneName: 'Van hanh',
    zoneIcon: <Shield className="h-3.5 w-3.5" />,
    zoneColor: 'text-violet-300',
    items: [
      {
        label: 'Du an',
        href: '/projects',
        icon: <FolderKanban className="h-4 w-4" />,
        minRole: 'leader',
      },
      { label: 'Yeu cau', href: '/tickets', icon: <Ticket className="h-4 w-4" /> },
      {
        label: 'Tai chinh',
        href: '/finance',
        icon: <Wallet className="h-4 w-4" />,
        minRole: 'admin',
      },
      {
        label: 'Tai san',
        href: '/assets',
        icon: <Package className="h-4 w-4" />,
        minRole: 'leader',
      },
    ],
  },
  {
    zoneName: 'Quan tri va bao cao',
    zoneIcon: <ScrollText className="h-3.5 w-3.5" />,
    zoneColor: 'text-rose-300',
    items: [
      {
        label: 'Bao cao',
        href: '/reports',
        icon: <BarChart3 className="h-4 w-4" />,
        minRole: 'leader',
      },
      {
        label: 'Quy trinh',
        href: '/process',
        icon: <Workflow className="h-4 w-4" />,
        minRole: 'admin',
      },
      { label: 'Cai dat', href: '/settings', icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

const roleHierarchy: Record<string, number> = {
  member: 1,
  leader: 2,
  admin: 3,
  super_admin: 3,
};

function hasAccess(userRole: string | undefined, minRole?: string): boolean {
  if (!minRole) return true;
  const userLevel = roleHierarchy[userRole || 'member'] || 1;
  const requiredLevel = roleHierarchy[minRole] || 1;
  return userLevel >= requiredLevel;
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const userRole = user?.role || 'member';

  const content = (
    <div className="flex h-full flex-col text-[hsl(var(--sidebar-foreground))]">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar))] shadow-sm">
          <Hexagon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex flex-col">
          <span className="truncate text-sm font-bold tracking-tight">TTNDD Ops</span>
          <span className="text-[10px] text-[hsl(var(--sidebar-muted))]">Operations platform</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navZones.map((zone) => {
          const visibleItems = zone.items.filter((item) => hasAccess(userRole, item.minRole));
          if (visibleItems.length === 0) return null;

          return (
            <div key={zone.zoneName}>
              <div className="mb-2 flex items-center gap-2 px-3">
                <span className={zone.zoneColor}>{zone.zoneIcon}</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                  {zone.zoneName}
                </p>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'border-l-2 border-[hsl(var(--sidebar-accent))] bg-white/10 text-white shadow-sm'
                          : 'text-white/70 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--sidebar-muted))]">
          <Map className="h-3.5 w-3.5" />
          <span className="font-mono">v0.1.0</span>
          <span className="text-[10px]">/</span>
          <span className="text-[10px] capitalize">{userRole}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-full w-64 flex-col border-r border-black/10 bg-[hsl(var(--sidebar))] lg:flex">
        {content}
      </aside>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[hsl(var(--sidebar))] shadow-xl lg:hidden">
            {content}
          </aside>
        </>
      )}
    </>
  );
}
