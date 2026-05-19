'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  CheckCircle2,
  FileCheck,
  Loader2,
  RefreshCw,
  Shield,
  Star,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface SkillProgress {
  skillId: string;
  currentLevel: number;
  completedAt?: string | null;
  verifiedLevels?: Record<string, boolean>;
  skill: {
    id: string;
    name: string;
    skillCode: string;
    maxLevel: number;
    skillGroup?: { name?: string | null; icon?: string | null; color?: string | null };
  };
}

interface MemberRank {
  id: string;
  rankId: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  allowedActions?: string[];
  rank: {
    rankName: string;
    rankCode: string;
    narrativeName?: string | null;
    rankOrder: number;
  };
}

interface SkillEvidence {
  id: string;
  skillId: string;
  level: number;
  evidenceType: string;
  evidenceUrl?: string | null;
  fileRefId?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  skill?: { name: string; skillCode: string };
}

interface ScoutDashboard {
  memberId: string;
  stats: {
    totalSkills: number;
    completedSkills: number;
    skillCompletionRate: number;
    currentRank?: MemberRank | null;
    completedRanksCount: number;
  };
  skillProgress: SkillProgress[];
  memberRanks: MemberRank[];
  recentEvidence: SkillEvidence[];
}

const STATUS_CLASS: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  eligible: 'bg-purple-100 text-purple-700 border-purple-200',
  proposed: 'bg-violet-100 text-violet-700 border-violet-200',
  locked: 'bg-gray-100 text-gray-600 border-gray-200',
};

function statusClass(status: string) {
  return STATUS_CLASS[status] ?? 'bg-gray-100 text-gray-700 border-gray-200';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

export default function ScoutDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const memberId = user?.memberId;

  const [dashboard, setDashboard] = useState<ScoutDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceSkillId, setEvidenceSkillId] = useState('');
  const [evidenceLevel, setEvidenceLevel] = useState('1');
  const [evidenceType, setEvidenceType] = useState('document');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [busyRankId, setBusyRankId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrate, hydrated]);

  const loadDashboard = useCallback(async () => {
    if (!memberId) {
      setDashboard(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ScoutDashboard>(`/scout/dashboard/${memberId}`);
      setDashboard(data);
      setEvidenceSkillId((current) => current || data.skillProgress[0]?.skillId || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc scout dashboard');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const currentRankName =
    dashboard?.stats.currentRank?.rank.narrativeName ||
    dashboard?.stats.currentRank?.rank.rankName ||
    '-';
  const sortedRanks = useMemo(
    () => [...(dashboard?.memberRanks ?? [])].sort((a, b) => a.rank.rankOrder - b.rank.rankOrder),
    [dashboard?.memberRanks],
  );

  async function submitEvidence() {
    if (!memberId || !evidenceSkillId || submittingEvidence) return;
    setSubmittingEvidence(true);
    setError(null);
    setStatus(null);
    try {
      await api.post(`/scout/evidence/${memberId}`, {
        skillId: evidenceSkillId,
        level: Number(evidenceLevel),
        evidenceType,
        evidenceUrl: evidenceUrl.trim() || undefined,
        notes: evidenceNotes.trim() || undefined,
      });
      setEvidenceUrl('');
      setEvidenceNotes('');
      setShowEvidenceForm(false);
      setStatus('Da nop minh chung.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong nop duoc minh chung');
    } finally {
      setSubmittingEvidence(false);
    }
  }

  async function transitionRank(rank: MemberRank, action: string) {
    if (!memberId || busyRankId) return;
    setBusyRankId(rank.rankId);
    setError(null);
    setStatus(null);
    try {
      await api.post(`/scout/member-ranks/${memberId}/transition`, { rankId: rank.rankId, action });
      setStatus(`Da thuc hien rank action ${action}.`);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong transition duoc rank');
    } finally {
      setBusyRankId(null);
    }
  }

  async function checkEligibility() {
    if (!memberId) return;
    setError(null);
    setStatus(null);
    try {
      await api.post(`/scout/member-ranks/${memberId}/check-eligibility`);
      setStatus('Da chay eligibility check.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong check eligibility duoc');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Shield className="h-8 w-8 text-amber-500" />
            Scout Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aggregated member rank, skill, and evidence data from Scout APIs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadDashboard} disabled={loading || !memberId}>
            <RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" onClick={checkEligibility} disabled={!memberId}>
            Check eligibility
          </Button>
          <Button onClick={() => setShowEvidenceForm((value) => !value)} disabled={!memberId}>
            <Upload className="mr-1 h-4 w-4" />
            Submit evidence
          </Button>
        </div>
      </div>

      {!memberId && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Tai khoan hien tai chua co memberId, khong the tai Scout dashboard ca nhan.
        </div>
      )}

      {(error || status) && (
        <div
          className={cn(
            'rounded-md border px-4 py-3 text-sm',
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
          )}
        >
          {error ?? status}
        </div>
      )}

      {showEvidenceForm && dashboard && (
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_110px_140px_minmax(0,1fr)_auto]">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={evidenceSkillId}
              onChange={(event) => setEvidenceSkillId(event.target.value)}
            >
              {dashboard.skillProgress.map((progress) => (
                <option key={progress.skillId} value={progress.skillId}>
                  {progress.skill.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={evidenceLevel}
              onChange={(event) => setEvidenceLevel(event.target.value)}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={evidenceType}
              onChange={(event) => setEvidenceType(event.target.value)}
            >
              <option value="document">Document</option>
              <option value="photo">Photo URL</option>
              <option value="mentor_sign_off">Mentor sign-off</option>
              <option value="video">Video URL</option>
            </select>
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Evidence URL or notes"
              value={evidenceUrl || evidenceNotes}
              onChange={(event) => {
                setEvidenceUrl(event.target.value);
                setEvidenceNotes(event.target.value);
              }}
            />
            <Button disabled={!evidenceSkillId || submittingEvidence} onClick={submitEvidence}>
              {submittingEvidence ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1 h-4 w-4" />
              )}
              Submit
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : dashboard ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Target className="h-5 w-5 text-indigo-600" />}
              label="Skills completed"
              value={`${dashboard.stats.completedSkills}/${dashboard.stats.totalSkills}`}
              tone="indigo"
            />
            <StatCard
              icon={<Award className="h-5 w-5 text-amber-600" />}
              label="Current rank"
              value={currentRankName}
              tone="amber"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
              label="Skill progress"
              value={`${dashboard.stats.skillCompletionRate}%`}
              tone="emerald"
            />
            <StatCard
              icon={<Star className="h-5 w-5 text-purple-600" />}
              label="Completed ranks"
              value={dashboard.stats.completedRanksCount}
              tone="purple"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-500" />
                  Rank journey
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedRanks.length === 0 ? (
                  <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    Chua co rank progression.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {sortedRanks.map((rank, index) => (
                      <div key={rank.id} className="rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                              rank.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : rank.status === 'in_progress'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-500',
                            )}
                          >
                            {rank.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {rank.rank.narrativeName || rank.rank.rankName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(rank.startedAt)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn('border', statusClass(rank.status))}
                          >
                            {rank.status}
                          </Badge>
                        </div>
                        {rank.allowedActions?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {rank.allowedActions.map((action) => (
                              <Button
                                key={action}
                                size="sm"
                                variant="outline"
                                disabled={busyRankId === rank.rankId}
                                onClick={() => transitionRank(rank, action)}
                              >
                                {busyRankId === rank.rankId ? 'Dang xu ly' : action}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/skills">
                  <Button variant="outline" className="mt-4 w-full">
                    <BookOpen className="mr-1 h-4 w-4" />
                    Xem ky nang chi tiet
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-500" />
                  Recent evidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.recentEvidence.length === 0 ? (
                  <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    Chua co minh chung nao.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dashboard.recentEvidence.map((evidence) => (
                      <div
                        key={evidence.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {evidence.skill?.name ?? evidence.skillId} - Lv.{evidence.level}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {evidence.evidenceType} - {formatDate(evidence.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 border', statusClass(evidence.status))}
                        >
                          {evidence.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Khong co scout dashboard data.
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: 'indigo' | 'amber' | 'emerald' | 'purple';
}) {
  const toneClass = {
    indigo: 'bg-indigo-100',
    amber: 'bg-amber-100',
    emerald: 'bg-emerald-100',
    purple: 'bg-purple-100',
  }[tone];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-lg p-2.5', toneClass)}>{icon}</div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
