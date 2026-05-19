'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageError, PageLoading } from '@/components/ui/page-states';
import { api } from '@/lib/api';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  RefreshCw,
  Rocket,
  Shield,
  TestTube,
  XCircle,
} from 'lucide-react';

interface ReleaseGate {
  id: string;
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'pending' | 'warning';
  details: string;
  lastChecked?: string;
}

interface ReleaseGateReport {
  id?: string;
  environment?: string;
  buildId?: string;
  commitSha?: string;
  profile?: string;
  status: 'pass' | 'fail' | 'pending' | 'warning' | string;
  message?: string;
  reportJson?: {
    gates?: ReleaseGate[];
    summary?: string;
    checks?: ReleaseGate[];
  };
  createdAt?: string;
}

function normalizeStatus(status: string): ReleaseGate['status'] {
  if (status === 'pass' || status === 'fail' || status === 'warning') return status;
  return 'pending';
}

function statusIcon(s: string) {
  if (s === 'pass') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (s === 'fail') return <XCircle className="h-5 w-5 text-red-500" />;
  if (s === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <Clock className="h-5 w-5 text-gray-400" />;
}

function statusLabel(s: string) {
  if (s === 'pass') return 'Dat';
  if (s === 'fail') return 'Loi';
  if (s === 'warning') return 'Canh bao';
  return 'Dang kiem';
}

function categoryIcon(c: string) {
  if (c === 'security') return <Shield className="h-4 w-4" />;
  if (c === 'data') return <Database className="h-4 w-4" />;
  if (c === 'test') return <TestTube className="h-4 w-4" />;
  if (c === 'docs') return <FileText className="h-4 w-4" />;
  return <Rocket className="h-4 w-4" />;
}

export default function ReleaseManagerPage() {
  const [report, setReport] = useState<ReleaseGateReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      setReport(await api.get<ReleaseGateReport>('/system/release-gates/latest'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong the tai release gates');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  const gates = useMemo<ReleaseGate[]>(() => {
    const fromReport = report?.reportJson?.gates ?? report?.reportJson?.checks;
    if (fromReport?.length) return fromReport;
    if (!report) return [];
    return [
      {
        id: report.id ?? 'latest',
        name: 'Latest release gate report',
        category: 'release',
        status: normalizeStatus(report.status),
        details:
          report.message ?? report.reportJson?.summary ?? `Profile ${report.profile ?? 'unknown'}`,
        lastChecked: report.createdAt,
      },
    ];
  }, [report]);

  if (loading) return <PageLoading message="Dang tai release gates..." />;
  if (error) return <PageError message={error} onRetry={loadReport} />;

  const passCount = gates.filter((g) => g.status === 'pass').length;
  const failCount = gates.filter((g) => g.status === 'fail').length;
  const warnCount = gates.filter((g) => g.status === 'warning').length;
  const readiness = gates.length > 0 ? Math.round((passCount / gates.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Rocket className="h-6 w-6" />
            Release Dashboard
          </h1>
          <p className="text-muted-foreground">Du lieu tu /system/release-gates/latest.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void loadReport()}>
          <RefreshCw className="h-4 w-4" />
          Kiem tra lai
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-emerald-600">{readiness}%</p>
            <p className="mt-1 text-sm text-muted-foreground">Muc san sang</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-emerald-600">{passCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Dat</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-amber-500">{warnCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Canh bao</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-red-500">{failCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Loi</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Release Gates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {gates.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {statusIcon(g.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      {categoryIcon(g.category)}
                      <span className="text-sm font-medium">{g.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{g.details}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium">{statusLabel(g.status)}</span>
                  {g.lastChecked && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(g.lastChecked).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
