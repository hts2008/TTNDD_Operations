'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Inbox,
  Eye,
  Clock,
  FileText,
} from 'lucide-react';

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

interface ParentData {
  children: (ChildInfo & { compliance: ComplianceInfo })[];
  accessLogs: { timestamp: string; action: string; resource: string }[];
}

export default function ParentPortalPage() {
  const [data, setData] = useState<ParentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Fetch linked children for current guardian user
        const res = await fetch('/api/v1/hrm/parent-portal/dashboard');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được dữ liệu');
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
        <span className="ml-3 text-sm text-[hsl(var(--muted-foreground))]">
          Đang tải cổng phụ huynh...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center mx-auto max-w-md">
        <AlertCircle className="h-10 w-10 text-[hsl(var(--destructive))] mb-3" />
        <p className="text-sm font-medium text-[hsl(var(--destructive))]">{error}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          Vui lòng thử lại hoặc liên hệ quản trị viên.
        </p>
      </Card>
    );
  }

  if (!data || data.children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Users className="h-6 w-6 text-[hsl(var(--primary))]" />
            Cổng Phụ huynh
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Theo dõi hoạt động con em</p>
        </div>
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-10 w-10 text-[hsl(var(--muted-foreground))] mb-3" />
          <p className="text-sm font-medium">Chưa có thông tin con em</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Liên hệ quản đoàn để liên kết tài khoản.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
          <Users className="h-6 w-6 text-[hsl(var(--primary))]" />
          Cổng Phụ huynh
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Theo dõi hoạt động và tuân thủ của con em ({data.children.length} em)
        </p>
      </div>

      {/* Children cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.children.map((child) => (
          <Card key={child.id} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">
                    {child.profile?.fullName || 'Chưa có tên'}
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {child.memberCode || '—'} • {child.branch?.name || '—'} •{' '}
                    {child.unit?.name || '—'}
                  </p>
                </div>
                <Badge variant={child.status === 'active' ? 'success' : 'secondary'}>
                  {child.status === 'active' ? 'Hoạt động' : child.status}
                </Badge>
              </div>

              {/* Compliance status */}
              <div
                className={`rounded-lg p-3 ${child.compliance.compliant ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
              >
                <div className="flex items-center gap-2">
                  {child.compliance.compliant ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${child.compliance.compliant ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {child.compliance.compliant
                      ? 'Đạt tuân thủ'
                      : `${child.compliance.violations.length} vấn đề`}
                  </span>
                </div>
                {!child.compliance.compliant && child.compliance.violations.length > 0 && (
                  <p className="text-xs text-red-600 mt-1">{child.compliance.violations[0]}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data access logs — COPPA compliance */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2 mb-4">
            <Eye className="h-4 w-4" />
            Nhật ký truy cập dữ liệu
          </h3>
          {data.accessLogs.length > 0 ? (
            <div className="space-y-2">
              {data.accessLogs.slice(0, 20).map((log, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm rounded-lg border border-[hsl(var(--border))] p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-[hsl(var(--foreground))]">{log.action}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      — {log.resource}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <Clock className="h-3 w-3" />
                    {new Date(log.timestamp).toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
              Chưa có nhật ký truy cập
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
