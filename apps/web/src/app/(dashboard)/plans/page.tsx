'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  FileText,
  Plus,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Lock,
  Send,
  Filter,
} from 'lucide-react';

type PlanStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked';

interface Plan {
  id: string;
  title: string;
  planType: string;
  status: PlanStatus;
  createdAt: string;
  submittedBy?: string;
  approvedBy?: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<PlanStatus, { label: string; icon: React.ReactNode; className: string }> = {
  draft: {
    label: 'Bản nháp',
    icon: <FileText className="h-3.5 w-3.5" />,
    className: 'bg-gray-100 text-gray-700',
  },
  submitted: {
    label: 'Đã gửi duyệt',
    icon: <Send className="h-3.5 w-3.5" />,
    className: 'bg-blue-100 text-blue-700',
  },
  approved: {
    label: 'Đã duyệt',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: 'bg-emerald-100 text-emerald-700',
  },
  rejected: {
    label: 'Bị từ chối',
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: 'bg-red-100 text-red-700',
  },
  locked: {
    label: 'Đã khóa',
    icon: <Lock className="h-3.5 w-3.5" />,
    className: 'bg-purple-100 text-purple-700',
  },
};

const PLAN_TYPE_LABELS: Record<string, string> = {
  annual: 'Kế hoạch năm',
  quarterly: 'Kế hoạch quý',
  event: 'Kế hoạch sự kiện',
  camp: 'Kế hoạch trại',
  training: 'Kế hoạch huấn luyện',
  other: 'Khác',
};

const MOCK_PLANS: Plan[] = [
  {
    id: '1',
    title: 'Kế hoạch Trại Hè 2026 - Đoàn TNTP',
    planType: 'camp',
    status: 'approved',
    createdAt: '2026-02-10',
    submittedBy: 'Trưởng Minh',
    approvedBy: 'Đoàn trưởng Hải',
    updatedAt: '2026-03-01',
  },
  {
    id: '2',
    title: 'Kế hoạch sinh hoạt Quý 2/2026 - Ngành Thiếu',
    planType: 'quarterly',
    status: 'submitted',
    createdAt: '2026-03-05',
    submittedBy: 'Trưởng Hà',
    updatedAt: '2026-03-10',
  },
  {
    id: '3',
    title: 'Kế hoạch năm 2026 - Đơn vị Trung tâm',
    planType: 'annual',
    status: 'locked',
    createdAt: '2026-01-05',
    submittedBy: 'Trưởng Nam',
    approvedBy: 'Đoàn trưởng Hải',
    updatedAt: '2026-01-20',
  },
  {
    id: '4',
    title: 'Kế hoạch Ngày hội Gia đình 2026',
    planType: 'event',
    status: 'draft',
    createdAt: '2026-03-12',
    updatedAt: '2026-03-14',
  },
  {
    id: '5',
    title: 'Kế hoạch Huấn luyện Kỹ năng Sống',
    planType: 'training',
    status: 'rejected',
    createdAt: '2026-02-20',
    submittedBy: 'Trưởng Lan',
    updatedAt: '2026-03-05',
  },
  {
    id: '6',
    title: 'Kế hoạch Trại Xuân 2026 - Ngành Tráng',
    planType: 'camp',
    status: 'draft',
    createdAt: '2026-03-18',
    updatedAt: '2026-03-18',
  },
];

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const res = await api.get<{ data: Plan[] }>('/projects/plans');
      setPlans(res.data);
    } catch {
      setPlans(MOCK_PLANS);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { key: 'all', label: 'Tất cả', count: plans.length },
    { key: 'draft', label: 'Bản nháp', count: plans.filter((p) => p.status === 'draft').length },
    { key: 'submitted', label: 'Chờ duyệt', count: plans.filter((p) => p.status === 'submitted').length },
    { key: 'approved', label: 'Đã duyệt', count: plans.filter((p) => p.status === 'approved').length },
    { key: 'rejected', label: 'Từ chối', count: plans.filter((p) => p.status === 'rejected').length },
    { key: 'locked', label: 'Đã khóa', count: plans.filter((p) => p.status === 'locked').length },
  ];

  const filtered = activeTab === 'all' ? plans : plans.filter((p) => p.status === activeTab);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-indigo-500" />
          Kế hoạch
        </h1>
        <Button>
          <Plus className="h-4 w-4 mr-1" /> Soạn kế hoạch
        </Button>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === t.key
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-foreground'
            )}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-3 text-[hsl(var(--muted-foreground))]" />
          <p className="text-[hsl(var(--muted-foreground))]">Không có kế hoạch nào</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plan) => {
            const statusCfg = STATUS_CONFIG[plan.status];
            const typeLabel = PLAN_TYPE_LABELS[plan.planType] ?? plan.planType;
            return (
              <Card
                key={plan.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-snug group-hover:text-indigo-600 transition-colors">
                      {plan.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        statusCfg.className
                      )}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {typeLabel}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Tạo: {new Date(plan.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    {plan.submittedBy && (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span>Gửi bởi: {plan.submittedBy}</span>
                      </div>
                    )}
                    {plan.approvedBy && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span>Duyệt bởi: {plan.approvedBy}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      Cập nhật: {new Date(plan.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                    {plan.status === 'approved' && (
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                        Tạo dự án
                      </Button>
                    )}
                    {plan.status === 'draft' && (
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                        Gửi duyệt
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
