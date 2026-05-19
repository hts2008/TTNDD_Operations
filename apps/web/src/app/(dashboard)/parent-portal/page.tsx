'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  CalendarCheck,
  Clock,
  Eye,
  FileText,
  Inbox,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageError, PageLoading } from '@/components/ui/page-states';
import { MetricTile, NextActionList, ProgressMeter } from '@/components/ui/progression';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ChildInfo {
  id: string;
  memberCode: string | null;
  scoutName: string | null;
  status: string;
  profile: { fullName: string } | null;
  branch: { name: string } | null;
  unit: { name: string } | null;
}

interface ComplianceInfo {
  compliant: boolean;
  violations: string[];
}

interface ChildJourney {
  exp: {
    totalExp: number;
    availableExp: number;
    lastUpdated: string | null;
  };
  badgesCount: number;
  attendance: Record<string, number> & { total: number; presentRate: number };
  courses: {
    id: string;
    status: string;
    progressPct: number;
    completedAt: string | null;
    course: {
      title: string;
      category: string | null;
      difficulty: string | null;
      expReward: number;
    };
  }[];
  guardianConsent: {
    total: number;
    signed: number;
    primarySigned: boolean;
  };
  nextActions: { type?: string; label: string; priority?: string }[];
}

interface ParentData {
  children: (ChildInfo & { compliance: ComplianceInfo; journey: ChildJourney })[];
  accessLogs: { timestamp: string; action: string; resource: string }[];
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function ChildCard({ child }: { child: ParentData['children'][number] }) {
  const displayName = child.profile?.fullName || child.scoutName || 'Chua co ten';
  const consentOk =
    child.journey.guardianConsent.primarySigned || child.journey.guardianConsent.signed > 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="border-b border-[hsl(var(--border))] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">{displayName}</h3>
                <Badge variant={child.status === 'active' ? 'success' : 'secondary'}>
                  {child.status === 'active' ? 'Hoat dong' : child.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {child.memberCode || 'no-code'} / {child.branch?.name || 'no-branch'} /{' '}
                {child.unit?.name || 'no-unit'}
              </p>
            </div>
            <Badge variant={child.compliance.compliant ? 'success' : 'warning'}>
              {child.compliance.compliant
                ? 'Ho so an toan'
                : `${child.compliance.violations.length} can xu ly`}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon={<Zap className="h-5 w-5" />}
            label="EXP"
            value={child.journey.exp.totalExp.toLocaleString()}
            detail={`${child.journey.exp.availableExp.toLocaleString()} kha dung`}
            tone="gold"
          />
          <MetricTile
            icon={<Award className="h-5 w-5" />}
            label="Huy hieu"
            value={child.journey.badgesCount}
            detail="da ghi nhan"
            tone="emerald"
          />
          <MetricTile
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Diem danh"
            value={`${child.journey.attendance.presentRate}%`}
            detail={`${child.journey.attendance.present ?? 0}/${child.journey.attendance.total} buoi co mat`}
            tone={child.journey.attendance.presentRate >= 80 ? 'emerald' : 'rose'}
          />
          <MetricTile
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Dong thuan"
            value={`${child.journey.guardianConsent.signed}/${child.journey.guardianConsent.total}`}
            detail={consentOk ? 'guardian da dong thuan' : 'can kiem tra mau ky'}
            tone={consentOk ? 'emerald' : 'rose'}
          />
        </div>

        <div className="grid gap-5 border-t border-[hsl(var(--border))] p-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--foreground))]">
              <BookOpen className="h-4 w-4 text-[hsl(var(--primary))]" />
              Khoa hoc dang theo doi
            </div>
            {child.journey.courses.slice(0, 3).map((course) => (
              <div key={course.id} className="rounded-lg border border-[hsl(var(--border))] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {course.course.title}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {course.course.category || 'course'} / {course.status} / +
                      {course.course.expReward} EXP
                    </p>
                  </div>
                  <Badge variant={course.status === 'completed' ? 'success' : 'secondary'}>
                    {course.status}
                  </Badge>
                </div>
                <div className="mt-3">
                  <ProgressMeter
                    label="Tien do"
                    value={course.progressPct}
                    detail={
                      course.completedAt
                        ? `Hoan thanh ${formatDate(course.completedAt)}`
                        : undefined
                    }
                  />
                </div>
              </div>
            ))}
            {child.journey.courses.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Chua co khoa hoc LMS dang gan.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--foreground))]">
              <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
              Viec phu huynh can chu y
            </div>
            <NextActionList actions={child.journey.nextActions} />
          </div>
        </div>

        {!child.compliance.compliant && child.compliance.violations.length > 0 && (
          <div className="border-t border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
            {child.compliance.violations[0]}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ParentPortalPage() {
  const [data, setData] = useState<ParentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<ParentData>('/hrm/parent-portal/dashboard'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc du lieu phu huynh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const summary = useMemo(() => {
    const children = data?.children ?? [];
    return {
      total: children.length,
      compliant: children.filter((child) => child.compliance.compliant).length,
      exp: children.reduce((sum, child) => sum + child.journey.exp.totalExp, 0),
      activeCourses: children.reduce(
        (sum, child) =>
          sum + child.journey.courses.filter((course) => course.status !== 'completed').length,
        0,
      ),
      pendingActions: children.reduce((sum, child) => sum + child.journey.nextActions.length, 0),
    };
  }, [data]);

  if (loading) return <PageLoading message="Dang tai cong phu huynh..." />;
  if (error) return <PageError message={error} onRetry={loadDashboard} />;

  if (!data || data.children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[hsl(var(--foreground))]">
            <Users className="h-6 w-6 text-[hsl(var(--primary))]" />
            Cong Phu huynh
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Theo doi thong tin parent-safe cua con em.
          </p>
        </div>
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="mb-3 h-10 w-10 text-[hsl(var(--muted-foreground))]" />
          <p className="text-sm font-medium">Chua co thong tin con em</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Lien he quan doan de lien ket tai khoan phu huynh.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[hsl(var(--foreground))]">
            <Users className="h-6 w-6 text-[hsl(var(--primary))]" />
            Cong Phu huynh
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Theo doi tien bo, an toan va cac viec can phu huynh chu y cho {summary.total} em.
          </p>
        </div>
        <Link
          href="/consent-templates"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm font-medium hover:border-[hsl(var(--primary))]"
        >
          <FileText className="h-4 w-4" />
          Mau dong thuan
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile
          icon={<Users className="h-5 w-5" />}
          label="Con em"
          value={summary.total}
          detail="dang lien ket"
          tone="navy"
        />
        <MetricTile
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Tuan thu"
          value={`${summary.compliant}/${summary.total}`}
          detail="ho so an toan"
          tone={summary.compliant === summary.total ? 'emerald' : 'rose'}
        />
        <MetricTile
          icon={<Zap className="h-5 w-5" />}
          label="EXP"
          value={summary.exp.toLocaleString()}
          detail="tong tich luy"
          tone="gold"
        />
        <MetricTile
          icon={<BookOpen className="h-5 w-5" />}
          label="Khoa hoc"
          value={summary.activeCourses}
          detail="dang can theo doi"
          tone="sky"
        />
        <MetricTile
          icon={<Sparkles className="h-5 w-5" />}
          label="Can chu y"
          value={summary.pendingActions}
          detail="next actions"
          tone={summary.pendingActions > 0 ? 'rose' : 'emerald'}
        />
      </div>

      <div className="space-y-4">
        {data.children.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-4 w-4" />
            Nhat ky truy cap du lieu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.accessLogs.slice(0, 20).map((log, index) => (
            <div
              key={`${log.timestamp}-${index}`}
              className={cn(
                'flex flex-col gap-2 rounded-lg border border-[hsl(var(--border))] p-3 text-sm sm:flex-row sm:items-center sm:justify-between',
              )}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                <span className="text-[hsl(var(--foreground))]">{log.action}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  / {log.resource}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                <Clock className="h-3 w-3" />
                {new Date(log.timestamp).toLocaleString('vi-VN')}
              </div>
            </div>
          ))}
          {data.accessLogs.length === 0 && (
            <p className="py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Chua co nhat ky truy cap
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
