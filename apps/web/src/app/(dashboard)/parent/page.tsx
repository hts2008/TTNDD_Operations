'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface LinkedChild {
  id: string;
  memberId: string;
  relationship: string;
  member?: {
    scoutName?: string;
    heroName?: string;
    branch?: string;
    user?: { displayName?: string; avatarUrl?: string };
  };
}

interface ParentDashboard {
  children: Array<{
    childId: string;
    name: string;
    branch?: string;
    attendance?: { present: number; total: number };
    expTotal?: number;
    pendingConsents?: number;
    fees?: { paid: number; due: number };
  }>;
  summary?: { totalChildren: number; avgAttendance?: number; totalExp?: number };
}

interface AccessLog {
  id: string;
  accessedAt: string;
  accessType: string;
  dataCategory: string;
  ipAddress?: string;
}

interface NotifPref {
  id: string;
  channel: string;
  eventType: string;
  enabled: boolean;
  quietStart?: string;
  quietEnd?: string;
}

type TabKey = 'dashboard' | 'children' | 'logs' | 'notifications';

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'dashboard', label: 'Tổng quan', emoji: '📊' },
  { key: 'children', label: 'Con em', emoji: '👨‍👩‍👧‍👦' },
  { key: 'logs', label: 'Nhật ký truy cập', emoji: '📋' },
  { key: 'notifications', label: 'Thông báo', emoji: '🔔' },
];

// ═══════════════════════════════════════════════════════════
// Dashboard Tab (T-0057)
// ═══════════════════════════════════════════════════════════

function DashboardTab() {
  const [data, setData] = useState<ParentDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.get<ParentDashboard>('/hrm/parent/dashboard');
        setData(d);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return <div className="text-zinc-400 text-center py-12">Đang tải bảng điều khiển...</div>;
  if (!data)
    return (
      <div className="text-zinc-500 text-center py-12">
        Không có dữ liệu. Vui lòng liên kết tài khoản phụ huynh trước.
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {data.summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-linear-to-br from-blue-950/50 to-blue-900/30 border border-blue-800/50 rounded-xl p-4">
            <p className="text-xs text-blue-400 uppercase tracking-wider font-bold">Con em</p>
            <p className="text-3xl font-bold text-white mt-1">{data.summary.totalChildren}</p>
          </div>
          <div className="bg-linear-to-br from-emerald-950/50 to-emerald-900/30 border border-emerald-800/50 rounded-xl p-4">
            <p className="text-xs text-emerald-400 uppercase tracking-wider font-bold">
              Điểm danh TB
            </p>
            <p className="text-3xl font-bold text-white mt-1">
              {data.summary.avgAttendance ?? '—'}%
            </p>
          </div>
          <div className="bg-linear-to-br from-amber-950/50 to-amber-900/30 border border-amber-800/50 rounded-xl p-4">
            <p className="text-xs text-amber-400 uppercase tracking-wider font-bold">Tổng EXP</p>
            <p className="text-3xl font-bold text-white mt-1">
              {data.summary.totalExp?.toLocaleString() ?? '—'}
            </p>
          </div>
        </div>
      )}

      {/* Children detail cards */}
      <div className="space-y-3">
        {data.children.map((child) => (
          <div
            key={child.childId}
            className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">{child.name}</h3>
              {child.branch && (
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                  {child.branch}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-zinc-500 text-xs">Điểm danh</p>
                <p className="text-white font-medium">
                  {child.attendance ? `${child.attendance.present}/${child.attendance.total}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">EXP</p>
                <p className="text-amber-300 font-medium">
                  {child.expTotal?.toLocaleString() ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Chờ đồng thuận</p>
                <p className="text-white font-medium">{child.pendingConsents ?? 0}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Học phí</p>
                <p className="text-white font-medium">
                  {child.fees
                    ? `${(child.fees.paid / 1000).toFixed(0)}K / ${(child.fees.due / 1000).toFixed(0)}K`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Children Tab (T-0056)
// ═══════════════════════════════════════════════════════════

function ChildrenTab() {
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<LinkedChild[]>('/hrm/parent/children');
        setChildren(data);
      } catch {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return <div className="text-zinc-400 text-center py-12">Đang tải danh sách con em...</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">👨‍👩‍👧‍👦 Con em đã liên kết</h2>
      {children.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700 border-dashed rounded-xl p-8 text-center">
          <p className="text-zinc-400">
            Chưa có con em nào được liên kết. Liên hệ ban quản lý để liên kết tài khoản.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {children.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4"
            >
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold">
                {(c.member?.user?.displayName || c.member?.scoutName || '?')[0]}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">
                  {c.member?.user?.displayName || c.member?.scoutName || `Member ${c.memberId}`}
                </p>
                <p className="text-xs text-zinc-400">
                  {c.relationship} {c.member?.branch ? `· ${c.member.branch}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Access Logs Tab (T-0058 — COPPA)
// ═══════════════════════════════════════════════════════════

function AccessLogsTab() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Get first child, then load logs — simplified
        const children = await api.get<LinkedChild[]>('/hrm/parent/children');
        if (children.length > 0) {
          const data = await api.get<AccessLog[]>(
            `/parent/children/${children[0].memberId}/access-logs`,
          );
          setLogs(data);
        }
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-zinc-400 text-center py-12">Đang tải nhật ký...</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-2">📋 Nhật ký Truy cập Dữ liệu (COPPA)</h2>
      <p className="text-zinc-400 text-sm mb-4">
        Theo dõi ai đã xem dữ liệu con em của bạn — T-0058
      </p>
      {logs.length === 0 ? (
        <p className="text-zinc-500 text-center py-8">Chưa có nhật ký truy cập nào.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm"
            >
              <span className="text-lg">{log.accessType === 'read' ? '👁️' : '✏️'}</span>
              <div className="flex-1">
                <p className="text-white">{log.dataCategory}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(log.accessedAt).toLocaleString('vi-VN')}
                </p>
              </div>
              {log.ipAddress && (
                <span className="text-xs text-zinc-600 font-mono">{log.ipAddress}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Notification Preferences Tab (T-0059)
// ═══════════════════════════════════════════════════════════

function NotificationsTab({
  showToast,
}: {
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [prefs, setPrefs] = useState<NotifPref[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<NotifPref[]>('/parent/notifications/preferences');
      setPrefs(data);
    } catch {
      setPrefs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const togglePref = async (pref: NotifPref) => {
    try {
      await api.put('/parent/notifications/preferences', {
        channel: pref.channel,
        eventType: pref.eventType,
        enabled: !pref.enabled,
        quietStart: pref.quietStart,
        quietEnd: pref.quietEnd,
      });
      showToast('✅ Đã cập nhật cài đặt thông báo', 'success');
      await loadPrefs();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi'}`, 'error');
    }
  };

  if (loading)
    return <div className="text-zinc-400 text-center py-12">Đang tải cài đặt thông báo...</div>;

  const EVENT_LABELS: Record<string, string> = {
    attendance: 'Điểm danh',
    grade: 'Đánh giá',
    fee: 'Học phí',
    event: 'Sự kiện',
    consent: 'Đồng thuận',
    badge: 'Huy hiệu',
  };
  const CHANNEL_LABELS: Record<string, string> = {
    email: '📧 Email',
    sms: '📱 SMS',
    push: '🔔 Push',
    in_app: '💬 Trong app',
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-2">🔔 Cài đặt Thông báo</h2>
      <p className="text-zinc-400 text-sm mb-4">Quản lý kênh nhận thông báo — T-0059</p>
      {prefs.length === 0 ? (
        <p className="text-zinc-500 text-center py-8">
          Chưa có cài đặt thông báo nào. Hệ thống sẽ dùng cài đặt mặc định.
        </p>
      ) : (
        <div className="space-y-2">
          {prefs.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3"
            >
              <span className="text-sm font-medium text-white w-24">
                {CHANNEL_LABELS[p.channel] || p.channel}
              </span>
              <span className="text-sm text-zinc-300 flex-1">
                {EVENT_LABELS[p.eventType] || p.eventType}
              </span>
              <button
                onClick={() => togglePref(p)}
                className={`w-12 h-6 rounded-full relative transition-colors ${p.enabled ? 'bg-emerald-600' : 'bg-zinc-600'}`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${p.enabled ? 'left-6' : 'left-0.5'}`}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Parent Portal Page
// ═══════════════════════════════════════════════════════════

export default function ParentPortalPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">👨‍👩‍👧</span> Cổng Phụ Huynh
        </h1>
        <p className="text-zinc-400 mt-1">
          Theo dõi tiến trình, điểm danh, và hoạt động con em — WP-2.4
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 bg-zinc-800/60 border border-zinc-700 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'children' && <ChildrenTab />}
      {activeTab === 'logs' && <AccessLogsTab />}
      {activeTab === 'notifications' && <NotificationsTab showToast={showToast} />}

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
