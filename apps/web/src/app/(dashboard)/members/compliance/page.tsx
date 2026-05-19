'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  Users,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface ComplianceDashboard {
  summary: { total: number; compliant: number; nonCompliant: number; complianceRate: number };
  violations: { memberId: string; memberName: string; issues: string[] }[];
}

export default function CompliancePage() {
  const router = useRouter();
  const [data, setData] = useState<ComplianceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setData(await api.get<ComplianceDashboard>('/hrm/compliance/dashboard'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center mx-auto max-w-md">
        <AlertCircle className="h-10 w-10 text-[hsl(var(--destructive))] mb-3" />
        <p className="text-sm font-medium text-[hsl(var(--destructive))]">{error}</p>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
          <Shield className="h-6 w-6 text-[hsl(var(--primary))]" />
          Trung tâm Tuân thủ
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Tổng quan tuân thủ của toàn đoàn
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-[hsl(var(--primary))]" />
            <div>
              <p className="text-2xl font-bold">{data.summary.total}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Tổng thành viên</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{data.summary.compliant}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Đạt tuân thủ</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{data.summary.nonCompliant}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Chưa đạt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700">{data.summary.complianceRate}%</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Tỉ lệ tuân thủ</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Violations list */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Thành viên cần xử lý ({data.violations.length})
          </h3>
          {data.violations.length > 0 ? (
            <div className="space-y-3">
              {data.violations.map((v) => (
                <div
                  key={v.memberId}
                  className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 p-3 cursor-pointer hover:bg-red-50 transition-colors"
                  onClick={() => router.push(`/members/${v.memberId}`)}
                >
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {v.memberName}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {v.issues.slice(0, 3).map((issue, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          {issue.split(':')[0]}
                        </Badge>
                      ))}
                      {v.issues.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{v.issues.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-700">
                Tất cả thành viên đều đạt tuân thủ!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
