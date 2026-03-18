'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { FileText, Plus, CheckCircle2, Clock, AlertCircle, Search } from 'lucide-react';

interface ConsentTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  requiredAge?: number;
  status: 'active' | 'draft' | 'archived';
  version: number;
  createdAt: string;
}

export default function ConsentTemplatesPage() {
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await api.get<ConsentTemplate[]>('/consent-templates');
      setTemplates(data);
    } catch {
      // Demo data for development
      setTemplates([
        {
          id: '1',
          name: 'Phiếu xin phép tham gia trại',
          description: 'Dành cho phụ huynh ký xác nhận cho con tham gia trại huấn luyện',
          category: 'camp',
          requiredAge: 18,
          status: 'active',
          version: 2,
          createdAt: '2026-01-15',
        },
        {
          id: '2',
          name: 'Phiếu đồng ý chụp ảnh/quay video',
          description: 'Cho phép ghi hình hoạt động sinh hoạt',
          category: 'media',
          status: 'active',
          version: 1,
          createdAt: '2026-02-01',
        },
        {
          id: '3',
          name: 'Phiếu xác nhận tình trạng sức khỏe',
          description: 'Phụ huynh khai báo tình trạng sức khỏe con em',
          category: 'health',
          requiredAge: 18,
          status: 'active',
          version: 3,
          createdAt: '2026-01-10',
        },
        {
          id: '4',
          name: 'Phiếu đăng ký tham gia chương trình',
          description: 'Đơn đăng ký tham gia chương trình đoàn',
          category: 'enrollment',
          status: 'draft',
          version: 1,
          createdAt: '2026-03-01',
        },
        {
          id: '5',
          name: 'Phiếu xin nghỉ phép',
          description: 'Đoàn sinh xin phép nghỉ sinh hoạt',
          category: 'leave',
          status: 'archived',
          version: 1,
          createdAt: '2025-12-01',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const statusIcon = (s: string) => {
    if (s === 'active') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (s === 'draft') return <Clock className="h-4 w-4 text-amber-500" />;
    return <AlertCircle className="h-4 w-4 text-gray-400" />;
  };

  const statusLabel = (s: string) => {
    if (s === 'active') return 'Đang dùng';
    if (s === 'draft') return 'Bản nháp';
    return 'Lưu trữ';
  };

  const filtered = templates.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || t.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mẫu Đồng Ý</h1>
          <p className="text-muted-foreground">
            Quản lý các mẫu phiếu đồng ý và xác nhận của phụ huynh
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo mẫu mới
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm"
            placeholder="Tìm mẫu đồng ý..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="active">Đang dùng</option>
          <option value="draft">Bản nháp</option>
          <option value="archived">Lưu trữ</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    {statusIcon(t.status)}
                    {statusLabel(t.status)}
                  </span>
                </div>
                <CardTitle className="text-base mt-2">{t.name}</CardTitle>
                {t.description && (
                  <CardDescription className="text-xs">{t.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Phiên bản {t.version}</span>
                  <span>{new Date(t.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
