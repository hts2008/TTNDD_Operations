'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { Ticket, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface TicketItem {
  id: string;
  number: string;
  title: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
}

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; className: string }> = {
  critical: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'Cao', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Trung bình', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Thấp', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'outline' }> = {
  open: { label: 'Mới mở', variant: 'default' },
  in_progress: { label: 'Đang xử lý', variant: 'warning' },
  resolved: { label: 'Đã giải quyết', variant: 'success' },
  closed: { label: 'Đã đóng', variant: 'secondary' },
};

const TICKETS: TicketItem[] = [
  { id: '1', number: 'TK-001', title: 'Không thể đăng nhập hệ thống', category: 'Tài khoản', priority: 'critical', status: 'in_progress', createdAt: '2026-03-04' },
  { id: '2', number: 'TK-002', title: 'Yêu cầu cấp lại mật khẩu cho Đoàn sinh', category: 'Tài khoản', priority: 'medium', status: 'open', createdAt: '2026-03-03' },
  { id: '3', number: 'TK-003', title: 'Lỗi hiển thị bảng điểm danh', category: 'Kỹ thuật', priority: 'high', status: 'in_progress', createdAt: '2026-03-01' },
  { id: '4', number: 'TK-004', title: 'Đề xuất thêm tính năng xuất PDF báo cáo', category: 'Tính năng', priority: 'low', status: 'resolved', createdAt: '2026-02-28' },
  { id: '5', number: 'TK-005', title: 'Mượn trang phục cho trại hè', category: 'Tài sản', priority: 'medium', status: 'closed', createdAt: '2026-02-25' },
];

const columns = [
  {
    key: 'number',
    label: 'Mã yêu cầu',
    render: (item: TicketItem) => (
      <span className="font-mono text-sm font-medium">{item.number}</span>
    ),
  },
  {
    key: 'title',
    label: 'Tiêu đề',
    render: (item: TicketItem) => (
      <span className="font-medium">{item.title}</span>
    ),
  },
  {
    key: 'category',
    label: 'Danh mục',
  },
  {
    key: 'priority',
    label: 'Độ ưu tiên',
    render: (item: TicketItem) => {
      const cfg = PRIORITY_CONFIG[item.priority];
      return <Badge className={cn('border', cfg.className)}>{cfg.label}</Badge>;
    },
  },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (item: TicketItem) => {
      const cfg = STATUS_CONFIG[item.status];
      return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
    },
  },
  {
    key: 'createdAt',
    label: 'Ngày tạo',
    render: (item: TicketItem) => (
      <span className="text-sm text-[hsl(var(--muted-foreground))]">
        {new Date(item.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </span>
    ),
  },
];

export default function TicketsPage() {
  const [search, setSearch] = useState('');

  const filtered = TICKETS.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.number.toLowerCase().includes(search.toLowerCase()),
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Danh sách yêu cầu</CardTitle>
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
          <DataTable columns={columns} data={filtered} />
        </CardContent>
      </Card>
    </div>
  );
}
