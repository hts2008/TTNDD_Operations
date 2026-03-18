'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Rocket,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Database,
  TestTube,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface ReleaseGate {
  id: string;
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'pending' | 'warning';
  details: string;
  lastChecked?: string;
}

const MOCK_GATES: ReleaseGate[] = [
  {
    id: '1',
    name: 'TypeScript Build',
    category: 'build',
    status: 'pass',
    details: '0 errors, 0 warnings',
    lastChecked: '2026-03-19T01:00',
  },
  {
    id: '2',
    name: 'Unit Tests',
    category: 'test',
    status: 'warning',
    details: '9/9 specs, ~15% coverage (target: 60%)',
    lastChecked: '2026-03-19T01:00',
  },
  {
    id: '3',
    name: 'E2E Tests',
    category: 'test',
    status: 'pass',
    details: '10 Playwright specs passing',
    lastChecked: '2026-03-19T01:00',
  },
  {
    id: '4',
    name: 'RLS Policies',
    category: 'security',
    status: 'pass',
    details: '55 tables ENABLE+FORCE',
    lastChecked: '2026-03-19T01:00',
  },
  {
    id: '5',
    name: 'Security Headers',
    category: 'security',
    status: 'pass',
    details: 'HSTS, CSP, X-Frame active',
    lastChecked: '2026-03-19T01:00',
  },
  {
    id: '6',
    name: 'Rate Limiting',
    category: 'security',
    status: 'pass',
    details: '100 req/min per IP',
    lastChecked: '2026-03-19T01:00',
  },
  {
    id: '7',
    name: 'Prisma Migrations',
    category: 'data',
    status: 'warning',
    details: '10 migrations, fragmented history',
    lastChecked: '2026-03-19T01:00',
  },
  {
    id: '8',
    name: 'Cloud Run',
    category: 'deploy',
    status: 'pass',
    details: 'rev 00045-wb9 serving 100%',
    lastChecked: '2026-03-19T01:00',
  },
  {
    id: '9',
    name: 'CD Pipeline',
    category: 'deploy',
    status: 'fail',
    details: 'WIF configured, never succeeded',
    lastChecked: '2026-03-19T01:00',
  },
  {
    id: '10',
    name: 'Seed Data',
    category: 'data',
    status: 'warning',
    details: '5 ApprovalDefinition seeds; full seed not verified',
    lastChecked: '2026-03-19T01:00',
  },
  {
    id: '11',
    name: 'OpenAPI Contract',
    category: 'docs',
    status: 'warning',
    details: 'Possibly stale vs 21 controllers',
    lastChecked: '2026-03-19T01:00',
  },
  {
    id: '12',
    name: 'Event Catalog',
    category: 'docs',
    status: 'warning',
    details: 'Needs regeneration from events.ts',
    lastChecked: '2026-03-19T01:00',
  },
];

export default function ReleaseManagerPage() {
  const [gates, setGates] = useState<ReleaseGate[]>(MOCK_GATES);

  const statusIcon = (s: string) => {
    if (s === 'pass') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    if (s === 'fail') return <XCircle className="h-5 w-5 text-red-500" />;
    if (s === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  const statusLabel = (s: string) => {
    if (s === 'pass') return 'Đạt';
    if (s === 'fail') return 'Lỗi';
    if (s === 'warning') return 'Cảnh báo';
    return 'Đang kiểm';
  };

  const categoryIcon = (c: string) => {
    if (c === 'security') return <Shield className="h-4 w-4" />;
    if (c === 'data') return <Database className="h-4 w-4" />;
    if (c === 'test') return <TestTube className="h-4 w-4" />;
    if (c === 'docs') return <FileText className="h-4 w-4" />;
    return <Rocket className="h-4 w-4" />;
  };

  const passCount = gates.filter((g) => g.status === 'pass').length;
  const failCount = gates.filter((g) => g.status === 'fail').length;
  const warnCount = gates.filter((g) => g.status === 'warning').length;
  const readiness = Math.round((passCount / gates.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6" />
            Release Dashboard
          </h1>
          <p className="text-muted-foreground">Theo dõi mức độ sẵn sàng phát hành</p>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Kiểm tra lại
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-emerald-600">{readiness}%</p>
            <p className="text-sm text-muted-foreground mt-1">Mức sẵn sàng</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-emerald-600">{passCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Đạt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-amber-500">{warnCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Cảnh báo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-red-500">{failCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Lỗi</p>
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
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {statusIcon(g.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      {categoryIcon(g.category)}
                      <span className="font-medium text-sm">{g.name}</span>
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
