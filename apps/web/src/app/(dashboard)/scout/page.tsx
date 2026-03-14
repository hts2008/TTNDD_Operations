'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Award,
  Shield,
  Target,
  TrendingUp,
  FileCheck,
  ChevronRight,
  Star,
  BookOpen,
  CheckCircle2,
  Clock,
  Upload,
} from 'lucide-react';

// Scout Dashboard — aggregated view of a member's rank, skills, and evidence

const MEMBER_STATS = {
  totalSkills: 6,
  completedSkills: 3,
  skillCompletionRate: 50,
  currentRank: { name: 'Thiếu Nhi 1 — Tân Binh', status: 'in_progress' },
  completedRanksCount: 1,
  pendingEvidence: 2,
  totalExp: 245,
};

const RECENT_EVIDENCE = [
  {
    id: '1',
    skillName: 'Nút Dây',
    level: 2,
    type: 'photo',
    status: 'submitted',
    date: '2026-03-10',
  },
  {
    id: '2',
    skillName: 'Sơ Cứu Cơ Bản',
    level: 1,
    type: 'mentor_sign_off',
    status: 'approved',
    date: '2026-03-05',
  },
  {
    id: '3',
    skillName: 'Ngũ Giới Cấm',
    level: 2,
    type: 'document',
    status: 'approved',
    date: '2026-02-28',
  },
];

const RANK_JOURNEY = [
  { name: 'Đồng Nhi 1 — Hạt Mầm', status: 'completed', date: '2025-06-15' },
  { name: 'Thiếu Nhi 1 — Tân Binh', status: 'in_progress', date: '2026-01-01' },
  { name: 'Thiếu Nhi 2 — Chiến Binh', status: 'locked', date: null },
];

const STATUS_MAP: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
  }
> = {
  submitted: { label: 'Chờ xét', variant: 'warning' },
  approved: { label: 'Đã duyệt', variant: 'success' },
  rejected: { label: 'Từ chối', variant: 'destructive' },
  completed: { label: 'Hoàn thành', variant: 'success' },
  in_progress: { label: 'Đang thực hiện', variant: 'default' },
  locked: { label: 'Chưa mở', variant: 'outline' },
};

export default function ScoutDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Shield className="h-8 w-8 text-amber-500" />
        Scout Dashboard
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Target className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Kỹ năng đạt</p>
                <p className="text-2xl font-bold">
                  {MEMBER_STATS.completedSkills}/{MEMBER_STATS.totalSkills}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Đẳng thứ</p>
                <p className="text-lg font-bold">Tân Binh</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Tiến trình</p>
                <p className="text-2xl font-bold">{MEMBER_STATS.skillCompletionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Tổng EXP</p>
                <p className="text-2xl font-bold">{MEMBER_STATS.totalExp}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rank Journey */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Hành trình Đẳng thứ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {RANK_JOURNEY.map((rank, i) => {
                const cfg = STATUS_MAP[rank.status] || STATUS_MAP.locked;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        rank.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : rank.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {rank.status === 'completed' ? '✓' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rank.name}</p>
                      {rank.date && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{rank.date}</p>
                      )}
                    </div>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>
                );
              })}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4" asChild>
              <a href="/skills">
                <BookOpen className="h-4 w-4 mr-1" />
                Xem Kỹ năng & Đẳng thứ chi tiết
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Evidence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-500" />
              Minh chứng gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            {RECENT_EVIDENCE.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                Chưa có minh chứng nào
              </p>
            ) : (
              <div className="space-y-3">
                {RECENT_EVIDENCE.map((ev) => {
                  const cfg = STATUS_MAP[ev.status] || STATUS_MAP.submitted;
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Upload className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {ev.skillName} — Lv.{ev.level}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {ev.type} • {ev.date}
                          </p>
                        </div>
                      </div>
                      <Badge variant={cfg.variant} className="shrink-0">
                        {cfg.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-4">
              <Upload className="h-4 w-4 mr-1" />
              Nộp minh chứng mới
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
