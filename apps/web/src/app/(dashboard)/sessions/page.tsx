'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { Calendar, List, Plus, Users, Clock } from 'lucide-react';

interface Session {
  id: string;
  date: string;
  title: string;
  branch: string;
  status: string;
  attendance: number;
  total: number;
  [key: string]: unknown;
}

const MOCK_SESSIONS: Session[] = [
  { id: '1', date: '2025-03-08', title: 'Kỹ năng cắm trại nâng cao', branch: 'Ngành Thiếu', status: 'planned', attendance: 0, total: 45 },
  { id: '2', date: '2025-03-01', title: 'Sinh hoạt đầu tháng 3', branch: 'Toàn đoàn', status: 'published', attendance: 0, total: 120 },
  { id: '3', date: '2025-02-22', title: 'Trò chơi lớn: Tìm kho báu', branch: 'Ngành Thiếu', status: 'completed', attendance: 38, total: 45 },
  { id: '4', date: '2025-02-15', title: 'Học kỳ quân đội mini', branch: 'Ngành Thanh', status: 'completed', attendance: 22, total: 25 },
  { id: '5', date: '2025-02-08', title: 'Lễ khai đoàn Xuân Ất Tỵ', branch: 'Toàn đoàn', status: 'completed', attendance: 105, total: 120 },
];

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' }> = {
  planned: { label: 'Kế hoạch', variant: 'default' },
  published: { label: 'Đã đăng', variant: 'secondary' },
  in_progress: { label: 'Đang diễn ra', variant: 'warning' },
  completed: { label: 'Hoàn thành', variant: 'success' },
};

function CalendarView() {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const sessionDates = new Set(MOCK_SESSIONS.map((s) => new Date(s.date).getDate()));

  const cells = [];
  const startDay = 6; // March 2025 starts on Saturday
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= 31; d++) cells.push(d);

  return (
    <Card className="p-4">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Tháng 3, 2025</h3>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div key={d} className="p-2 text-center text-xs font-medium text-[hsl(var(--muted-foreground))]">
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
      <div className="mt-4 space-y-2">
        {MOCK_SESSIONS.filter((s) => s.date.startsWith('2025-03')).map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary)_/_0.1)] text-[hsl(var(--primary))]">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">{s.title}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {new Date(s.date).toLocaleDateString('vi-VN')} · {s.branch}
              </p>
            </div>
            <Badge variant={STATUS_MAP[s.status]?.variant}>{STATUS_MAP[s.status]?.label}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function SessionsPage() {
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const columns = [
    {
      key: 'date',
      label: 'Ngày',
      render: (s: Session) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <span>{new Date(s.date).toLocaleDateString('vi-VN')}</span>
        </div>
      ),
    },
    { key: 'title', label: 'Tên buổi sinh hoạt', render: (s: Session) => <span className="font-medium">{s.title}</span> },
    { key: 'branch', label: 'Ngành' },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (s: Session) => {
        const st = STATUS_MAP[s.status];
        return st ? <Badge variant={st.variant}>{st.label}</Badge> : s.status;
      },
    },
    {
      key: 'attendance',
      label: 'Điểm danh',
      render: (s: Session) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
          <span className="font-mono text-sm">
            {s.attendance}/{s.total}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Calendar className="h-6 w-6 text-[hsl(var(--primary))]" />
            Sinh hoạt
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Quản lý các buổi sinh hoạt</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <div className="flex rounded-lg border border-[hsl(var(--border))] p-0.5">
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === 'list' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))]',
              )}
            >
              <List className="h-4 w-4" />
              Danh sách
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === 'calendar' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))]',
              )}
            >
              <Calendar className="h-4 w-4" />
              Lịch
            </button>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo sinh hoạt
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <DataTable columns={columns} data={MOCK_SESSIONS} className="bg-[hsl(var(--card))]" />
      ) : (
        <CalendarView />
      )}
    </div>
  );
}
