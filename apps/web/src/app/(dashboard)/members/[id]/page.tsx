'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageError, PageLoading } from '@/components/ui/page-states';
import { MetricTile, NextActionList, ProgressMeter } from '@/components/ui/progression';
import { Tabs } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface MemberDetail {
  id: string;
  memberCode: string | null;
  scoutName: string | null;
  heroName: string | null;
  status: string;
  role: string;
  createdAt: string;
  user: {
    displayName: string | null;
    email: string | null;
    phone: string | null;
  };
  branch: { name: string; code?: string | null } | null;
  unit: { name: string } | null;
  profile: {
    fullName: string;
    birthDate: string | null;
    gender: string | null;
    address: string | null;
    personalPhone: string | null;
    personalEmail: string | null;
    emergencyContact: string | null;
    healthNotes: string | null;
  } | null;
  guardianLinks: {
    id: string;
    fullName: string;
    relation: string;
    phone: string | null;
    consentSigned: boolean;
    isPrimary: boolean;
  }[];
}

interface RankProgress {
  id: string;
  status: string;
  startedAt?: string | null;
  completedAt: string | null;
  rank?: {
    rankCode: string;
    rankName: string;
    narrativeName: string | null;
    rankOrder: number;
    minExp: number;
  };
}

interface SkillProgress {
  id: string;
  currentLevel: number;
  completedAt: string | null;
  skill: {
    name: string;
    skillCode: string;
    maxLevel: number;
    spicesTags: string[];
    skillGroup: { name: string; icon: string | null; color: string | null } | null;
  };
}

interface CourseProgress {
  id: string;
  status: string;
  progressPct: number;
  completedAt: string | null;
  course: {
    id: string;
    title: string;
    category: string | null;
    difficulty: string | null;
    expReward: number;
    spicesTags?: string[];
  };
}

interface RecentAttendance {
  id: string;
  status: string;
  checkInTime: string | null;
  session: {
    title: string;
    sessionDate: string;
    sessionType: string | null;
    location: string | null;
    spicesTags: string[];
  };
}

interface NextAction {
  type?: string;
  label: string;
  href?: string;
  priority?: string;
}

interface CharacterSheet {
  member: MemberDetail;
  rewards: {
    totalExp: number;
    availableExp: number;
    badges: { id: string; name: string; badgeType: string; earnedAt: string }[];
  };
  progression: {
    currentRank: RankProgress | null;
    completedRanks: number;
    skillsStarted: number;
    skillsCompleted: number;
    skillCompletionRate: number;
    coursesStarted: number;
    coursesActive: number;
    coursesCompleted: number;
  };
  ranks: RankProgress[];
  skills: SkillProgress[];
  courses: CourseProgress[];
  attendance: Record<string, number>;
  recentAttendance: RecentAttendance[];
  compliance: { compliant: boolean; violations: string[] };
  nextActions: NextAction[];
  allowedActions: string[];
}

const STATUS_MAP = {
  active: { label: 'Hoat dong', variant: 'success' as const },
  pending: { label: 'Cho duyet', variant: 'warning' as const },
  inactive: { label: 'Tam ngung', variant: 'secondary' as const },
  suspended: { label: 'Dinh chi', variant: 'destructive' as const },
  transferred: { label: 'Chuyen doan', variant: 'secondary' as const },
  left: { label: 'Roi doan', variant: 'secondary' as const },
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function attendanceRate(attendance: Record<string, number>) {
  const total = Object.values(attendance).reduce((sum, value) => sum + value, 0);
  if (total === 0) return 0;
  return Math.round(((attendance.present ?? 0) / total) * 100);
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
        <p className="break-words text-sm font-medium text-[hsl(var(--foreground))]">{value}</p>
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: CharacterSheet }) {
  const currentRank = data.progression.currentRank?.rank;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
      <Card className="border-[hsl(var(--border))]">
        <CardHeader>
          <CardTitle className="text-lg">Lo trinh tien bo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ProgressMeter
            label="Ky nang da hoan thanh"
            value={data.progression.skillCompletionRate}
            detail={`${data.progression.skillsCompleted}/${data.progression.skillsStarted} ky nang dang theo doi`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {data.skills.slice(0, 6).map((skill) => (
              <div key={skill.id} className="rounded-lg border border-[hsl(var(--border))] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      {skill.skill.name}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {skill.skill.skillGroup?.name || 'Ky nang'} / {skill.skill.skillCode}
                    </p>
                  </div>
                  <Badge variant={skill.completedAt ? 'success' : 'secondary'}>
                    Lv.{skill.currentLevel}/{skill.skill.maxLevel}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {data.skills.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Chua bat dau ky nang nao. Mo trang Scout de khoi tao lo trinh.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Viec can lam tiep</CardTitle>
          </CardHeader>
          <CardContent>
            <NextActionList actions={data.nextActions} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dang thu hien tai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-amber-950">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                {currentRank?.rankCode || 'no-rank'}
              </p>
              <p className="mt-1 text-xl font-bold">
                {currentRank?.narrativeName || currentRank?.rankName || 'Chua co dang thu'}
              </p>
              <p className="mt-2 text-sm text-amber-800">
                {data.progression.completedRanks} dang thu da hoan thanh / min EXP:{' '}
                {currentRank?.minExp ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileTab({ data }: { data: CharacterSheet }) {
  const profile = data.member.profile;
  const member = data.member;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ho so thanh vien</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={profile?.personalEmail || member.user.email || '-'}
          />
          <Field
            icon={<Phone className="h-4 w-4" />}
            label="Dien thoai"
            value={profile?.personalPhone || member.user.phone || '-'}
          />
          <Field
            icon={<MapPin className="h-4 w-4" />}
            label="Dia chi"
            value={profile?.address || '-'}
          />
          <Field
            icon={<Calendar className="h-4 w-4" />}
            label="Ngay sinh"
            value={formatDate(profile?.birthDate)}
          />
          <Field
            icon={<Shield className="h-4 w-4" />}
            label="Lien he khan"
            value={profile?.emergencyContact || '-'}
          />
          <Field
            icon={<Users className="h-4 w-4" />}
            label="Gia nhap"
            value={formatDate(member.createdAt)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Phu huynh / giam ho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {member.guardianLinks.map((guardian) => (
            <div key={guardian.id} className="rounded-lg border border-[hsl(var(--border))] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {guardian.fullName}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {guardian.relation} / {guardian.phone || 'chua co SDT'}
                  </p>
                </div>
                <Badge variant={guardian.consentSigned ? 'success' : 'warning'}>
                  {guardian.consentSigned ? 'Da dong thuan' : 'Can dong thuan'}
                </Badge>
              </div>
            </div>
          ))}
          {member.guardianLinks.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Chua co guardian link cho thanh vien nay.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LearningTab({ data }: { data: CharacterSheet }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Khoa hoc LMS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.courses.map((course) => (
            <div key={course.id} className="rounded-lg border border-[hsl(var(--border))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {course.course.title}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {course.course.category || 'course'} / {course.course.difficulty || 'standard'}{' '}
                    / +{course.course.expReward} EXP
                  </p>
                </div>
                <Badge variant={course.status === 'completed' ? 'success' : 'secondary'}>
                  {course.status}
                </Badge>
              </div>
              <div className="mt-3">
                <ProgressMeter
                  label="Tien do khoa hoc"
                  value={course.progressPct}
                  detail={
                    course.completedAt ? `Hoan thanh ${formatDate(course.completedAt)}` : undefined
                  }
                />
              </div>
            </div>
          ))}
          {data.courses.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Chua ghi nhan khoa hoc LMS cho thanh vien nay.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">EXP va huy hieu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MetricTile
            icon={<Zap className="h-5 w-5" />}
            label="EXP kha dung"
            value={data.rewards.availableExp.toLocaleString()}
            detail={`Tong ${data.rewards.totalExp.toLocaleString()} EXP`}
            tone="gold"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {data.rewards.badges.slice(0, 8).map((badge) => (
              <div key={badge.id} className="rounded-lg border border-[hsl(var(--border))] p-3">
                <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{badge.name}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {badge.badgeType} / {formatDate(badge.earnedAt)}
                </p>
              </div>
            ))}
          </div>
          {data.rewards.badges.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Chua co huy hieu nao.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SafetyTab({ data }: { data: CharacterSheet }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tuan thu va an toan</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'rounded-lg border p-4',
              data.compliance.compliant
                ? 'border-emerald-100 bg-emerald-50 text-emerald-950'
                : 'border-rose-100 bg-rose-50 text-rose-950',
            )}
          >
            <div className="flex items-start gap-3">
              {data.compliance.compliant ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Shield className="h-5 w-5 text-rose-600" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {data.compliance.compliant ? 'Ho so dang tuan thu' : 'Can xu ly tuan thu'}
                </p>
                <p className="mt-1 text-xs opacity-75">
                  {data.compliance.compliant
                    ? 'Khong co canh bao compliance bat buoc.'
                    : `${data.compliance.violations.length} van de can xu ly.`}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {data.compliance.violations.map((violation, index) => (
              <div
                key={`${violation}-${index}`}
                className="rounded-lg border border-rose-100 bg-rose-50/60 p-3 text-sm text-rose-900"
              >
                {violation}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Diem danh gan day</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recentAttendance.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-[hsl(var(--border))] p-3"
            >
              <div>
                <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  {entry.session.title}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {formatDate(entry.session.sessionDate)} /{' '}
                  {entry.session.location || 'chua co dia diem'}
                </p>
              </div>
              <Badge
                variant={
                  entry.status === 'present'
                    ? 'success'
                    : entry.status === 'absent'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {entry.status}
              </Badge>
            </div>
          ))}
          {data.recentAttendance.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Chua co lich su diem danh.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<CharacterSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMember = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<CharacterSheet>(`/hrm/members/${id}/character-sheet`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc ho so thanh vien');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadMember();
  }, [loadMember]);

  const tabs = useMemo(() => {
    if (!data) return [];
    return [
      { value: 'overview', label: 'Lo trinh', content: <OverviewTab data={data} /> },
      { value: 'profile', label: 'Ho so', content: <ProfileTab data={data} /> },
      { value: 'learning', label: 'Hoc tap & EXP', content: <LearningTab data={data} /> },
      { value: 'safety', label: 'An toan', content: <SafetyTab data={data} /> },
    ];
  }, [data]);

  if (loading) return <PageLoading message="Dang tai character sheet..." />;
  if (error || !data) {
    return (
      <PageError
        title="Khong tai duoc ho so thanh vien"
        message={error || 'Khong tim thay thanh vien'}
        onRetry={loadMember}
      />
    );
  }

  const member = data.member;
  const status = STATUS_MAP[member.status as keyof typeof STATUS_MAP] ?? {
    label: member.status,
    variant: 'secondary' as const,
  };
  const fullName =
    member.profile?.fullName || member.user.displayName || member.scoutName || 'Thanh vien';
  const rankName =
    data.progression.currentRank?.rank?.narrativeName ||
    data.progression.currentRank?.rank?.rankName ||
    'Chua co dang thu';
  const presentRate = attendanceRate(data.attendance);

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="-ml-2 gap-2" onClick={() => router.push('/members')}>
        <ArrowLeft className="h-4 w-4" />
        Quay lai danh sach
      </Button>

      <Card className="overflow-hidden border-[hsl(var(--border))]">
        <CardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-[hsl(var(--border))] p-6 lg:border-b-0 lg:border-r">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-xl font-bold text-[hsl(var(--primary-foreground))]">
                  {fullName.trim().slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-2xl font-bold text-[hsl(var(--foreground))]">
                      {fullName}
                    </h1>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    {member.memberCode || 'no-code'} / {member.branch?.name || 'no-branch'} /{' '}
                    {member.unit?.name || 'no-unit'} / {member.role}
                  </p>
                  <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                    {member.scoutName || 'Chua co scout name'}
                    {member.heroName ? ` / Anh hung: ${member.heroName}` : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-6 sm:grid-cols-2">
              <MetricTile
                icon={<Trophy className="h-5 w-5" />}
                label="Dang thu"
                value={rankName}
                detail={`${data.progression.completedRanks} completed`}
                tone="gold"
              />
              <MetricTile
                icon={<Zap className="h-5 w-5" />}
                label="EXP"
                value={data.rewards.totalExp.toLocaleString()}
                detail={`${data.rewards.availableExp.toLocaleString()} kha dung`}
                tone="emerald"
              />
              <MetricTile
                icon={<Target className="h-5 w-5" />}
                label="Ky nang"
                value={`${data.progression.skillsCompleted}/${data.progression.skillsStarted}`}
                detail={`${data.progression.skillCompletionRate}% hoan thanh`}
                tone="sky"
              />
              <MetricTile
                icon={<Clock3 className="h-5 w-5" />}
                label="Diem danh"
                value={`${presentRate}%`}
                detail={`${data.attendance.present ?? 0} buoi co mat`}
                tone={presentRate >= 80 ? 'emerald' : 'rose'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Link
          className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-sm font-medium transition-colors hover:border-[hsl(var(--primary))]"
          href="/scout"
        >
          <Shield className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
          Scout evidence
        </Link>
        <Link
          className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-sm font-medium transition-colors hover:border-[hsl(var(--primary))]"
          href="/skills"
        >
          <Sparkles className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
          Skill matrix
        </Link>
        <Link
          className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-sm font-medium transition-colors hover:border-[hsl(var(--primary))]"
          href="/lms"
        >
          <BookOpen className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
          LMS courses
        </Link>
        <Link
          className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-sm font-medium transition-colors hover:border-[hsl(var(--primary))]"
          href="/rewards"
        >
          <Award className="mb-2 h-5 w-5 text-[hsl(var(--primary))]" />
          Rewards ledger
        </Link>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <Tabs tabs={tabs} defaultValue="overview" />
        </CardContent>
      </Card>
    </div>
  );
}
