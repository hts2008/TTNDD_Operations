'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Wallet, TrendingUp, Shield, FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
  iconColor: string;
  iconBg: string;
  lastGenerated?: string;
}

const REPORTS: ReportCard[] = [
  {
    id: 'r1',
    title: 'Báo cáo Điểm danh',
    description: 'Thống kê tỷ lệ tham gia sinh hoạt theo tuần, tháng, quý. Phân tích theo Ngành và Đơn vị.',
    icon: Users,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    lastGenerated: '2026-03-01',
  },
  {
    id: 'r2',
    title: 'Báo cáo Tài chính',
    description: 'Tổng hợp thu chi, quỹ hoạt động, phí sinh hoạt. Biểu đồ theo thời gian và danh mục.',
    icon: Wallet,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    lastGenerated: '2026-02-28',
  },
  {
    id: 'r3',
    title: 'Tiến trình Đoàn sinh',
    description: 'Phân tích EXP, Đẳng thứ, Kỹ năng đã đạt. So sánh tiến trình giữa các Đoàn sinh.',
    icon: TrendingUp,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    lastGenerated: '2026-02-15',
  },
  {
    id: 'r4',
    title: 'Phân tích SPICES',
    description: 'Đánh giá 6 lĩnh vực phát triển: Tâm linh, Thể chất, Trí tuệ, Nhân cách, Tình cảm, Xã hội.',
    icon: Shield,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
  },
];

const EXPORT_OPTIONS = [
  { label: 'CSV', icon: FileDown },
  { label: 'Excel', icon: FileSpreadsheet },
  { label: 'PDF', icon: FileText },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-indigo-500" />
        Báo cáo
      </h1>

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
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{report.description}</p>
                    {report.lastGenerated && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                        Lần tạo gần nhất: {new Date(report.lastGenerated).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm">
                    <BarChart3 className="h-4 w-4 mr-1" /> Tạo báo cáo
                  </Button>
                  <div className="flex gap-1">
                    {EXPORT_OPTIONS.map((opt) => {
                      const OptIcon = opt.icon;
                      return (
                        <Button key={opt.label} variant="outline" size="sm">
                          <OptIcon className="h-4 w-4 mr-1" /> {opt.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

