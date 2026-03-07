'use client';

import { Zap, Star, Shield, Target, Flame } from 'lucide-react';

/**
 * MMORPG-style HUD Top Bar — shows player (member) status at-a-glance.
 *
 * Components:
 *   C-HUDTopBar: EXP progress bar, rank badge, streak indicator
 *
 * This replaces the plain Header breadcrumb area with game-like status.
 * Per V3 spec WP-0.3: "layout HUD desktop/mobile"
 */

interface HudTopBarProps {
  /** Member display name */
  memberName: string;
  /** Current scout rank name (e.g. "Hướng Thiện") */
  rankName: string;
  /** Current rank tier (1-6, maps to rank colors) */
  rankTier: number;
  /** Current EXP points */
  currentExp: number;
  /** EXP needed for next level */
  nextLevelExp: number;
  /** Current level number */
  level: number;
  /** Active streak (consecutive sessions attended) */
  streak: number;
  /** Number of active quests/tasks */
  activeQuests: number;
}

const RANK_COLORS: Record<number, string> = {
  1: 'from-emerald-400 to-emerald-600', // Ấu (Cub)
  2: 'from-sky-400 to-sky-600', // Thiếu (Scout)
  3: 'from-amber-400 to-amber-600', // Kha (Venture)
  4: 'from-purple-400 to-purple-600', // Tráng (Rover)
  5: 'from-rose-400 to-rose-600', // Huynh Trưởng
  6: 'from-yellow-300 to-yellow-500', // Trưởng
};

export function HudTopBar({
  memberName,
  rankName,
  rankTier,
  currentExp,
  nextLevelExp,
  level,
  streak,
  activeQuests,
}: HudTopBarProps) {
  const expPercent = Math.min((currentExp / nextLevelExp) * 100, 100);
  const rankGradient = RANK_COLORS[rankTier] || RANK_COLORS[1];

  return (
    <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-[hsl(var(--card))] to-[hsl(var(--card)_/_0.8)] border border-[hsl(var(--border)_/_0.5)] p-2 px-4 shadow-sm backdrop-blur-sm">
      {/* Rank Badge */}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${rankGradient} shadow-md`}
      >
        <Shield className="h-5 w-5 text-white drop-shadow" />
      </div>

      {/* Name + Rank + Level */}
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-bold text-[hsl(var(--foreground))] truncate">
          {memberName}
        </span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {rankName} · Lv.{level}
        </span>
      </div>

      {/* EXP Bar */}
      <div className="flex-1 min-w-[120px] max-w-[240px]">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-400" />
            EXP
          </span>
          <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
            {currentExp.toLocaleString()}/{nextLevelExp.toLocaleString()}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-[hsl(var(--muted))] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 transition-all duration-700 ease-out"
            style={{ width: `${expPercent}%` }}
          />
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-3 text-xs">
        {/* Streak */}
        <div
          className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]"
          title="Chuỗi sinh hoạt liên tục"
        >
          <Flame className={`h-4 w-4 ${streak >= 3 ? 'text-orange-500 animate-pulse' : ''}`} />
          <span className="font-mono font-bold">{streak}</span>
        </div>

        {/* Active Quests */}
        <div
          className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]"
          title="Nhiệm vụ đang thực hiện"
        >
          <Target className="h-4 w-4 text-blue-400" />
          <span className="font-mono font-bold">{activeQuests}</span>
        </div>

        {/* Stars (badges count placeholder) */}
        <div
          className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]"
          title="Huy hiệu đạt được"
        >
          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
        </div>
      </div>
    </div>
  );
}
