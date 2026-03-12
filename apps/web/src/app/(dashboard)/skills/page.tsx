'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface SkillGroup {
  id: string;
  name: string;
  narrativeName?: string;
  description?: string;
  icon?: string;
  color?: string;
  skills: Skill[];
}

interface Skill {
  id: string;
  skillCode: string;
  name: string;
  maxLevel: number;
  isRequired: boolean;
  expPerLevel: number;
}

interface VerifyQueueItem {
  id: string;
  member?: { scoutName?: string; user?: { displayName?: string } };
  skill?: { name: string; skillCode: string };
  currentLevel: number;
  targetLevel?: number;
  status: string;
  evidence?: Array<{ id: string; note?: string; url?: string; createdAt?: string }>;
}

type TabKey = 'tree' | 'verify' | 'ranks';

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'tree', label: 'Cây Kỹ Năng', emoji: '🌳' },
  { key: 'verify', label: 'Hàng đợi duyệt', emoji: '✅' },
  { key: 'ranks', label: 'Đẳng thứ', emoji: '🏅' },
];

interface RankDef {
  id: string;
  rankCode: string;
  rankName: string;
  narrativeName?: string;
  rankOrder: number;
  minExp?: number;
  iconUrl?: string;
  description?: string;
}

// ═══════════════════════════════════════════════════════════
// Skill Tree Tab
// ═══════════════════════════════════════════════════════════

function SkillTreeTab() {
  const [groups, setGroups] = useState<SkillGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<SkillGroup[]>('/scout/skill-groups');
        setGroups(data);
        if (data.length > 0) setExpandedGroups(new Set([data[0].id]));
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading)
    return <div className="text-zinc-400 text-center py-12">Đang tải cây kỹ năng...</div>;

  if (groups.length === 0)
    return (
      <div className="bg-zinc-800/30 border border-zinc-700 border-dashed rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">🌳</div>
        <p className="text-zinc-400">
          Chưa có nhóm kỹ năng nào. Cấu hình Scout Program trong Admin.
        </p>
      </div>
    );

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const isOpen = expandedGroups.has(g.id);
        return (
          <div
            key={g.id}
            className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggleGroup(g.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/60 transition-colors text-left"
            >
              <span className="text-xl">{g.icon || '📦'}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm">{g.name}</h3>
                {g.narrativeName && <p className="text-xs text-zinc-500">{g.narrativeName}</p>}
              </div>
              <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                {g.skills?.length || 0} kỹ năng
              </span>
              <span className="text-zinc-500">{isOpen ? '▼' : '▶'}</span>
            </button>
            {isOpen && g.skills && g.skills.length > 0 && (
              <div className="border-t border-zinc-700/50 divide-y divide-zinc-700/30">
                {g.skills.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-zinc-800/30"
                  >
                    <span className="text-zinc-500 font-mono text-xs w-16">{s.skillCode}</span>
                    <p className="text-white flex-1">{s.name}</p>
                    <div className="flex items-center gap-2 text-xs">
                      {s.isRequired && (
                        <span className="bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                          Bắt buộc
                        </span>
                      )}
                      <span className="bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
                        Lv {s.maxLevel}
                      </span>
                      <span className="bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded">
                        +{s.expPerLevel} EXP/lv
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Verification Queue Tab
// ═══════════════════════════════════════════════════════════

function VerifyQueueTab({
  showToast,
}: {
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [queue, setQueue] = useState<VerifyQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<VerifyQueueItem[]>('/scout/verify-queue');
      setQueue(data);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleDecision = async (
    progressId: string,
    decision: 'approved' | 'rejected',
    comment?: string,
  ) => {
    try {
      setProcessing(progressId);
      await api.post(`/scout/progress/${progressId}/verify-decision`, { decision, comment });
      showToast(`${decision === 'approved' ? '✅ Đã duyệt' : '❌ Đã từ chối'}`, 'success');
      await loadQueue();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi'}`, 'error');
    } finally {
      setProcessing(null);
    }
  };

  if (loading)
    return <div className="text-zinc-400 text-center py-12">Đang tải hàng đợi duyệt...</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">✅ Hàng đợi Xác nhận Kỹ năng</h2>
      {queue.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700 border-dashed rounded-xl p-8 text-center">
          <p className="text-zinc-400">🎉 Không có bài nộp cần duyệt. Tất cả đã hoàn thành!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <div key={item.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center text-white font-bold">
                  {(item.member?.user?.displayName || item.member?.scoutName || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">
                    {item.member?.user?.displayName || item.member?.scoutName || '—'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Kỹ năng: <span className="text-amber-300">{item.skill?.name}</span> (
                    {item.skill?.skillCode})
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Level hiện tại: {item.currentLevel} →{' '}
                    {item.targetLevel ?? item.currentLevel + 1}
                  </p>
                  {/* Evidence preview */}
                  {item.evidence && item.evidence.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.evidence.map((ev) => (
                        <div
                          key={ev.id}
                          className="text-xs bg-zinc-800 rounded px-2 py-1 text-zinc-300"
                        >
                          📎 {ev.note || ev.url || 'File đính kèm'}{' '}
                          {ev.createdAt && (
                            <span className="text-zinc-600 ml-1">
                              {new Date(ev.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecision(item.id, 'approved')}
                    disabled={processing === item.id}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    {processing === item.id ? '⏳' : '✅ Duyệt'}
                  </button>
                  <button
                    onClick={() => handleDecision(item.id, 'rejected', 'Cần bổ sung bằng chứng')}
                    disabled={processing === item.id}
                    className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                  >
                    ❌ Từ chối
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Ranks Tab
// ═══════════════════════════════════════════════════════════

function RanksTab() {
  const [ranks, setRanks] = useState<RankDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<RankDef[]>('/scout/ranks');
        setRanks(data);
      } catch {
        setRanks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-zinc-400 text-center py-12">Đang tải đẳng thứ...</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">🏅 Hệ thống Đẳng thứ</h2>
      {ranks.length === 0 ? (
        <p className="text-zinc-500 text-center py-8">Chưa có đẳng thứ nào được cấu hình.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ranks
            .sort((a, b) => a.rankOrder - b.rankOrder)
            .map((r) => (
              <div
                key={r.id}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 hover:border-amber-600/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{r.iconUrl || '🏅'}</span>
                  <div>
                    <h3 className="text-white font-bold text-sm">{r.rankName}</h3>
                    {r.narrativeName && <p className="text-xs text-zinc-400">{r.narrativeName}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs mt-2">
                  <span className="bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded font-mono">
                    {r.rankCode}
                  </span>
                  <span className="bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded">
                    #{r.rankOrder}
                  </span>
                  {r.minExp !== undefined && r.minExp > 0 && (
                    <span className="bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded">
                      ≥{r.minExp} EXP
                    </span>
                  )}
                </div>
                {r.description && <p className="text-xs text-zinc-500 mt-2">{r.description}</p>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Skills Page
// ═══════════════════════════════════════════════════════════

export default function SkillsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('tree');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🎯</span> Kỹ Năng Hướng Đạo
        </h1>
        <p className="text-zinc-400 mt-1">
          Quản lý cây kỹ năng, duyệt bằng chứng, hệ thống đẳng thứ — STORY-003
        </p>
      </div>

      <div className="mb-6 flex gap-1 bg-zinc-800/60 border border-zinc-700 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'tree' && <SkillTreeTab />}
      {activeTab === 'verify' && <VerifyQueueTab showToast={showToast} />}
      {activeTab === 'ranks' && <RanksTab />}

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
