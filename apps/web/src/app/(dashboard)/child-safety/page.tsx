'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { ShieldAlert, AlertTriangle, Clock, ArrowUpCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type IncidentPriority = 'critical' | 'high' | 'medium';
type IncidentStatus = 'open' | 'investigating' | 'escalated' | 'resolved';

interface Incident {
  id: string;
  ticketNumber: string;
  category: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  escalationLevel: number;
  reportedAt: string;
}

const PRIORITY_CONFIG: Record<IncidentPriority, { label: string; className: string }> = {
  critical: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'Cao', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Trung bình', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
};

const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  open: { label: 'Mới mở', className: 'bg-red-100 text-red-700 border-red-200' },
  investigating: { label: 'Đang điều tra', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  escalated: { label: 'Đã báo cáo cấp trên', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  resolved: { label: 'Đã giải quyết', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const STATS = {
  openIncidents: 2,
  avgResolutionTime: '3.5 ngày',
  escalatedCount: 1,
};

const INCIDENTS: Incident[] = [
  { id: '1', ticketNumber: 'CS-001', category: 'An toàn thể chất', priority: 'high', status: 'investigating', escalationLevel: 1, reportedAt: '2026-03-03' },
  { id: '2', ticketNumber: 'CS-002', category: 'Bắt nạt', priority: 'critical', status: 'escalated', escalationLevel: 2, reportedAt: '2026-03-01' },
  { id: '3', ticketNumber: 'CS-003', category: 'An toàn môi trường', priority: 'medium', status: 'resolved', escalationLevel: 0, reportedAt: '2026-02-25' },
];

const columns = [
  {
    key: 'ticketNumber',
    label: 'Mã sự cố',
    render: (item: Incident) => <span className="font-mono font-medium">{item.ticketNumber}</span>,
  },
  { key: 'category', label: 'Phân loại' },
  {
    key: 'priority',
    label: 'Độ ưu tiên',
    render: (item: Incident) => {
      const cfg = PRIORITY_CONFIG[item.priority];
      return <Badge className={cn('border', cfg.className)}>{cfg.label}</Badge>;
    },
  },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (item: Incident) => {
      const cfg = STATUS_CONFIG[item.status];
      return <Badge className={cn('border', cfg.className)}>{cfg.label}</Badge>;
    },
  },
  {
    key: 'escalationLevel',
    label: 'Cấp báo cáo',
    render: (item: Incident) => (
      <span className={cn('font-medium', item.escalationLevel >= 2 ? 'text-red-600' : '')}>
        {item.escalationLevel > 0 ? `Cấp ${item.escalationLevel}` : '—'}
      </span>
    ),
  },
  {
    key: 'reportedAt',
    label: 'Ngày báo cáo',
    render: (item: Incident) => (
      <span className="text-sm">{new Date(item.reportedAt).toLocaleDateString('vi-VN')}</span>
    ),
  },
];

export default function ChildSafetyPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <ShieldAlert className="h-8 w-8 text-red-500" />
        An toàn trẻ em
      </h1>

      <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
        <p className="text-sm text-red-700 font-medium">
          Khu vực hạn chế — Chỉ dành cho nhân viên được chỉ định. Mọi truy cập đều được ghi nhận.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Sự cố đang mở</p>
                <p className="text-3xl font-bold text-red-600">{STATS.openIncidents}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Thời gian xử lý TB</p>
                <p className="text-3xl font-bold">{STATS.avgResolutionTime}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Đã báo cáo cấp trên</p>
                <p className="text-3xl font-bold text-amber-600">{STATS.escalatedCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <ArrowUpCircle className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Danh sách sự cố</CardTitle>
            <Button variant="destructive" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Báo cáo sự cố
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={INCIDENTS} />
        </CardContent>
      </Card>
    </div>
  );
}
