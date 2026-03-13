'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  ArrowUpCircle,
  Plus,
  RefreshCw,
  FileText,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

/* ── Types ── */
type IncidentPriority = 'critical' | 'high' | 'medium' | 'low';
type IncidentStatus = 'open' | 'investigating' | 'escalated' | 'resolved' | 'closed';

interface Incident {
  id: string;
  ticketNumber: string;
  title: string;
  description?: string;
  category: string | null;
  priority: string;
  status: string;
  isSensitive: boolean;
  isAnonymous?: boolean;
  customFields?: {
    escalationLevel?: number;
    evidenceUrls?: string[];
    reportedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface IncidentsResponse {
  data: Incident[];
  meta: { total: number; page: number; limit: number };
}

interface RetentionStatus {
  retentionDays: number;
  totalSensitiveTickets: number;
  pendingRedaction: number;
  alreadyRedacted: number;
  lastCheckedAt: string;
}

/* ── Config ── */
const PRIORITY_CONFIG: Record<IncidentPriority, { label: string; className: string }> = {
  critical: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'Cao', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Trung bình', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Thấp', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  open: { label: 'Mới mở', className: 'bg-red-100 text-red-700 border-red-200' },
  investigating: { label: 'Đang điều tra', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  escalated: {
    label: 'Đã báo cáo cấp trên',
    className: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  resolved: {
    label: 'Đã giải quyết',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  closed: { label: 'Đã đóng', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const DEMO_INCIDENTS: Incident[] = [
  {
    id: '1',
    ticketNumber: 'INC-00001',
    title: 'Sự cố an toàn thể chất trong hoạt động ngoại khóa',
    category: 'child_safety_incident',
    priority: 'high',
    status: 'investigating',
    isSensitive: true,
    customFields: { escalationLevel: 1, evidenceUrls: [] },
    createdAt: '2026-03-03T00:00:00Z',
    updatedAt: '2026-03-03T00:00:00Z',
  },
  {
    id: '2',
    ticketNumber: 'INC-00002',
    title: 'Báo cáo bắt nạt trong đơn vị',
    category: 'child_safety_incident',
    priority: 'critical',
    status: 'escalated',
    isSensitive: true,
    customFields: { escalationLevel: 2, evidenceUrls: [] },
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: '3',
    ticketNumber: 'INC-00003',
    title: 'Sự cố an toàn môi trường trại hè',
    category: 'child_safety_incident',
    priority: 'medium',
    status: 'resolved',
    isSensitive: true,
    customFields: { escalationLevel: 0, evidenceUrls: [] },
    createdAt: '2026-02-25T00:00:00Z',
    updatedAt: '2026-02-25T00:00:00Z',
  },
];

/* ── Report Incident Dialog ── */
function ReportIncidentForm({
  onCreated,
  onClose,
}: {
  onCreated: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('child_safety_incident');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await api.post('/api/child-safety/incidents', {
        title,
        description,
        category,
        isAnonymous,
      });
      onCreated();
      onClose();
    } catch {
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
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Báo cáo sự cố an toàn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Tiêu đề sự cố *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mô tả ngắn gọn sự cố..."
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Mô tả chi tiết</label>
            <textarea
              className="w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nơi xảy ra, thời gian, ai liên quan, mức độ ảnh hưởng..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Phân loại</label>
              <select
                className="w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="child_safety_incident">An toàn thể chất</option>
                <option value="bullying">Bắt nạt</option>
                <option value="environment">An toàn môi trường</option>
                <option value="misconduct">Hành vi không phù hợp</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded"
                />
                Báo cáo ẩn danh
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!title.trim() || loading}
            >
              {loading ? 'Đang gửi...' : '🚨 Báo cáo sự cố'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Main Page ── */
export default function ChildSafetyPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [retention, setRetention] = useState<RetentionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  /* ── Data loading ── */
  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<IncidentsResponse>('/api/child-safety/incidents');
      setIncidents(res.data);
    } catch {
      setIncidents(DEMO_INCIDENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRetention = useCallback(async () => {
    try {
      const res = await api.get<RetentionStatus>('/api/child-safety/retention-status');
      setRetention(res);
    } catch {
      /* ignore — not critical */
    }
  }, []);

  useEffect(() => {
    loadIncidents();
    loadRetention();
  }, [loadIncidents, loadRetention]);

  /* ── T-1053: Escalation action ── */
  const handleEscalate = async (incidentId: string) => {
    setEscalatingId(incidentId);
    try {
      await api.post(`/api/child-safety/incidents/${incidentId}/escalate`, {});
      await loadIncidents();
    } catch {
      /* fallback — silently fail */
    } finally {
      setEscalatingId(null);
    }
  };

  /* ── Stats ── */
  const openCount = incidents.filter(
    (i) => i.status === 'open' || i.status === 'investigating',
  ).length;
  const escalatedCount = incidents.filter((i) => i.status === 'escalated').length;
  const resolvedCount = incidents.filter(
    (i) => i.status === 'resolved' || i.status === 'closed',
  ).length;

  /* ── Table columns ── */
  const columns = [
    {
      key: 'ticketNumber',
      label: 'Mã sự cố',
      render: (item: Incident) => (
        <span className="font-mono font-medium">{item.ticketNumber}</span>
      ),
    },
    {
      key: 'title',
      label: 'Tiêu đề',
      render: (item: Incident) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.title}</span>
          {item.isAnonymous && (
            <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">Ẩn danh</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Độ ưu tiên',
      render: (item: Incident) => {
        const cfg = PRIORITY_CONFIG[item.priority as IncidentPriority] || PRIORITY_CONFIG.medium;
        return <Badge className={cn('border', cfg.className)}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (item: Incident) => {
        const cfg = STATUS_CONFIG[item.status as IncidentStatus] || STATUS_CONFIG.open;
        return <Badge className={cn('border', cfg.className)}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'escalationLevel',
      label: 'Cấp báo cáo',
      render: (item: Incident) => {
        const level = item.customFields?.escalationLevel ?? 0;
        return (
          <span className={cn('font-medium', level >= 2 ? 'text-red-600' : '')}>
            {level > 0 ? `Cấp ${level}` : '—'}
          </span>
        );
      },
    },
    {
      key: 'evidence',
      label: 'Bằng chứng',
      render: (item: Incident) => {
        const count = item.customFields?.evidenceUrls?.length ?? 0;
        return (
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {count > 0 ? `${count} tệp` : '—'}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Ngày báo cáo',
      render: (item: Incident) => (
        <span className="text-sm">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item: Incident) => (
        <div className="flex items-center gap-1">
          {item.status !== 'resolved' && item.status !== 'closed' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleEscalate(item.id)}
              disabled={escalatingId === item.id}
            >
              <ArrowUpCircle className="h-3 w-3 mr-1" />
              {escalatingId === item.id ? '...' : 'Leo thang'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-red-500" />
          An toàn trẻ em
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadIncidents();
              loadRetention();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Làm mới
          </Button>
          <Button variant="destructive" onClick={() => setShowReport(true)}>
            <Plus className="h-4 w-4 mr-1" /> Báo cáo sự cố
          </Button>
        </div>
      </div>

      {/* Restricted access warning */}
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
        <p className="text-sm text-red-700 font-medium">
          Khu vực hạn chế — Chỉ dành cho nhân viên được chỉ định. Mọi truy cập đều được ghi nhận.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Sự cố đang mở</p>
                <p className="text-3xl font-bold text-red-600">{openCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Đã leo thang</p>
                <p className="text-3xl font-bold text-amber-600">{escalatedCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <ArrowUpCircle className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Đã giải quyết</p>
                <p className="text-3xl font-bold text-emerald-600">{resolvedCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {retention && (
          <Card className="border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Chờ xóa bằng chứng</p>
                  <p className="text-3xl font-bold text-blue-600">{retention.pendingRedaction}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Chính sách {retention.retentionDays} ngày
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Archive className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Danh sách sự cố ({incidents.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-[hsl(var(--muted-foreground))]">Đang tải...</div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-10 text-[hsl(var(--muted-foreground))]">
              Không có sự cố nào
            </div>
          ) : (
            <DataTable columns={columns} data={incidents} />
          )}
        </CardContent>
      </Card>

      {/* Report dialog */}
      {showReport && (
        <ReportIncidentForm onCreated={loadIncidents} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
