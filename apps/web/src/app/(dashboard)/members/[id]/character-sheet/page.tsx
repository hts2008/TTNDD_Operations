'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Zap,
  Award,
  Shield,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  Users,
  BarChart3,
} from 'lucide-react';
import { api } from '@/lib/api';

interface CharacterSheet {
  member: {
    id: string;
    memberCode: string;
    status: string;
    profile: { fullName: string; nickName: string | null; birthDate: string } | null;
    branch: { name: string } | null;
    unit: { name: string } | null;
    guardianLinks: { id: string; fullName: string; relation: string; isPrimary: boolean }[];
  };
  rewards: {
    totalExp: number;
    availableExp: number;
    badges: {
      id: string;
      name: string;
      imageUrl: string;
      badgeType: string | null;
      earnedAt: string;
    }[];
  };
  ranks: { id: string; status: string; startedAt: string | null; completedAt: string | null }[];
  attendance: Record<string, number>;
  compliance: { compliant: boolean; violations: string[] };
}

const STATUS_COLOR: Record<string, string> = {
  active: 'text-green-400',
  inactive: 'text-gray-400',
  suspended: 'text-red-400',
};

export default function CharacterSheetPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CharacterSheet>(`/hrm/members/${memberId}/character-sheet`)
      .then(setSheet)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-[hsl(var(--muted-foreground))]">
          Đang tải dữ liệu nhân vật...
        </div>
      </div>
    );

  if (error || !sheet)
    return (
      <div className="text-center py-20">
        <p className="text-[hsl(var(--destructive))]">{error || 'Không tìm thấy dữ liệu'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );

  const m = sheet.member;
  const totalAttendance = Object.values(sheet.attendance).reduce((s, v) => s + v, 0);
  const presentCount = sheet.attendance['present'] ?? 0;
  const attendanceRate =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        className="gap-2 -ml-2"
        onClick={() => router.push(`/members/${memberId}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại hồ sơ
      </Button>

      {/* ── Hero Card ───────────────────────────────────────── */}
      <Card className="overflow-hidden bg-gradient-to-br from-[hsl(var(--primary)/0.1)] to-[hsl(var(--card))]">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-2xl font-bold text-[hsl(var(--primary-foreground))] shrink-0 shadow-lg">
              {m.profile?.fullName?.split(' ').slice(-1)[0]?.charAt(0) ?? '?'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {m.profile?.fullName ?? m.memberCode}
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {m.memberCode} · {m.branch?.name ?? '—'} · {m.unit?.name ?? '—'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium ${STATUS_COLOR[m.status] ?? ''}`}>
                  ● {m.status.toUpperCase()}
                </span>
                {sheet.compliance.compliant ? (
                  <Badge variant="success" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3" /> Hợp quy
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 text-xs">
                    <XCircle className="h-3 w-3" /> Cần bổ sung
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-center rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <Zap className="h-5 w-5 text-amber-500 mb-1" />
                <span className="text-2xl font-bold text-amber-700">
                  {sheet.rewards.totalExp.toLocaleString()}
                </span>
                <span className="text-[10px] text-amber-600 uppercase tracking-wider">
                  Total EXP
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats Row ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 shrink-0">
            <Zap className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {sheet.rewards.availableExp.toLocaleString()}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">EXP khả dụng</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 shrink-0">
            <Award className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {sheet.rewards.badges.length}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Huy hiệu</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 shrink-0">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{sheet.ranks.length}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Đẳng cấp</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 shrink-0">
            <CalendarCheck className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{attendanceRate}%</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Tỷ lệ tham gia</p>
          </div>
        </Card>
      </div>

      {/* ── Badges Gallery ────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-purple-500" />
            Huy hiệu ({sheet.rewards.badges.length})
          </h2>
          {sheet.rewards.badges.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Chưa có huy hiệu nào</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {sheet.rewards.badges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-3"
                >
                  {b.imageUrl ? (
                    <img
                      src={b.imageUrl}
                      alt={b.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 shrink-0">
                      <Award className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                      {b.name}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {b.badgeType ?? 'Chung'} · {new Date(b.earnedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Guardian & Compliance ──────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-blue-500" />
              Phụ huynh / Người bảo hộ
            </h2>
            {m.guardianLinks.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Chưa có thông tin phụ huynh
              </p>
            ) : (
              <div className="space-y-2">
                {m.guardianLinks.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {g.fullName}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">
                        {g.relation}
                      </p>
                    </div>
                    {g.isPrimary && (
                      <Badge variant="default" className="text-xs">
                        Chính
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Tuân thủ / Compliance
            </h2>
            {sheet.compliance.compliant ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                <p className="text-sm font-medium text-green-700">Đạt yêu cầu tuân thủ đầy đủ</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sheet.compliance.violations.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
                  >
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Attendance Breakdown ───────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] flex items-center gap-2 mb-4">
            <CalendarCheck className="h-5 w-5 text-indigo-500" />
            Thống kê điểm danh
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {Object.entries(sheet.attendance).map(([status, count]) => (
              <div
                key={status}
                className="rounded-lg border border-[hsl(var(--border))] p-3 text-center"
              >
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{count}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">{status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
