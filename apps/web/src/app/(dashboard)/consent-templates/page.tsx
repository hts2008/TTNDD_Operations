'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FileCheck, RefreshCw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

/* ── Types ── */
interface ConsentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredFor: string;
  signedCount: number;
  pendingCount: number;
  createdAt: string;
}

interface ConsentStats {
  totalTemplates: number;
  fullySigned: number;
  pendingSignatures: number;
}

/* ── Demo Data ── */
const DEMO_TEMPLATES: ConsentTemplate[] = [
  {
    id: '1',
    name: 'Đồng ý tham gia Trại hè 2026',
    description: 'Phụ huynh đồng ý cho con em tham gia hoạt động trại hè tại Vũng Tàu',
    category: 'event',
    requiredFor: 'Trại hè 2026',
    signedCount: 45,
    pendingCount: 12,
    createdAt: '2026-02-15T00:00:00Z',
  },
  {
    id: '2',
    name: 'Chấp thuận chụp ảnh / quay phim',
    description: 'Đồng ý sử dụng hình ảnh con em trong các hoạt động tuyên truyền của đoàn',
    category: 'media',
    requiredFor: 'Tất cả đoàn sinh',
    signedCount: 52,
    pendingCount: 5,
    createdAt: '2026-01-10T00:00:00Z',
  },
  {
    id: '3',
    name: 'Đồng ý cho con em tập bơi',
    description: 'Phụ huynh cho phép con tham gia lớp bơi do đoàn tổ chức',
    category: 'activity',
    requiredFor: 'Lớp bơi T3-T5',
    signedCount: 20,
    pendingCount: 8,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Đồng ý điều trị y tế khẩn cấp',
    description: 'Ủy quyền cho Huynh trưởng đưa con em đi cấp cứu khi cần',
    category: 'medical',
    requiredFor: 'Tất cả đoàn sinh',
    signedCount: 55,
    pendingCount: 2,
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: '5',
    name: 'Đồng ý thu thập dữ liệu COPPA',
    description: 'Phụ huynh đồng ý cho hệ thống lưu trữ thông tin đoàn sinh dưới 13 tuổi',
    category: 'privacy',
    requiredFor: 'Đoàn sinh < 13 tuổi',
    signedCount: 30,
    pendingCount: 3,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  event: 'Sự kiện',
  media: 'Hình ảnh',
  activity: 'Hoạt động',
  medical: 'Y tế',
  privacy: 'Bảo mật',
};

/* ── Main Page ── */
export default function ConsentTemplatesPage() {
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ConsentTemplate[]>('/api/consent-templates');
      setTemplates(res);
    } catch {
      setTemplates(DEMO_TEMPLATES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const stats: ConsentStats = {
    totalTemplates: templates.length,
    fullySigned: templates.filter((t) => t.pendingCount === 0).length,
    pendingSignatures: templates.reduce((sum, t) => sum + t.pendingCount, 0),
  };

  const columns = [
    {
      key: 'name',
      label: 'Mẫu đồng ý',
      render: (item: ConsentTemplate) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Loại',
      render: (item: ConsentTemplate) => (
        <Badge variant="outline">{CATEGORY_LABELS[item.category] || item.category}</Badge>
      ),
    },
    {
      key: 'requiredFor',
      label: 'Áp dụng cho',
      render: (item: ConsentTemplate) => <span className="text-sm">{item.requiredFor}</span>,
    },
    {
      key: 'signed',
      label: 'Đã ký',
      render: (item: ConsentTemplate) => (
        <span className="font-medium text-emerald-600">{item.signedCount}</span>
      ),
    },
    {
      key: 'pending',
      label: 'Chưa ký',
      render: (item: ConsentTemplate) => (
        <span
          className={cn('font-medium', item.pendingCount > 0 ? 'text-amber-600' : 'text-gray-400')}
        >
          {item.pendingCount}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (item: ConsentTemplate) =>
        item.pendingCount === 0 ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Hoàn tất
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">
            <Clock className="h-3 w-3 mr-1" /> Đang chờ
          </Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileCheck className="h-8 w-8 text-blue-500" />
          Mẫu đồng ý phụ huynh
        </h1>
        <Button variant="outline" size="sm" onClick={loadTemplates}>
          <RefreshCw className="h-4 w-4 mr-1" /> Làm mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Tổng mẫu đồng ý</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalTemplates}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Đã ký đầy đủ</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.fullySigned}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Chữ ký chờ duyệt</p>
                <p className="text-3xl font-bold text-amber-600">{stats.pendingSignatures}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách mẫu đồng ý</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-[hsl(var(--muted-foreground))]">Đang tải...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 text-[hsl(var(--muted-foreground))]">
              Chưa có mẫu đồng ý nào
            </div>
          ) : (
            <DataTable columns={columns} data={templates} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
