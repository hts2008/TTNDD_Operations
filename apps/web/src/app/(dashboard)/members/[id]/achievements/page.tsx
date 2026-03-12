'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface AchievementDef {
  id: string;
  key: string;
  name: string;
  description?: string;
  rarity?: string;
}

interface AchievementAward {
  id: string;
  achievementDefId: string;
  awardedAt: string;
  awardedByPersonId?: string;
  sourceEventId?: string;
  achievementDef?: { name: string; rarity: string; description?: string };
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const RARITY_CONFIG: Record<string, { bg: string; border: string; badge: string; glow: string; icon: string }> = {
  legendary: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300',
    glow: 'shadow-amber-500/20 shadow-lg',
    icon: '🌟',
  },
  epic: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
    badge: 'bg-purple-500/20 text-purple-300',
    glow: 'shadow-purple-500/20 shadow-md',
    icon: '💎',
  },
  rare: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    badge: 'bg-blue-500/20 text-blue-300',
    glow: '',
    icon: '🔷',
  },
  common: {
    bg: 'bg-zinc-800/40',
    border: 'border-zinc-700/50',
    badge: 'bg-zinc-700 text-zinc-400',
    glow: '',
    icon: '⭐',
  },
};

function getRarityConfig(rarity?: string) {
  return RARITY_CONFIG[rarity ?? 'common'] ?? RARITY_CONFIG.common;
}

// ═══════════════════════════════════════════════════════════
// Achievement Card
// ═══════════════════════════════════════════════════════════

function AchievementCard({
  def,
  award,
}: {
  def: AchievementDef;
  award?: AchievementAward;
}) {
  const rc = getRarityConfig(def.rarity);
  const earned = !!award;

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all ${
        earned
          ? `${rc.bg} ${rc.border} ${rc.glow} hover:scale-[1.02]`
          : 'bg-zinc-900/40 border-zinc-800 opacity-50 grayscale hover:opacity-70'
      }`}
    >
      {/* Rarity badge */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{rc.icon}</span>
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${rc.badge}`}>
          {def.rarity ?? 'common'}
        </span>
      </div>

      {/* Name & description */}
      <h3 className={`font-bold text-sm mb-1 ${earned ? 'text-white' : 'text-zinc-500'}`}>
        {def.name}
      </h3>
      {def.description && (
        <p className={`text-xs mb-3 ${earned ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {def.description}
        </p>
      )}

      {/* Earned badge */}
      {earned ? (
        <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-700/30">
          <span className="text-emerald-400 text-xs">✅</span>
          <span className="text-xs text-zinc-400">
            Đạt {new Date(award.awardedAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/50">
          <span className="text-zinc-600 text-xs">🔒</span>
          <span className="text-xs text-zinc-600">Chưa đạt</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Summary Stats
// ═══════════════════════════════════════════════════════════

function AchievementStats({
  total,
  earned,
  byRarity,
}: {
  total: number;
  earned: number;
  byRarity: Record<string, { total: number; earned: number }>;
}) {
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
      {/* Overall */}
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 sm:col-span-2 lg:col-span-1">
        <p className="text-zinc-500 text-xs mb-1">Tổng đạt</p>
        <p className="text-2xl font-bold text-white">
          {earned}<span className="text-zinc-500 text-sm font-normal">/{total}</span>
        </p>
        <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-1">{pct}% hoàn thành</p>
      </div>

      {/* By rarity */}
      {['legendary', 'epic', 'rare', 'common'].map((r) => {
        const rc = getRarityConfig(r);
        const data = byRarity[r] ?? { total: 0, earned: 0 };
        return (
          <div key={r} className={`${rc.bg} border ${rc.border} rounded-xl p-4`}>
            <p className="text-zinc-500 text-xs mb-1 capitalize flex items-center gap-1">
              {rc.icon} {r}
            </p>
            <p className="text-lg font-bold text-white">
              {data.earned}<span className="text-zinc-500 text-sm font-normal">/{data.total}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════

export default function AchievementsPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [defs, setDefs] = useState<AchievementDef[]>([]);
  const [awards, setAwards] = useState<AchievementAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earned' | 'unearned'>('all');

  useEffect(() => {
    (async () => {
      try {
        const [defsData, awardsData] = await Promise.all([
          api.get<AchievementDef[]>('/scout/achievements'),
          api.get<AchievementAward[]>(`/scout/achievements/${memberId}/awards`),
        ]);
        setDefs(defsData);
        setAwards(awardsData);
      } catch {
        setDefs([]);
        setAwards([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [memberId]);

  // Build award lookup
  const awardMap = new Map<string, AchievementAward>();
  awards.forEach((a) => awardMap.set(a.achievementDefId, a));

  // Stats by rarity
  const byRarity: Record<string, { total: number; earned: number }> = {};
  defs.forEach((d) => {
    const r = d.rarity ?? 'common';
    if (!byRarity[r]) byRarity[r] = { total: 0, earned: 0 };
    byRarity[r].total++;
    if (awardMap.has(d.id)) byRarity[r].earned++;
  });

  // Filter
  const filtered = defs
    .filter((d) => {
      if (filter === 'earned') return awardMap.has(d.id);
      if (filter === 'unearned') return !awardMap.has(d.id);
      return true;
    })
    .sort((a, b) => {
      // Sort earned first, then by rarity weight
      const rarityOrder = ['legendary', 'epic', 'rare', 'common'];
      const aEarned = awardMap.has(a.id) ? 0 : 1;
      const bEarned = awardMap.has(b.id) ? 0 : 1;
      if (aEarned !== bEarned) return aEarned - bEarned;
      return rarityOrder.indexOf(a.rarity ?? 'common') - rarityOrder.indexOf(b.rarity ?? 'common');
    });

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
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🏆</span> Phòng Thành Tích
        </h1>
        <p className="text-zinc-400 mt-1">
          Bộ sưu tập thành tích Hướng Đạo — huy chương, kỷ lục, và cột mốc
        </p>
      </div>

      {loading ? (
        <div className="text-zinc-400 text-center py-12">Đang tải thành tích...</div>
      ) : defs.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700 border-dashed rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-zinc-400">Chưa có thành tích nào được cấu hình.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <AchievementStats
            total={defs.length}
            earned={awards.length}
            byRarity={byRarity}
          />

          {/* Filter tabs */}
          <div className="flex gap-1 bg-zinc-800/60 border border-zinc-700 rounded-xl p-1 w-fit mb-6">
            {([['all', 'Tất cả'], ['earned', '✅ Đã đạt'], ['unearned', '🔒 Chưa đạt']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === key
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((def) => (
              <AchievementCard
                key={def.id}
                def={def}
                award={awardMap.get(def.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
