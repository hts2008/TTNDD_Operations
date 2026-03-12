'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface HabitDef {
  id: string;
  key: string;
  name: string;
  cadence: string;
}

interface HabitLog {
  id: string;
  habitDefId: string;
  logDate: string;
  status: string;
  note?: string;
  habitDef?: { name: string; cadence: string };
}

interface StreakData {
  habitDefId: string;
  personId: string;
  currentStreak: number;
  totalDone: number;
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function getDayKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getLast90Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

const STATUS_COLORS: Record<string, string> = {
  done: 'bg-emerald-500',
  skip: 'bg-amber-500',
  rest: 'bg-zinc-600',
};

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// ═══════════════════════════════════════════════════════════
// Heat Map Component
// ═══════════════════════════════════════════════════════════

function HeatMap({ logs }: { logs: HabitLog[] }) {
  const days = getLast90Days();
  const logMap = new Map<string, string>();
  logs.forEach((l) => {
    logMap.set(getDayKey(new Date(l.logDate)), l.status);
  });

  // Group by week (columns)
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  days.forEach((d, i) => {
    if (i > 0 && d.getDay() === 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(d);
  });
  if (currentWeek.length) weeks.push(currentWeek);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 min-w-fit">
        {/* Weekday labels column */}
        <div className="flex flex-col gap-0.5 mr-1">
          {WEEKDAY_LABELS.map((l) => (
            <div key={l} className="w-4 h-3 text-[8px] text-zinc-500 leading-3 text-right">
              {l}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {/* Pad to 7 rows */}
            {Array.from({ length: 7 }).map((_, di) => {
              const day = week.find((d) => d.getDay() === di);
              if (!day) return <div key={di} className="w-3 h-3" />;
              const status = logMap.get(getDayKey(day));
              const color = status ? STATUS_COLORS[status] || 'bg-zinc-700' : 'bg-zinc-800/60';
              return (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-[2px] ${color} transition-colors`}
                  title={`${getDayKey(day)}: ${status || 'chưa log'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Hoàn thành</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Bỏ qua</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-600 inline-block" /> Nghỉ</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-800 inline-block" /> Chưa log</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Habit Card
// ═══════════════════════════════════════════════════════════

function HabitCard({
  habit,
  personId,
  showToast,
}: {
  habit: HabitDef;
  personId: string;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [logsData, streakData] = await Promise.all([
        api.get<HabitLog[]>(`/scout/habits/${personId}/logs`, { habitDefId: habit.id }),
        api.get<StreakData>(`/scout/habits/${personId}/streak/${habit.id}`),
      ]);
      setLogs(logsData);
      setStreak(streakData);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [personId, habit.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLog = async (status: string) => {
    try {
      setLogging(true);
      await api.post(`/scout/habits/${habit.id}/log`, {
        personId,
        logDate: getDayKey(new Date()),
        status,
      });
      showToast(`✅ Đã ghi nhận "${habit.name}" — ${status}`, 'success');
      await loadData();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi'}`, 'error');
    } finally {
      setLogging(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-zinc-700 rounded w-1/3 mb-3" />
        <div className="h-20 bg-zinc-700/50 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5 hover:border-emerald-600/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            {habit.name}
            {streak && streak.currentStreak > 0 && (
              <span className="flex items-center gap-1 bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full text-xs font-semibold">
                🔥 {streak.currentStreak}
              </span>
            )}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {habit.cadence === 'daily' ? 'Hàng ngày' : habit.cadence === 'weekly' ? 'Hàng tuần' : habit.cadence}
            {streak && ` · ${streak.totalDone} lần hoàn thành`}
          </p>
        </div>
        <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded font-mono uppercase">
          {habit.key}
        </span>
      </div>

      {/* Heat map */}
      <HeatMap logs={logs} />

      {/* Quick log buttons */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-700/50">
        <span className="text-xs text-zinc-500 py-1.5">Hôm nay:</span>
        {['done', 'skip', 'rest'].map((s) => (
          <button
            key={s}
            onClick={() => handleLog(s)}
            disabled={logging}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
              s === 'done'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : s === 'skip'
                ? 'bg-amber-600/80 hover:bg-amber-500 text-white'
                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
            }`}
          >
            {s === 'done' ? '✅ Hoàn thành' : s === 'skip' ? '⏭️ Bỏ qua' : '😴 Nghỉ'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Habits Page
// ═══════════════════════════════════════════════════════════

export default function HabitsPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [habits, setHabits] = useState<HabitDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<HabitDef[]>('/scout/habits');
        setHabits(data);
      } catch {
        setHabits([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
          <span className="text-3xl">🔥</span> Thói quen Hướng Đạo
        </h1>
        <p className="text-zinc-400 mt-1">
          Theo dõi thói quen hàng ngày, chuỗi streak, và tiến trình cá nhân
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-zinc-400 text-center py-12">Đang tải thói quen...</div>
      ) : habits.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700 border-dashed rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-zinc-400">
            Chưa có thói quen nào được cấu hình. Liên hệ Huynh trưởng để tạo thói quen.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {habits.map((h) => (
            <HabitCard key={h.id} habit={h} personId={memberId} showToast={showToast} />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 border border-emerald-700 text-emerald-200'
              : 'bg-red-900/90 border border-red-700 text-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
