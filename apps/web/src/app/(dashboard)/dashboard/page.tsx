'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface OrgDashboard {
  totalMembers?: number;
  activeMembers?: number;
  totalSessions?: number;
  avgAttendanceRate?: number;
  totalExpEarned?: number;
  activeSkills?: number;
  recentActivities?: Array<{ type: string; title: string; date: string; details?: string }>;
  upcomingSessions?: Array<{ id: string; title: string; sessionDate: string; branchId?: string }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<OrgDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const d = await api.get<OrgDashboard>('/dashboards/org');
        setData(d);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không thể tải dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto" />
          <p className="text-zinc-400 mt-3">Đang tải dữ liệu dashboard...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-6">
        <div className="bg-red-950/30 border border-red-800 rounded-xl p-4 text-red-300">
          ⚠️ {error}
        </div>
      </div>
    );

  const stats = [
    { label: 'Tổng thành viên', value: data?.totalMembers ?? 0, emoji: '👥', color: 'blue' },
    { label: 'Đang hoạt động', value: data?.activeMembers ?? 0, emoji: '✅', color: 'emerald' },
    { label: 'Phiên sinh hoạt', value: data?.totalSessions ?? 0, emoji: '📋', color: 'violet' },
    {
      label: 'Điểm danh TB',
      value: `${data?.avgAttendanceRate ?? 0}%`,
      emoji: '📊',
      color: 'amber',
    },
    {
      label: 'EXP tổng',
      value: data?.totalExpEarned?.toLocaleString() ?? '0',
      emoji: '⭐',
      color: 'rose',
    },
    { label: 'Kỹ năng đang học', value: data?.activeSkills ?? 0, emoji: '🎯', color: 'cyan' },
  ];

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">📊</span> Bảng Điều Khiển
        </h1>
        <p className="text-zinc-400 mt-1">Tổng quan hoạt động Đoàn — dữ liệu thời gian thực</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`bg-gradient-to-br from-${s.color}-950/50 to-${s.color}-900/20 border border-${s.color}-800/40 rounded-xl p-5 transition-all hover:border-${s.color}-600/60`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{s.emoji}</span>
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold">{s.label}</p>
            </div>
            <p className="text-3xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activities */}
        <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            🕐 Hoạt động gần đây
          </h2>
          {data?.recentActivities && data.recentActivities.length > 0 ? (
            <div className="space-y-3">
              {data.recentActivities.slice(0, 8).map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="text-lg">
                    {a.type === 'session'
                      ? '📋'
                      : a.type === 'badge'
                        ? '🏅'
                        : a.type === 'member'
                          ? '👤'
                          : '📝'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate">{a.title}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(a.date).toLocaleDateString('vi-VN')} {a.details && `· ${a.details}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Chưa có hoạt động nào.</p>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            📅 Sắp diễn ra
          </h2>
          {data?.upcomingSessions && data.upcomingSessions.length > 0 ? (
            <div className="space-y-3">
              {data.upcomingSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-4 py-3"
                >
                  <span className="text-lg">📋</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{s.title}</p>
                    <p className="text-xs text-zinc-400">
                      {new Date(s.sessionDate).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Chưa có phiên sắp tới.</p>
          )}
        </div>
      </div>
    </div>
  );
}
