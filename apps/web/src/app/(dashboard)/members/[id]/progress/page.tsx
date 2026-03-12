'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface PersonalDashboard {
  memberId: string;
  skillProgress: { total: number; verified: number; pct: number };
  currentRank: { rank?: { rankName: string; rankCode: string }; status: string; startedAt?: string } | null;
  achievements: number;
  serviceHours: number;
  habitCheckIns: number;
}

interface SkillProgress {
  id: string;
  orgMemberId: string;
  skillId: string;
  status: string;
  currentLevel: number;
  skill?: { name: string; domainId: string; skillCode: string; maxLevel: number; isRequired: boolean };
}

interface SkillGroup {
  id: string;
  name: string;
  icon?: string;
  skills: { id: string; name: string; skillCode: string; maxLevel: number; isRequired: boolean }[];
}

// ═══════════════════════════════════════════════════════════
// Stat Card
// ═══════════════════════════════════════════════════════════

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`${color} rounded-xl p-4 border border-zinc-700/50`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-zinc-400">{label}</p>
          {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Skill Gap Analysis (T-0085)
// ═══════════════════════════════════════════════════════════

function SkillGapSection({
  groups,
  progress,
}: {
  groups: SkillGroup[];
  progress: SkillProgress[];
}) {
  const progressMap = new Map<string, SkillProgress>();
  progress.forEach((p) => progressMap.set(p.skillId, p));

  // Find missing/incomplete skills
  const gaps: { skill: { name: string; skillCode: string; maxLevel: number; isRequired: boolean }; group: string; currentLevel: number; status: string }[] = [];

  groups.forEach((g) => {
    g.skills.forEach((s) => {
      const p = progressMap.get(s.id);
      if (!p || p.status !== 'verified') {
        gaps.push({
          skill: s,
          group: g.name,
          currentLevel: p?.currentLevel ?? 0,
          status: p?.status ?? 'not_started',
        });
      }
    });
  });

  // Sort: required first, then by status
  gaps.sort((a, b) => {
    if (a.skill.isRequired !== b.skill.isRequired) return a.skill.isRequired ? -1 : 1;
    return a.currentLevel - b.currentLevel;
  });

  if (gaps.length === 0) {
    return (
      <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-xl p-6 text-center">
        <span className="text-3xl">🎉</span>
        <p className="text-emerald-300 font-medium mt-2">Tất cả kỹ năng đã được xác nhận!</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-700/50">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          💡 Kỹ năng cần hoàn thiện
          <span className="text-xs bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full">
            {gaps.length} kỹ năng
          </span>
        </h3>
      </div>
      <div className="divide-y divide-zinc-700/30 max-h-80 overflow-y-auto">
        {gaps.map((g, i) => {
          const statusLabels: Record<string, { text: string; cls: string }> = {
            not_started: { text: 'Chưa bắt đầu', cls: 'bg-zinc-700 text-zinc-400' },
            in_progress: { text: 'Đang học', cls: 'bg-blue-500/20 text-blue-300' },
            submitted: { text: 'Đợi duyệt', cls: 'bg-amber-500/20 text-amber-300' },
            rejected: { text: 'Bị từ chối', cls: 'bg-red-500/20 text-red-300' },
          };
          const sl = statusLabels[g.status] ?? statusLabels.not_started;

          return (
            <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-zinc-800/30">
              <span className="text-zinc-500 font-mono text-xs w-14">{g.skill.skillCode}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white truncate">{g.skill.name}</p>
                <p className="text-[10px] text-zinc-500">{g.group}</p>
              </div>
              <div className="flex items-center gap-2">
                {g.skill.isRequired && (
                  <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                    Bắt buộc
                  </span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${sl.cls}`}>
                  {sl.text}
                </span>
                <span className="text-xs text-zinc-500 w-12 text-right">
                  Lv {g.currentLevel}/{g.skill.maxLevel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Skill Progress By Domain
// ═══════════════════════════════════════════════════════════

function DomainProgress({ groups, progress }: { groups: SkillGroup[]; progress: SkillProgress[] }) {
  const progressMap = new Map<string, SkillProgress>();
  progress.forEach((p) => progressMap.set(p.skillId, p));

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const total = g.skills.length;
        const verified = g.skills.filter((s) => {
          const p = progressMap.get(s.id);
          return p && (p.status === 'verified' || p.status === 'awarded');
        }).length;
        const pct = total > 0 ? Math.round((verified / total) * 100) : 0;

        return (
          <div key={g.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white font-medium flex items-center gap-2">
                {g.icon || '📦'} {g.name}
              </span>
              <span className="text-xs text-zinc-400">{verified}/{total} hoàn thành</span>
            </div>
            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Progress Page (T-0083 + T-0084 + T-0085)
// ═══════════════════════════════════════════════════════════

export default function ProgressPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = params.id as string;
  const isParentView = searchParams.get('view') === 'parent';

  const [dashboard, setDashboard] = useState<PersonalDashboard | null>(null);
  const [progress, setProgress] = useState<SkillProgress[]>([]);
  const [groups, setGroups] = useState<SkillGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [dashData, progData, groupsData] = await Promise.all([
          api.get<PersonalDashboard>(`/scout/dashboard/${memberId}`),
          api.get<SkillProgress[]>(`/scout/progress/${memberId}`),
          api.get<SkillGroup[]>('/scout/skill-groups'),
        ]);
        setDashboard(dashData);
        setProgress(progData);
        setGroups(groupsData);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    })();
  }, [memberId]);

  if (loading) {
    return <div className="p-6 text-zinc-400 text-center py-12">Đang tải tiến trình...</div>;
  }

  if (!dashboard) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-zinc-500">Không tìm thấy dữ liệu tiến trình</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/members/${memberId}`)}
          className="text-xs text-zinc-500 hover:text-white mb-2 flex items-center gap-1 transition-colors"
        >
          ← Quay lại hồ sơ
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">📊</span>
            {isParentView ? 'Tiến trình học tập (Phụ huynh)' : 'Tiến Trình Cá Nhân'}
          </h1>
          {isParentView && (
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
              👨‍👩‍👧 Chế độ phụ huynh
            </span>
          )}
        </div>
        <p className="text-zinc-400 mt-1">
          {isParentView
            ? 'Tổng quan tiến trình Hướng Đạo của con em — chế độ an toàn'
            : 'Kỹ năng, đẳng thứ, thành tích, và giờ phục vụ cộng đồng'}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <StatCard
          icon="🎯"
          label="Kỹ năng đạt"
          value={`${dashboard.skillProgress.pct}%`}
          sub={`${dashboard.skillProgress.verified}/${dashboard.skillProgress.total}`}
          color="bg-zinc-800/50"
        />
        <StatCard
          icon="🏅"
          label="Đẳng thứ hiện tại"
          value={dashboard.currentRank?.rank?.rankName ?? '—'}
          sub={dashboard.currentRank?.status}
          color="bg-amber-500/5"
        />
        <StatCard
          icon="🏆"
          label="Thành tích"
          value={dashboard.achievements}
          color="bg-purple-500/5"
        />
        <StatCard
          icon="⏱️"
          label="Giờ phục vụ"
          value={dashboard.serviceHours}
          sub="giờ tích lũy"
          color="bg-blue-500/5"
        />
        <StatCard
          icon="🔥"
          label="Thói quen"
          value={dashboard.habitCheckIns}
          sub="lần check-in"
          color="bg-orange-500/5"
        />
      </div>

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Domain progress */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            📈 Tiến trình theo lĩnh vực
          </h2>
          <DomainProgress groups={groups} progress={progress} />

          {/* Quick links (not shown in parent view) */}
          {!isParentView && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => router.push(`/members/${memberId}/habits`)}
                className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
              >
                🔥 Thói quen
              </button>
              <button
                onClick={() => router.push(`/members/${memberId}/achievements`)}
                className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
              >
                🏆 Thành tích
              </button>
              <button
                onClick={() => router.push(`/members/${memberId}/character-sheet`)}
                className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
              >
                📋 Character Sheet
              </button>
            </div>
          )}
        </div>

        {/* Right: Skill gaps (T-0085) */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            💡 Gợi ý hoàn thiện
          </h2>
          <SkillGapSection groups={groups} progress={progress} />
        </div>
      </div>
    </div>
  );
}
