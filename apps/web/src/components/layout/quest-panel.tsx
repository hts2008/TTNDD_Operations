'use client';

import { CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';

/**
 * MMORPG Quest Panel — shows active quests/tasks in a game-style sidebar panel.
 *
 * Component: C-RightQuestPanel
 * Per V3 spec WP-0.3: quest panel showing current objectives.
 *
 * Data source: /api/v1/scout/progress/{memberId} + active session tasks
 */

interface Quest {
  id: string;
  title: string;
  /** Quest category: skill, session, project, enrichment */
  category: 'skill' | 'session' | 'project' | 'enrichment';
  /** Progress 0-100 */
  progress: number;
  /** EXP reward on completion */
  expReward: number;
  /** Whether quest is completed */
  completed: boolean;
}

interface QuestPanelProps {
  quests: Quest[];
  /** Max quests to display */
  maxDisplay?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  skill: 'text-emerald-400',
  session: 'text-sky-400',
  project: 'text-purple-400',
  enrichment: 'text-amber-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  skill: 'Kỹ năng',
  session: 'Sinh hoạt',
  project: 'Dự án',
  enrichment: 'Đạo đức',
};

export function QuestPanel({ quests, maxDisplay = 5 }: QuestPanelProps) {
  const activeQuests = quests.filter((q) => !q.completed).slice(0, maxDisplay);
  const completedCount = quests.filter((q) => q.completed).length;

  return (
    <div className="rounded-xl border border-[hsl(var(--border)_/_0.5)] bg-[hsl(var(--card))] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Nhiệm vụ
        </h3>
        <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-full">
          {completedCount}/{quests.length}
        </span>
      </div>

      {/* Quest List */}
      <div className="space-y-2">
        {activeQuests.length === 0 ? (
          <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-4">
            🎉 Hoàn thành tất cả nhiệm vụ!
          </p>
        ) : (
          activeQuests.map((quest) => (
            <div
              key={quest.id}
              className="group flex items-start gap-3 rounded-lg p-2 hover:bg-[hsl(var(--muted)_/_0.5)] transition-colors cursor-pointer"
            >
              {/* Status icon */}
              <div className="mt-0.5">
                {quest.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Circle className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                )}
              </div>

              {/* Quest info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">
                  {quest.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-medium ${CATEGORY_COLORS[quest.category]}`}>
                    {CATEGORY_LABELS[quest.category]}
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    +{quest.expReward} EXP
                  </span>
                </div>

                {/* Progress bar */}
                {quest.progress > 0 && quest.progress < 100 && (
                  <div className="mt-1.5 h-1 w-full rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-blue-400 to-blue-600 transition-all"
                      style={{ width: `${quest.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Arrow on hover */}
              <ArrowRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
