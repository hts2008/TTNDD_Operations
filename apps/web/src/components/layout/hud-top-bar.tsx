'use client';

import { Flame, Shield, Star, Target, Zap } from 'lucide-react';

interface HudTopBarProps {
  memberName: string;
  rankName: string;
  rankTier: number;
  currentExp: number;
  nextLevelExp: number;
  level: number;
  streak: number;
  activeQuests: number;
}

const rankColors: Record<number, string> = {
  1: 'from-emerald-400 to-emerald-600',
  2: 'from-sky-400 to-sky-600',
  3: 'from-amber-400 to-amber-600',
  4: 'from-purple-400 to-purple-600',
  5: 'from-rose-400 to-rose-600',
  6: 'from-yellow-300 to-yellow-500',
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
  const rankGradient = rankColors[rankTier] || rankColors[1];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[hsl(var(--border)_/_0.75)] bg-[hsl(var(--card))] p-2 px-3 shadow-sm sm:flex-nowrap sm:px-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${rankGradient} shadow-sm`}
      >
        <Shield className="h-5 w-5 text-white drop-shadow" />
      </div>

      <div className="min-w-0 flex-1 sm:max-w-64">
        <span className="block truncate text-sm font-bold text-[hsl(var(--foreground))]">
          {memberName}
        </span>
        <span className="block truncate text-xs text-[hsl(var(--muted-foreground))]">
          {rankName} / Lv.{level}
        </span>
      </div>

      <div className="order-last w-full min-w-0 sm:order-none sm:max-w-[240px] sm:flex-1">
        <div className="mb-0.5 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
            <Zap className="h-3 w-3 text-amber-500" />
            EXP
          </span>
          <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
            {currentExp.toLocaleString()}/{nextLevelExp.toLocaleString()}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 transition-all duration-700 ease-out"
            style={{ width: `${expPercent}%` }}
          />
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3 text-xs">
        <div
          className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]"
          title="Attendance streak"
        >
          <Flame className={`h-4 w-4 ${streak >= 3 ? 'animate-pulse text-orange-500' : ''}`} />
          <span className="font-mono font-bold">{streak}</span>
        </div>

        <div
          className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]"
          title="Active quests"
        >
          <Target className="h-4 w-4 text-sky-500" />
          <span className="font-mono font-bold">{activeQuests}</span>
        </div>

        <div
          className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]"
          title="Badge progress"
        >
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        </div>
      </div>
    </div>
  );
}
