'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageEmpty, PageError, PageLoading } from '@/components/ui/page-states';
import { api } from '@/lib/api';
import {
  Award,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Ticket,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

interface DashboardWidget {
  label: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'flat';
}

interface RecentActivity {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  createdAt: string;
  userId?: string;
}

interface OrgDashboard {
  widgets: DashboardWidget[];
  recentActivity: RecentActivity[];
}

interface SpicesDashboard {
  tamTru: {
    daoDuc: number;
    phuongPhap: number;
    giaoDuc: number;
  };
  totalSessions: number;
  balanceScore: number;
}

const WIDGET_ICONS = [Users, Calendar, Zap, BookOpen, Ticket, Wallet, CalendarDays, Award];
const WIDGET_COLORS = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-orange-500',
];

function formatValue(value: number | string) {
  return typeof value === 'number' ? value.toLocaleString('vi-VN') : value;
}

function activityIcon(action: string) {
  if (action.includes('created')) return UserPlus;
  if (action.includes('completed') || action.includes('approved')) return CheckCircle2;
  if (action.includes('exp') || action.includes('reward')) return Zap;
  return Clock;
}

function TamTruChart({ data }: { data: SpicesDashboard }) {
  const rows = [
    { label: 'Dao duc', value: data.tamTru.daoDuc, color: 'bg-emerald-500' },
    { label: 'Phuong phap', value: data.tamTru.phuongPhap, color: 'bg-blue-500' },
    { label: 'Giao duc', value: data.tamTru.giaoDuc, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {rows.map((row) => {
          const pct =
            data.totalSessions > 0 ? Math.round((row.value / data.totalSessions) * 100) : 0;
          return (
            <div key={row.label} className="rounded-lg border border-[hsl(var(--border))] p-3">
              <div
                className={`mb-2 h-2 rounded-full ${row.color}`}
                style={{ width: `${Math.max(pct, 8)}%` }}
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{row.label}</p>
              <p className="text-lg font-semibold text-[hsl(var(--foreground))]">{pct}%</p>
            </div>
          );
        })}
      </div>
      <div className="rounded-lg bg-[hsl(var(--muted)_/_0.45)] p-4">
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Balance score</p>
        <p className="mt-1 text-3xl font-bold text-[hsl(var(--foreground))]">
          {data.balanceScore}%
        </p>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          Based on {data.totalSessions.toLocaleString('vi-VN')} tagged sessions.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [orgDashboard, setOrgDashboard] = useState<OrgDashboard | null>(null);
  const [spicesDashboard, setSpicesDashboard] = useState<SpicesDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [org, spices] = await Promise.all([
        api.get<OrgDashboard>('/dashboards/org'),
        api.get<SpicesDashboard>('/dashboards/spices'),
      ]);
      setOrgDashboard(org);
      setSpicesDashboard(spices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong the tai dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const widgets = orgDashboard?.widgets ?? [];
  const activities = useMemo(() => orgDashboard?.recentActivity ?? [], [orgDashboard]);

  if (loading) return <PageLoading message="Dang tai dashboard tu API..." />;
  if (error) return <PageError message={error} onRetry={loadDashboard} />;
  if (!orgDashboard || widgets.length === 0) {
    return (
      <PageEmpty
        title="Chua co du lieu dashboard"
        description="Hay seed pilot data hoac tao workflow dau tien."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Tong quan</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Du lieu tong hop truc tiep tu backend.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.map((stat, index) => {
          const Icon = WIDGET_ICONS[index % WIDGET_ICONS.length];
          const color = WIDGET_COLORS[index % WIDGET_COLORS.length];
          const isDown = stat.trend === 'down';
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${color} text-white`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {stat.change !== undefined && (
                    <span
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        isDown ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {isDown ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      {stat.change}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {formatValue(stat.value)}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="p-6 pb-3">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              Hoat dong gan day
            </h2>
          </div>
          <CardContent className="space-y-1">
            {activities.length === 0 ? (
              <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Chua co audit activity.
              </p>
            ) : (
              activities.map((activity) => {
                const Icon = activityIcon(activity.action);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-[hsl(var(--muted)_/_0.5)] transition-colors"
                  >
                    <div className="mt-0.5 text-[hsl(var(--primary))]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[hsl(var(--foreground))]">
                        {activity.action} / {activity.resource}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {new Date(activity.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="p-6 pb-3">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              Tam Tru Coverage
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Dao duc, phuong phap va giao duc tinh tu sessions backend.
            </p>
          </div>
          <CardContent>
            {spicesDashboard ? (
              <TamTruChart data={spicesDashboard} />
            ) : (
              <PageEmpty title="Chua co coverage" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
