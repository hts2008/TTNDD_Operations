'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface Session {
  id: string;
  title: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: string;
  sessionType?: string;
  theme?: string;
  branchId?: string;
  _count?: { attendanceRecords?: number };
}

interface SessionsResponse {
  data: Session[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500/20 text-zinc-300',
  planned: 'bg-blue-500/20 text-blue-300',
  in_progress: 'bg-amber-500/20 text-amber-300',
  completed: 'bg-emerald-500/20 text-emerald-300',
  cancelled: 'bg-red-500/20 text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  planned: 'Đã lên kế hoạch',
  in_progress: 'Đang diễn ra',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy',
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<SessionsResponse>(`/sessions?${params}`);
      setSessions(res.data || []);
      setTotal(res.total || 0);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">📋</span> Phiên Sinh Hoạt
          </h1>
          <p className="text-zinc-400 mt-1">Quản lý các buổi sinh hoạt — {total} phiên</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${view === 'list' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:bg-zinc-700'}`}
          >
            📋 Danh sách
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${view === 'calendar' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:bg-zinc-700'}`}
          >
            📅 Lịch
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {['', 'draft', 'planned', 'in_progress', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'}`}
          >
            {s === '' ? 'Tất cả' : STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-zinc-400 text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
        </div>
      )}

      {!loading && view === 'list' && (
        <div className="space-y-3">
          {sessions.length === 0 && (
            <p className="text-zinc-500 text-center py-12">Chưa có phiên sinh hoạt nào.</p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{s.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                    <span>📅 {new Date(s.sessionDate).toLocaleDateString('vi-VN')}</span>
                    {s.startTime && (
                      <span>
                        ⏰ {s.startTime}
                        {s.endTime ? ` — ${s.endTime}` : ''}
                      </span>
                    )}
                    {s.location && <span>📍 {s.location}</span>}
                    {s._count?.attendanceRecords !== undefined && (
                      <span>👥 {s._count.attendanceRecords}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium ${STATUS_COLORS[s.status] || 'bg-zinc-700 text-zinc-300'}`}
                >
                  {STATUS_LABELS[s.status] || s.status}
                </span>
              </div>
            </div>
          ))}
          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded bg-zinc-700 text-zinc-300 disabled:opacity-30 text-sm"
              >
                ← Trước
              </button>
              <span className="text-zinc-400 text-sm">Trang {page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={sessions.length < 20}
                className="px-3 py-1 rounded bg-zinc-700 text-zinc-300 disabled:opacity-30 text-sm"
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && view === 'calendar' && (
        <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-6">
          <p className="text-zinc-400 text-center text-sm mb-4">
            📅 Chế độ xem lịch — hiển thị các phiên theo tháng
          </p>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500 mb-2">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
              <div key={d} className="py-1 font-medium">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => {
              const day =
                i -
                (new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() || 7) +
                2;
              const date = new Date(new Date().getFullYear(), new Date().getMonth(), day);
              const dateStr = date.toISOString().slice(0, 10);
              const daySessions = sessions.filter((s) => s.sessionDate?.startsWith(dateStr));
              const isToday = dateStr === new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={i}
                  className={`min-h-[60px] rounded-lg p-1 text-xs ${day > 0 && day <= 31 ? 'bg-zinc-800/50' : 'bg-transparent'} ${isToday ? 'ring-1 ring-amber-500' : ''}`}
                >
                  {day > 0 && day <= 31 && (
                    <>
                      <span className={`${isToday ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}>
                        {day}
                      </span>
                      {daySessions.map((s) => (
                        <div
                          key={s.id}
                          className="mt-0.5 bg-amber-600/30 text-amber-200 rounded px-1 py-0.5 truncate text-[10px]"
                        >
                          {s.title}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
