'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { Ticket, Plus, Search, AlertTriangle, Clock, Filter, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import Link from 'next/link';

/* ── Types ── */
type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

interface TicketItem {
  id: string;
  ticketNumber: string;
  title: string;
  category: string | null;
  priority: string;
  status: string;
  isSensitive: boolean;
  dueDate: string | null;
  createdAt: string;
  _count?: { comments: number };
}

interface TicketListResponse {
  data: TicketItem[];
  meta: { total: number; page: number; limit: number };
}

interface SlaBreachResponse {
  breached: { ticketId: string; ticketNumber: string; type: string; hoursOverdue: number }[];
  atRisk: { ticketId: string; ticketNumber: string; type: string; hoursRemaining: number }[];
}

interface CategoryItem {
  id: string;
  label: string;
  group: string;
}

/* ── Config ── */
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
  assigned: { label: 'Đã giao', variant: 'outline' },
  in_progress: { label: 'Đang xử lý', variant: 'warning' },
  resolved: { label: 'Đã giải quyết', variant: 'success' },
  closed: { label: 'Đã đóng', variant: 'secondary' },
};

/* ── Demo data for offline/fallback ── */
const DEMO_TICKETS: TicketItem[] = [
  {
    id: '1',
    ticketNumber: 'TK-00001',
    title: 'Không thể đăng nhập hệ thống',
    category: 'Tài khoản',
    priority: 'critical',
    status: 'in_progress',
    isSensitive: false,
    dueDate: null,
    createdAt: '2026-03-04T00:00:00Z',
    _count: { comments: 3 },
  },
  {
    id: '2',
    ticketNumber: 'TK-00002',
    title: 'Yêu cầu cấp lại mật khẩu cho Đoàn sinh',
    category: 'Tài khoản',
    priority: 'medium',
    status: 'open',
    isSensitive: false,
    dueDate: '2026-03-15T00:00:00Z',
    createdAt: '2026-03-03T00:00:00Z',
    _count: { comments: 0 },
  },
  {
    id: '3',
    ticketNumber: 'TK-00003',
    title: 'Lỗi hiển thị bảng điểm danh',
    category: 'Kỹ thuật',
    priority: 'high',
    status: 'in_progress',
    isSensitive: false,
    dueDate: null,
    createdAt: '2026-03-01T00:00:00Z',
    _count: { comments: 5 },
  },
  {
    id: '4',
    ticketNumber: 'TK-00004',
    title: 'Đề xuất thêm tính năng xuất PDF báo cáo',
    category: 'Tính năng',
    priority: 'low',
    status: 'resolved',
    isSensitive: false,
    dueDate: null,
    createdAt: '2026-02-28T00:00:00Z',
    _count: { comments: 1 },
  },
  {
    id: '5',
    ticketNumber: 'TK-00005',
    title: 'Mượn trang phục cho trại hè',
    category: 'Tài sản',
    priority: 'medium',
    status: 'closed',
    isSensitive: false,
    dueDate: null,
    createdAt: '2026-02-25T00:00:00Z',
    _count: { comments: 2 },
  },
  {
    id: '6',
    ticketNumber: 'TK-00006',
    title: 'Sự cố an toàn trong hoạt động ngoại khóa',
    category: 'Sự cố',
    priority: 'critical',
    status: 'open',
    isSensitive: true,
    dueDate: '2026-03-10T00:00:00Z',
    createdAt: '2026-03-05T00:00:00Z',
    _count: { comments: 0 },
  },
];

/* ── Create Ticket Dialog ── */
function CreateTicketForm({
  categories,
  onCreated,
  onClose,
}: {
  categories: CategoryItem[];
  onCreated: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await api.post('/api/tickets', {
        title,
        description,
        category: category || undefined,
        priority,
      });
      onCreated();
      onClose();
    } catch {
      // Fallback — just close
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="text-lg">Tạo yêu cầu mới</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Tiêu đề *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mô tả ngắn gọn vấn đề..."
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Mô tả chi tiết</label>
            <textarea
              className="w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chi tiết vấn đề, bước tái tạo lỗi..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Danh mục</label>
              <select
                className="w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">-- Chọn --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Độ ưu tiên</label>
              <select
                className="w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="critical">Khẩn cấp</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={!title.trim() || loading}>
              {loading ? 'Đang tạo...' : 'Tạo yêu cầu'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Main Page ── */
export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [slaBreaches, setSlaBreaches] = useState<SlaBreachResponse>({ breached: [], atRisk: [] });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'sla'>('list');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await api.get<TicketListResponse>('/api/tickets', params);
      setTickets(res.data);
    } catch {
      setTickets(DEMO_TICKETS);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get<CategoryItem[]>('/api/tickets/categories');
      setCategories(res);
    } catch {
      setCategories([
        { id: 'account', label: 'Tài khoản', group: 'general' },
        { id: 'technical', label: 'Kỹ thuật', group: 'general' },
        { id: 'feature', label: 'Tính năng', group: 'general' },
        { id: 'asset', label: 'Tài sản', group: 'general' },
        { id: 'hr_leave', label: 'Xin nghỉ', group: 'hr' },
        { id: 'hr_transfer', label: 'Chuyển đơn vị', group: 'hr' },
        { id: 'incident', label: 'Sự cố', group: 'general' },
      ]);
    }
  }, []);

  const loadSla = useCallback(async () => {
    try {
      const res = await api.get<SlaBreachResponse>('/api/tickets/sla-breaches');
      setSlaBreaches(res);
    } catch {
      setSlaBreaches({ breached: [], atRisk: [] });
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);
  useEffect(() => {
    loadCategories();
    loadSla();
  }, [loadCategories, loadSla]);

  const breachedSet = new Set(slaBreaches.breached.map((b) => b.ticketId));
  const atRiskSet = new Set(slaBreaches.atRisk.map((b) => b.ticketId));

  const filtered = tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()),
  );

  const columns = [
    {
      key: 'ticketNumber',
      label: 'Mã',
      render: (item: TicketItem) => (
        <Link
          href={`/tickets/${item.id}`}
          className="font-mono text-sm font-medium text-blue-600 hover:underline"
        >
          {item.ticketNumber}
        </Link>
      ),
    },
    {
      key: 'title',
      label: 'Tiêu đề',
      render: (item: TicketItem) => (
        <div className="flex items-center gap-2">
          <Link href={`/tickets/${item.id}`} className="font-medium hover:underline">
            {item.title}
          </Link>
          {item.isSensitive && (
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
              Nhạy cảm
            </Badge>
          )}
          {breachedSet.has(item.id) && (
            <span title="SLA vi phạm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </span>
          )}
          {atRiskSet.has(item.id) && !breachedSet.has(item.id) && (
            <span title="SLA sắp hết hạn">
              <Clock className="h-4 w-4 text-amber-500" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Danh mục',
      render: (item: TicketItem) => <span>{item.category || '—'}</span>,
    },
    {
      key: 'priority',
      label: 'Ưu tiên',
      render: (item: TicketItem) => {
        const cfg = PRIORITY_CONFIG[item.priority as TicketPriority] || PRIORITY_CONFIG.medium;
        return <Badge className={cn('border', cfg.className)}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (item: TicketItem) => {
        const cfg = STATUS_CONFIG[item.status as TicketStatus] || STATUS_CONFIG.open;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'comments',
      label: '💬',
      render: (item: TicketItem) => (
        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          {item._count?.comments ?? 0}
        </span>
      ),
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

  const tabs = [
    { id: 'list' as const, label: 'Danh sách', icon: Ticket },
    {
      id: 'sla' as const,
      label: `SLA (${slaBreaches.breached.length + slaBreaches.atRisk.length})`,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Ticket className="h-8 w-8 text-orange-500" />
          Yêu cầu hỗ trợ
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadTickets();
              loadSla();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Làm mới
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tạo yêu cầu
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Tổng', value: tickets.length, color: 'text-blue-600' },
          {
            label: 'Mở',
            value: tickets.filter((t) => t.status === 'open').length,
            color: 'text-green-600',
          },
          {
            label: 'Đang xử lý',
            value: tickets.filter((t) => ['assigned', 'in_progress'].includes(t.status)).length,
            color: 'text-amber-600',
          },
          { label: 'SLA vi phạm', value: slaBreaches.breached.length, color: 'text-red-600' },
          { label: 'SLA sắp hết', value: slaBreaches.atRisk.length, color: 'text-orange-600' },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[hsl(var(--border))]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Tab */}
      {activeTab === 'list' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" /> Bộ lọc
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
            <div className="flex gap-2 flex-wrap mt-2">
              <select
                className="rounded-md border border-[hsl(var(--border))] bg-transparent px-3 py-1.5 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-[hsl(var(--border))] bg-transparent px-3 py-1.5 text-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-[hsl(var(--border))] bg-transparent px-3 py-1.5 text-sm"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">Tất cả ưu tiên</option>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-[hsl(var(--muted-foreground))]">
                Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-[hsl(var(--muted-foreground))]">
                Không có yêu cầu nào
              </div>
            ) : (
              <DataTable columns={columns} data={filtered} />
            )}
          </CardContent>
        </Card>
      )}

      {/* SLA Tab */}
      {activeTab === 'sla' && (
        <div className="space-y-4">
          {slaBreaches.breached.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-lg text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> SLA vi phạm ({slaBreaches.breached.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {slaBreaches.breached.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                    >
                      <div>
                        <span className="font-mono text-sm font-medium">{b.ticketNumber}</span>
                        <span className="ml-2 text-sm text-red-700">
                          Loại: {b.type === 'response' ? 'Phản hồi' : 'Giải quyết'}
                        </span>
                      </div>
                      <Badge className="bg-red-100 text-red-700">Quá hạn {b.hoursOverdue}h</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {slaBreaches.atRisk.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="text-lg text-amber-600 flex items-center gap-2">
                  <Clock className="h-5 w-5" /> SLA sắp hết hạn ({slaBreaches.atRisk.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {slaBreaches.atRisk.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                    >
                      <div>
                        <span className="font-mono text-sm font-medium">{b.ticketNumber}</span>
                        <span className="ml-2 text-sm text-amber-700">
                          Loại: {b.type === 'response' ? 'Phản hồi' : 'Giải quyết'}
                        </span>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700">Còn {b.hoursRemaining}h</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {slaBreaches.breached.length === 0 && slaBreaches.atRisk.length === 0 && (
            <Card className="border-green-200">
              <CardContent className="py-10 text-center">
                <div className="text-green-600 text-lg font-medium">
                  ✅ Tất cả SLA đều trong tầm kiểm soát
                </div>
                <div className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                  Không có yêu cầu nào vi phạm hoặc sắp hết hạn SLA
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <CreateTicketForm
          categories={categories}
          onCreated={loadTickets}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
