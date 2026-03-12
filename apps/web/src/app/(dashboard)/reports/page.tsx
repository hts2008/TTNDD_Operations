'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3, Users, Wallet, TrendingUp, Shield,
  FileDown, FileSpreadsheet, FileText, Download,
  Clock, CheckCircle, Loader2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ExportFormat = 'csv' | 'excel' | 'pdf';
type ResourceType = 'attendance' | 'finance' | 'members' | 'skills';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
  iconColor: string;
  iconBg: string;
  resource: ResourceType;
  lastGenerated?: string;
}

interface DownloadEntry {
  id: string;
  resource: ResourceType;
  format: ExportFormat;
  status: 'downloading' | 'ready' | 'error';
  url?: string;
  timestamp: Date;
  error?: string;
}

const REPORTS: ReportCard[] = [
  {
    id: 'r1', title: 'Báo cáo Điểm danh', resource: 'attendance',
    description: 'Thống kê tỷ lệ tham gia sinh hoạt theo tuần, tháng, quý. Phân tích theo Ngành và Đơn vị.',
    icon: Users, iconColor: 'text-blue-600', iconBg: 'bg-blue-100',
    lastGenerated: '2026-03-01',
  },
  {
    id: 'r2', title: 'Báo cáo Tài chính', resource: 'finance',
    description: 'Tổng hợp thu chi, quỹ hoạt động, phí sinh hoạt. Biểu đồ theo thời gian và danh mục.',
    icon: Wallet, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100',
    lastGenerated: '2026-02-28',
  },
  {
    id: 'r3', title: 'Tiến trình Đoàn sinh', resource: 'skills',
    description: 'Phân tích EXP, Đẳng thứ, Kỹ năng đã đạt. So sánh tiến trình giữa các Đoàn sinh.',
    icon: TrendingUp, iconColor: 'text-amber-600', iconBg: 'bg-amber-100',
    lastGenerated: '2026-02-15',
  },
  {
    id: 'r4', title: 'Danh sách Đoàn sinh', resource: 'members',
    description: 'Xuất danh sách thành viên, thông tin cá nhân, vai trò, trạng thái.',
    icon: Shield, iconColor: 'text-purple-600', iconBg: 'bg-purple-100',
  },
];

const FORMAT_CONFIG: Record<ExportFormat, { label: string; icon: typeof FileDown; mime: string; ext: string }> = {
  csv:   { label: 'CSV',   icon: FileDown,        mime: 'text/csv',                      ext: 'csv' },
  excel: { label: 'Excel', icon: FileSpreadsheet,  mime: 'application/vnd.ms-excel',      ext: 'xls' },
  pdf:   { label: 'PDF',   icon: FileText,         mime: 'application/pdf',               ext: 'pdf' },
};

export default function ReportsPage() {
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleExport = useCallback(async (resource: ResourceType, format: ExportFormat) => {
    const key = `${resource}-${format}`;
    const entryId = `${key}-${Date.now()}`;

    setLoadingKey(key);
    setDownloads((prev) => [
      { id: entryId, resource, format, status: 'downloading', timestamp: new Date() },
      ...prev,
    ]);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
      const endpoint = format === 'pdf' ? 'export/pdf' : `export/${format}`;
      const res = await fetch(`${API_BASE}/dashboards/${endpoint}?resource=${resource}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename = `${resource}_export_${new Date().toISOString().slice(0, 10)}.${FORMAT_CONFIG[format].ext}`;

      // Auto-download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloads((prev) =>
        prev.map((d) =>
          d.id === entryId ? { ...d, status: 'ready', url } : d,
        ),
      );
    } catch (err) {
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === entryId
            ? { ...d, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
            : d,
        ),
      );
    } finally {
      setLoadingKey(null);
    }
  }, []);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-indigo-500" />
        Báo cáo & Xuất dữ liệu
      </h1>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={cn(report.iconBg, 'h-12 w-12 rounded-lg flex items-center justify-center shrink-0')}>
                    <Icon className={cn('h-6 w-6', report.iconColor)} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                    {report.lastGenerated && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Lần tạo gần nhất: {new Date(report.lastGenerated).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map((fmt) => {
                    const cfg = FORMAT_CONFIG[fmt];
                    const FmtIcon = cfg.icon;
                    const isLoading = loadingKey === `${report.resource}-${fmt}`;
                    return (
                      <Button
                        key={fmt}
                        variant="outline"
                        size="sm"
                        disabled={!!loadingKey}
                        onClick={() => handleExport(report.resource, fmt)}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <FmtIcon className="h-4 w-4 mr-1" />
                        )}
                        {cfg.label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Downloads History */}
      {downloads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5" />
              Lịch sử tải xuống
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {downloads.slice(0, 10).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {d.status === 'downloading' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {d.status === 'ready' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                    {d.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                    <div>
                      <p className="text-sm font-medium capitalize">{d.resource} — {FORMAT_CONFIG[d.format].label}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {d.timestamp.toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  {d.status === 'ready' && d.url && (
                    <a href={d.url} download className="text-sm text-primary hover:underline">
                      Tải lại
                    </a>
                  )}
                  {d.status === 'error' && (
                    <span className="text-xs text-red-500">{d.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
