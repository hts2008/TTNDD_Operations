'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

type SkillStatus = 'not_started' | 'in_progress' | 'verified' | 'awarded';

interface Skill {
  id: string;
  skillCode: string;
  name: string;
  narrativeName?: string | null;
  description?: string | null;
  maxLevel: number;
  isRequired?: boolean;
  expPerLevel?: number;
  requiredForRankId?: string | null;
}

interface SkillGroup {
  id: string;
  name: string;
  narrativeName?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  skills: Skill[];
}

interface SkillProgress {
  id: string;
  skillId: string;
  currentLevel: number;
  completedAt?: string | null;
  verifiedLevels?: Record<string, boolean>;
}

interface RankDefinition {
  id: string;
  rankName: string;
  narrativeName?: string | null;
  rankCode: string;
  rankOrder: number;
  minExp?: number | null;
}

interface MemberRank {
  rankId: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  rank: RankDefinition;
}

const STATUS_CONFIG: Record<
  SkillStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
    icon: typeof Lock;
  }
> = {
  not_started: { label: 'Chua bat dau', variant: 'outline', icon: Lock },
  in_progress: { label: 'Dang hoc', variant: 'warning', icon: Clock },
  verified: { label: 'Da xac nhan', variant: 'default', icon: CheckCircle2 },
  awarded: { label: 'Da dat', variant: 'success', icon: Award },
};

function getVerifiedLevelCount(progress?: SkillProgress) {
  if (!progress?.verifiedLevels) return 0;
  return Object.values(progress.verifiedLevels).filter(Boolean).length;
}

function getSkillStatus(skill: Skill, progress?: SkillProgress): SkillStatus {
  if (!progress) return 'not_started';
  if (progress.completedAt || progress.currentLevel >= skill.maxLevel) return 'awarded';
  if (getVerifiedLevelCount(progress) > 0) return 'verified';
  return 'in_progress';
}

function progressPercent(skill: Skill, progress?: SkillProgress) {
  if (!progress || !skill.maxLevel) return 0;
  return Math.min(100, Math.round((progress.currentLevel / skill.maxLevel) * 100));
}

function rankLabel(rank?: RankDefinition | null) {
  if (!rank) return '-';
  return rank.narrativeName || rank.rankName;
}

export default function SkillsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const memberId = user?.memberId;

  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [progress, setProgress] = useState<SkillProgress[]>([]);
  const [ranks, setRanks] = useState<RankDefinition[]>([]);
  const [memberRanks, setMemberRanks] = useState<MemberRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busySkillId, setBusySkillId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrate, hydrated]);

  const load = useCallback(async () => {
    if (!memberId) {
      setSkillGroups([]);
      setProgress([]);
      setRanks([]);
      setMemberRanks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [groups, progressRows, rankRows, memberRankRows] = await Promise.all([
        api.get<SkillGroup[]>('/scout/skill-groups'),
        api.get<SkillProgress[]>(`/scout/progress/${memberId}`),
        api.get<RankDefinition[]>('/scout/ranks'),
        api.get<MemberRank[]>(`/scout/member-ranks/${memberId}`),
      ]);
      setSkillGroups(groups);
      setProgress(progressRows);
      setRanks(rankRows);
      setMemberRanks(memberRankRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc du lieu ky nang');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const progressBySkill = useMemo(
    () => new Map(progress.map((row) => [row.skillId, row])),
    [progress],
  );

  const allSkills = useMemo(() => skillGroups.flatMap((group) => group.skills), [skillGroups]);

  const completedSkillCount = allSkills.filter((skill) => {
    const statusValue = getSkillStatus(skill, progressBySkill.get(skill.id));
    return statusValue === 'awarded' || statusValue === 'verified';
  }).length;
  const totalSkillCount = allSkills.length;
  const overallProgress = totalSkillCount
    ? Math.round((completedSkillCount / totalSkillCount) * 100)
    : 0;

  const sortedRanks = useMemo(() => [...ranks].sort((a, b) => a.rankOrder - b.rankOrder), [ranks]);
  const sortedMemberRanks = useMemo(
    () => [...memberRanks].sort((a, b) => b.rank.rankOrder - a.rank.rankOrder),
    [memberRanks],
  );
  const currentMemberRank =
    sortedMemberRanks.find((row) => row.status !== 'locked') ?? sortedMemberRanks[0] ?? null;
  const currentRank =
    currentMemberRank?.rank ??
    sortedRanks.find((rank) => memberRanks.some((row) => row.rankId === rank.id)) ??
    sortedRanks[0] ??
    null;
  const nextRank =
    currentRank && sortedRanks.find((rank) => rank.rankOrder > currentRank.rankOrder);
  const requiredForNextRank = nextRank
    ? allSkills.filter((skill) => skill.requiredForRankId === nextRank.id || skill.isRequired)
    : [];

  async function startSkill(skillId: string) {
    if (!memberId || busySkillId) return;
    setBusySkillId(skillId);
    setError(null);
    setStatus(null);
    try {
      await api.post(`/scout/progress/${memberId}/start`, { skillId });
      setStatus('Da bat dau ky nang.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong bat dau duoc ky nang');
    } finally {
      setBusySkillId(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Award className="h-8 w-8 text-indigo-500" />
            Ky nang & Dang thu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo doi cay ky nang, tien do dang thu va cac buoc can hoan thanh.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading || !memberId}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Tai lai
          </Button>
          <Link
            href="/scout"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Minh chung Scout
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {status && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {status}
        </div>
      )}

      {!memberId && !loading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Tai khoan hien tai chua co memberId nen khong the tai tien do ky nang.
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50">
        <CardHeader>
          <CardTitle className="text-indigo-800">Tien trinh dang thu</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-indigo-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Dang tai tien do...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-indigo-600">Dang thu hien tai</p>
                <p className="text-2xl font-bold text-indigo-800">{rankLabel(currentRank)}</p>
                <p className="text-sm text-indigo-500">
                  {currentMemberRank?.status
                    ? `Trang thai: ${currentMemberRank.status}`
                    : 'Chua co dang thu dang theo doi'}
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-indigo-600">Tien trinh ky nang</p>
                <div className="h-4 w-full overflow-hidden rounded-full bg-indigo-200">
                  <div
                    className="h-4 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-all duration-500"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <p className="mt-1 flex justify-between text-xs text-indigo-600">
                  <span>
                    {completedSkillCount}/{totalSkillCount} ky nang
                  </span>
                  <span>{overallProgress}%</span>
                  <span>{rankLabel(nextRank ?? null)}</span>
                </p>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-indigo-600">Yeu cau cap tiep</p>
                {nextRank ? (
                  <ul className="space-y-1">
                    <li className="flex items-start gap-1.5 text-sm text-indigo-700">
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
                      Dat {rankLabel(nextRank)}
                      {nextRank.minExp ? ` va toi thieu ${nextRank.minExp} EXP` : ''}
                    </li>
                    <li className="flex items-start gap-1.5 text-sm text-indigo-700">
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
                      Hoan thanh {requiredForNextRank.length || 'cac'} ky nang lien quan
                    </li>
                  </ul>
                ) : (
                  <p className="text-sm text-indigo-700">
                    Khong co rank tiep theo trong du lieu hien tai.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Dang tai cay ky nang...
          </CardContent>
        </Card>
      ) : skillGroups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Chua co skill group trong du lieu pilot.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tao seed Scout hoac them skill group tu API de hien thi cay ky nang.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {skillGroups.map((group) => {
            const completed = group.skills.filter((skill) => {
              const statusValue = getSkillStatus(skill, progressBySkill.get(skill.id));
              return statusValue === 'awarded' || statusValue === 'verified';
            }).length;
            const groupProgress = group.skills.length
              ? Math.round((completed / group.skills.length) * 100)
              : 0;

            return (
              <Card key={group.id} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-indigo-50 text-lg">
                      {group.icon || <BookOpen className="h-5 w-5 text-indigo-600" />}
                    </span>
                    {group.narrativeName || group.name}
                  </CardTitle>
                  {group.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {group.description}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {completed}/{group.skills.length} hoan thanh
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${groupProgress}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {group.skills.map((skill) => {
                      const row = progressBySkill.get(skill.id);
                      const statusValue = getSkillStatus(skill, row);
                      const cfg = STATUS_CONFIG[statusValue];
                      const Icon = cfg.icon;
                      const skillProgressPercent = progressPercent(skill, row);

                      return (
                        <li key={skill.id} className="space-y-2 rounded-md border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-2">
                              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {skill.narrativeName || skill.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {skill.description || skill.skillCode}
                                </p>
                              </div>
                            </div>
                            <Badge variant={cfg.variant} className="shrink-0 text-[10px]">
                              {cfg.label}
                            </Badge>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-indigo-500"
                              style={{ width: `${skillProgressPercent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                              Level {row?.currentLevel ?? 0}/{skill.maxLevel}
                            </span>
                            {statusValue === 'not_started' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startSkill(skill.id)}
                                disabled={!memberId || busySkillId === skill.id}
                              >
                                {busySkillId === skill.id ? (
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <BookOpen className="mr-1 h-3.5 w-3.5" />
                                )}
                                Bat dau
                              </Button>
                            ) : (
                              <Link
                                href="/scout"
                                className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                              >
                                Nop minh chung
                              </Link>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
