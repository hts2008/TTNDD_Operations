'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { Ticket, Plus, Search, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

interface TicketItem {
  id: string;
  ticketNumber: string;
  title: string;
  category: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  isSensitive: boolean;
  dueDate: string | null;
  createdAt: string;
  _count?: { comments: number };
}

interface SlaDashboard {
  openCount: number;
  overdueCount: number;
  resolvedCount: number;
  avgResolutionHours: number;
  slaCompliancePercent: number;
}

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; className: string }> = {
  critical: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'Cao', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Trung bình', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Thấp', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'outline' }
> = {
  open: { label: 'Mới mở', variant: 'default' },
  assigned: { label: 'Đã giao', variant: 'warning' },
  in_progress: { label: 'Đang xử lý', variant: 'warning' },
  resolved: { label: 'Đã giải quyết', variant: 'success' },
  closed: { label: 'Đã đóng', variant: 'secondary' },
};

const columns = [
  {
    key: 'ticketNumber',
    label: 'Mã yêu cầu',
    render: (item: TicketItem) => (
      <span className="font-mono text-sm font-medium">{item.ticketNumber}</span>
    ),
  },
  {
    key: 'title',
    label: 'Tiêu đề',
    render: (item: TicketItem) => (
      <span className="font-medium">
        {item.isSensitive && (
          <span title="Nhạy cảm" className="mr-1">
            🔒
          </span>
        )}
        {item.title}
      </span>
    ),
  },
  { key: 'category', label: 'Danh mục' },
  {
    key: 'priority',
    label: 'Độ ưu tiên',
    render: (item: TicketItem) => {
      const cfg = PRIORITY_CONFIG[item.priority];
      return <Badge className={cn('border', cfg?.className)}>{cfg?.label ?? item.priority}</Badge>;
    },
  },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (item: TicketItem) => {
      const cfg = STATUS_CONFIG[item.status];
      return <Badge variant={cfg?.variant ?? 'outline'}>{cfg?.label ?? item.status}</Badge>;
    },
  },
  {
    key: 'dueDate',
    label: 'Hạn xử lý',
    render: (item: TicketItem) => {
      if (!item.dueDate)
        return <span className="text-sm text-[hsl(var(--muted-foreground))]">—</span>;
      const isOverdue =
        new Date(item.dueDate) < new Date() && !['resolved', 'closed'].includes(item.status);
      return (
        <span
          className={cn(
            'text-sm',
            isOverdue ? 'text-red-500 font-medium' : 'text-[hsl(var(--muted-foreground))]',
          )}
        >
          {isOverdue && <AlertTriangle className="inline h-3 w-3 mr-1" />}
          {new Date(item.dueDate).toLocaleDateString('vi-VN')}
        </span>
      );
    },
  },
  {
    key: 'createdAt',
    label: 'Ngày tạo',
    render: (item: TicketItem) => (
      <span className="text-sm text-[hsl(var(--muted-foreground))]">
        {new Date(item.createdAt).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}
      </span>
    ),
  },
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [sla, setSla] = useState<SlaDashboard | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const [ticketsRes, slaRes] = await Promise.all([
        fetch(`${API}/tickets?${params}`, { credentials: 'include' }),
        fetch(`${API}/tickets/sla-dashboard`, { credentials: 'include' }),
      ]);

      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data.data || []);
      }
      if (slaRes.ok) {
        setSla(await slaRes.json());
      }
      setError(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()),
  );

  if (error)
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <Ticket className="h-8 w-8 text-orange-500" />
          Yêu cầu hỗ trợ
        </h1>
        <div className="p-4 bg-red-950 rounded-lg text-red-200">⚠️ {error}</div>
      </div>
    );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Ticket className="h-8 w-8 text-orange-500" />
          Yêu cầu hỗ trợ
        </h1>
        <Button>
          <Plus className="h-4 w-4 mr-1" /> Tạo yêu cầu
        </Button>
      </div>

      {/* SLA Dashboard Cards */}
      {sla && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{sla.openCount}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Đang mở</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className={cn('text-2xl font-bold', sla.overdueCount > 0 ? 'text-red-500' : '')}>
                {sla.overdueCount}
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Quá hạn</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-500">{sla.resolvedCount}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Đã xử lý</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{sla.avgResolutionHours}h</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">TB xử lý</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div
                className={cn(
                  'text-2xl font-bold',
                  sla.slaCompliancePercent >= 90 ? 'text-green-500' : 'text-yellow-500',
                )}
              >
                {sla.slaCompliancePercent}%
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">SLA</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'open', 'assigned', 'in_progress', 'resolved', 'closed'].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {STATUS_CONFIG[s as TicketStatus]?.label ?? 'Tất cả'}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {loading ? 'Đang tải...' : `Danh sách yêu cầu (${filtered.length})`}
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Tìm kiếm yêu cầu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
              <p className="text-4xl mb-2">📭</p>
              <p>Chưa có yêu cầu nào.</p>
            </div>
          ) : (
            <DataTable columns={columns} data={filtered} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
