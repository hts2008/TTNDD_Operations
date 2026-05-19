'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { PageError, PageLoading } from '@/components/ui/page-states';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Calendar, Clock, List, Plus, RefreshCw, Users } from 'lucide-react';

interface Session {
  id: string;
  sessionDate: string;
  title: string;
  status: string;
  branch?: { name?: string; code?: string };
  _count?: { attendance?: number };
  [key: string]: unknown;
}

interface Branch {
  id: string;
  name: string;
  code?: string;
}

const STATUS_MAP: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' }
> = {
  planned: { label: 'Ke hoach', variant: 'default' },
  published: { label: 'Da dang', variant: 'secondary' },
  in_progress: { label: 'Dang dien ra', variant: 'warning' },
  completed: { label: 'Hoan thanh', variant: 'success' },
};

function CalendarView({ sessions }: { sessions: Session[] }) {
  const current = new Date();
  const month = current.getMonth();
  const year = current.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const sessionDates = new Set(
    sessions
      .filter((s) => {
        const d = new Date(s.sessionDate);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .map((s) => new Date(s.sessionDate).getDate()),
  );

  const cells: Array<number | null> = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card className="p-4">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
          {current.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
        </h3>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div
            key={d}
            className="p-2 text-center text-xs font-medium text-[hsl(var(--muted-foreground))]"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={cn(
              'flex h-10 items-center justify-center rounded-lg text-sm',
              day === null && 'invisible',
              day && sessionDates.has(day)
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-bold'
                : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]',
            )}
          >
            {day}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function SessionsPage() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  async function loadSessions() {
    setLoading(true);
    setError(null);
    try {
      const [sessionEnvelope, branchList] = await Promise.all([
        api.getEnvelope<Session[]>('/sessions', { limit: 50 }),
        user?.orgId
          ? api.get<Branch[]>(`/organizations/${user.orgId}/branches`)
          : Promise.resolve([]),
      ]);
      setSessions(sessionEnvelope.data);
      setBranches(branchList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong the tai sessions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, [user?.orgId]);

  async function createSession() {
    const branchId = branches[0]?.id ?? window.prompt('Branch ID');
    if (!branchId) return;
    const title = window.prompt('Ten buoi sinh hoat');
    if (!title) return;
    const sessionDate = window.prompt(
      'Ngay sinh hoat (YYYY-MM-DD)',
      new Date().toISOString().slice(0, 10),
    );
    if (!sessionDate) return;

    await api.post('/sessions', { branchId, title, sessionDate, sessionType: 'weekly' });
    await loadSessions();
  }

  async function markSelfPresent(sessionId: string) {
    if (!user?.memberId) return;
    await api.post(`/sessions/${sessionId}/attendance`, {
      records: [{ memberId: user.memberId, status: 'present' }],
    });
    await loadSessions();
  }

  const columns = useMemo(
    () => [
      {
        key: 'sessionDate',
        label: 'Ngay',
        render: (s: Session) => (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <span>{new Date(s.sessionDate).toLocaleDateString('vi-VN')}</span>
          </div>
        ),
      },
      {
        key: 'title',
        label: 'Ten buoi sinh hoat',
        render: (s: Session) => <span className="font-medium">{s.title}</span>,
      },
      {
        key: 'branch',
        label: 'Nganh',
        render: (s: Session) => s.branch?.name ?? s.branch?.code ?? '-',
      },
      {
        key: 'status',
        label: 'Trang thai',
        render: (s: Session) => {
          const st = STATUS_MAP[s.status];
          return st ? <Badge variant={st.variant}>{st.label}</Badge> : s.status;
        },
      },
      {
        key: 'attendance',
        label: 'Diem danh',
        render: (s: Session) => (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            <span className="font-mono text-sm">{s._count?.attendance ?? 0}</span>
          </div>
        ),
      },
      {
        key: 'actions',
        label: '',
        render: (s: Session) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void markSelfPresent(s.id)}
            disabled={!user?.memberId}
          >
            Present
          </Button>
        ),
      },
    ],
    [user?.memberId],
  );

  if (loading) return <PageLoading message="Dang tai sessions..." />;
  if (error) return <PageError message={error} onRetry={loadSessions} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[hsl(var(--foreground))]">
            <Calendar className="h-6 w-6 text-[hsl(var(--primary))]" />
            Sinh hoat
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Quan ly sessions bang API that.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <div className="flex rounded-lg border border-[hsl(var(--border))] p-0.5">
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === 'list'
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                  : 'text-[hsl(var(--muted-foreground))]',
              )}
            >
              <List className="h-4 w-4" />
              Danh sach
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === 'calendar'
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                  : 'text-[hsl(var(--muted-foreground))]',
              )}
            >
              <Calendar className="h-4 w-4" />
              Lich
            </button>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void loadSessions()}>
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
          <Button className="gap-2" onClick={() => void createSession()}>
            <Plus className="h-4 w-4" />
            Tao
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <DataTable columns={columns} data={sessions} className="bg-[hsl(var(--card))]" />
      ) : (
        <CalendarView sessions={sessions} />
      )}
    </div>
  );
}
