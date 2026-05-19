'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type ExportResource = 'members' | 'attendance' | 'finance' | 'skills';
type ExportFormat = 'csv' | 'excel';

interface DashboardWidget {
  label: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'flat';
}

interface OrgDashboard {
  widgets: DashboardWidget[];
  recentActivity: unknown[];
}

interface FinanceReport {
  totals: { income: number; expense: number; net: number };
  byCategory: Record<string, { income: number; expense: number }>;
  monthlyTrends: Record<string, { income: number; expense: number }>;
  fees: { totalDue: number; totalPaid: number; outstanding: number; collectionRate: number };
  accounts: Array<{ id: string; name: string; type: string; balance: number }>;
}

interface AttendanceReport {
  overall: {
    totalSessions: number;
    totalAttendanceRecords: number;
    totalPresent: number;
    avgRate: number;
  };
  bySession: Array<{
    sessionId: string;
    title: string;
    date: string;
    branchName: string;
    totalMembers: number;
    present: number;
    rate: number;
  }>;
  byBranch: Array<{ branchId: string; branchName: string; sessions: number; avgRate: number }>;
  byMember: Array<{
    memberId: string;
    scoutName: string;
    memberCode?: string;
    total: number;
    present: number;
    rate: number;
  }>;
}

interface SpicesReport {
  tamTru: { daoDuc: number; phuongPhap: number; giaoDuc: number };
  totalSessions: number;
  balanceScore: number;
  perBranch: Array<{
    branchId: string;
    branchName: string;
    branchCode?: string;
    daoDuc: number;
    phuongPhap: number;
    giaoDuc: number;
    total: number;
  }>;
}

interface ReportState {
  org: OrgDashboard | null;
  finance: FinanceReport | null;
  attendance: AttendanceReport | null;
  spices: SpicesReport | null;
}

const REPORT_CARDS = [
  {
    key: 'attendance',
    title: 'Attendance analytics',
    description: 'Session attendance rates by session, branch, and member.',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    exportResource: 'attendance' as ExportResource,
  },
  {
    key: 'finance',
    title: 'Finance report',
    description: 'Income, expense, category split, account balances, and fee collection.',
    icon: Wallet,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    exportResource: 'finance' as ExportResource,
  },
  {
    key: 'members',
    title: 'Member operations',
    description: 'Organization member snapshot and exportable member roster.',
    icon: TrendingUp,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    exportResource: 'members' as ExportResource,
  },
  {
    key: 'spices',
    title: 'SPICES coverage',
    description: 'Tam Tru balance by session and branch from real session tagging.',
    icon: Shield,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    exportResource: 'skills' as ExportResource,
  },
];

function formatNumber(value: number | string | undefined) {
  if (value === undefined) return '-';
  if (typeof value === 'string') return value;
  return new Intl.NumberFormat('vi-VN').format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function todayMinus(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function findWidget(org: OrgDashboard | null, label: string) {
  return org?.widgets.find((widget) => widget.label === label);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(todayMinus(90));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [reports, setReports] = useState<ReportState>({
    org: null,
    finance: null,
    attendance: null,
    spices: null,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [org, finance, attendance, spices] = await Promise.all([
        api.get<OrgDashboard>('/dashboards/org'),
        api.get<FinanceReport>('/dashboards/finance', { from, to }),
        api.get<AttendanceReport>('/dashboards/attendance', { from, to }),
        api.get<SpicesReport>('/dashboards/spices'),
      ]);

      setReports({ org, finance, attendance, spices });
      setLastLoadedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc bao cao');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const memberMetrics = useMemo(
    () => ({
      total: findWidget(reports.org, 'Total Members')?.value ?? 0,
      active: findWidget(reports.org, 'Active Members')?.value ?? 0,
      tickets: findWidget(reports.org, 'Open Tickets')?.value ?? 0,
    }),
    [reports.org],
  );

  async function exportReport(resource: ExportResource, format: ExportFormat) {
    const exportKey = `${resource}:${format}`;
    setExporting(exportKey);
    setError(null);
    try {
      const blob = await api.download(`/dashboards/export/${format}`, { resource, from, to });
      const extension = format === 'csv' ? 'csv' : 'xls';
      downloadBlob(blob, `${resource}_export_${from}_${to}.${extension}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong xuat duoc file');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <BarChart3 className="h-8 w-8 text-indigo-500" />
            Bao cao
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bao cao doc truc tiep tu dashboard APIs va export endpoints. Khong dung data mau.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">From</span>
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">To</span>
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <Button onClick={loadReports} disabled={loading}>
            <RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} />
            Tao bao cao
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {lastLoadedAt && (
        <p className="text-xs text-muted-foreground">
          Lan tai gan nhat: {new Date(lastLoadedAt).toLocaleString('vi-VN')}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {REPORT_CARDS.map((report) => {
          const Icon = report.icon;
          const csvKey = `${report.exportResource}:csv`;
          const excelKey = `${report.exportResource}:excel`;

          return (
            <Card key={report.key} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      report.bg,
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                    )}
                  >
                    <Icon className={cn('h-6 w-6', report.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                    <Badge variant="outline" className="mt-2 text-[11px]">
                      {loading ? 'Loading' : 'API-backed'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.key === 'attendance' && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <Metric
                      label="Sessions"
                      value={reports.attendance?.overall.totalSessions ?? 0}
                    />
                    <Metric
                      label="Records"
                      value={reports.attendance?.overall.totalAttendanceRecords ?? 0}
                    />
                    <Metric
                      label="Avg rate"
                      value={`${reports.attendance?.overall.avgRate ?? 0}%`}
                    />
                  </div>
                )}
                {report.key === 'finance' && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <Metric
                      label="Income"
                      value={formatMoney(reports.finance?.totals.income ?? 0)}
                    />
                    <Metric
                      label="Expense"
                      value={formatMoney(reports.finance?.totals.expense ?? 0)}
                    />
                    <Metric label="Net" value={formatMoney(reports.finance?.totals.net ?? 0)} />
                  </div>
                )}
                {report.key === 'members' && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <Metric label="Total" value={memberMetrics.total} />
                    <Metric label="Active" value={memberMetrics.active} />
                    <Metric label="Open tickets" value={memberMetrics.tickets} />
                  </div>
                )}
                {report.key === 'spices' && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <Metric label="Sessions" value={reports.spices?.totalSessions ?? 0} />
                    <Metric label="Balance" value={`${reports.spices?.balanceScore ?? 0}%`} />
                    <Metric label="Branches" value={reports.spices?.perBranch.length ?? 0} />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={Boolean(exporting)}
                    onClick={() => exportReport(report.exportResource, 'csv')}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    {exporting === csvKey ? 'Dang xuat' : 'CSV'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={Boolean(exporting)}
                    onClick={() => exportReport(report.exportResource, 'excel')}
                  >
                    <FileSpreadsheet className="mr-1 h-4 w-4" />
                    {exporting === excelKey ? 'Dang xuat' : 'Excel'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance by session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(reports.attendance?.bySession ?? []).slice(0, 8).map((session) => (
              <div key={session.sessionId} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{session.title}</span>
                  <Badge variant="outline">{session.rate}%</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {session.branchName} - {new Date(session.date).toLocaleDateString('vi-VN')} -{' '}
                  {session.present}/{session.totalMembers}
                </p>
              </div>
            ))}
            {!loading && (reports.attendance?.bySession.length ?? 0) === 0 && (
              <EmptyLine text="Khong co attendance trong khoang ngay nay." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Finance by category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(reports.finance?.byCategory ?? {})
              .slice(0, 8)
              .map(([category, value]) => (
                <div key={category} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{category}</span>
                    <span className="text-xs text-muted-foreground">
                      Net {formatMoney(value.income - value.expense)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Income {formatMoney(value.income)} - Expense {formatMoney(value.expense)}
                  </p>
                </div>
              ))}
            {!loading && Object.keys(reports.finance?.byCategory ?? {}).length === 0 && (
              <EmptyLine text="Khong co giao dich tai chinh trong khoang ngay nay." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SPICES by branch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(reports.spices?.perBranch ?? []).slice(0, 8).map((branch) => (
              <div key={branch.branchId} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{branch.branchName}</span>
                  <Badge variant="outline">{branch.total} sessions</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dao duc {branch.daoDuc} - Phuong phap {branch.phuongPhap} - Giao duc{' '}
                  {branch.giaoDuc}
                </p>
              </div>
            ))}
            {!loading && (reports.spices?.perBranch.length ?? 0) === 0 && (
              <EmptyLine text="Chua co session tagging SPICES." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Export coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {(['members', 'attendance', 'finance', 'skills'] as ExportResource[]).map((resource) => (
            <div key={resource} className="rounded-md border p-3">
              <p className="text-sm font-medium">{resource}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                CSV/Excel export qua `/dashboards/export/*`.
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <p className="text-lg font-semibold">{formatNumber(value)}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{text}</p>;
}
