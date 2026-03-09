'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { HudTopBar } from '@/components/layout/hud-top-bar';
import { QuestPanel } from '@/components/layout/quest-panel';

// Mock data — will be replaced by TanStack Query + real API
const MOCK_HUD = {
  memberName: 'Trần Hải Sơn',
  rankName: 'Hướng Thiện',
  rankTier: 2,
  currentExp: 2_340,
  nextLevelExp: 5_000,
  level: 8,
  streak: 5,
  activeQuests: 3,
};

const MOCK_QUESTS = [
  {
    id: '1',
    title: 'Hoàn thành chuyên hiệu Nút Dây',
    category: 'skill' as const,
    progress: 65,
    expReward: 200,
    completed: false,
  },
  {
    id: '2',
    title: 'Tham gia sinh hoạt tuần này',
    category: 'session' as const,
    progress: 0,
    expReward: 100,
    completed: false,
  },
  {
    id: '3',
    title: 'Ghi nhật ký thiện nguyện',
    category: 'enrichment' as const,
    progress: 30,
    expReward: 150,
    completed: false,
  },
  {
    id: '4',
    title: 'Hoàn thành bài kiểm tra sơ cứu',
    category: 'skill' as const,
    progress: 100,
    expReward: 250,
    completed: true,
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [questPanelOpen, setQuestPanelOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[hsl(var(--background))]">
      {/* Left: Sidebar Navigation */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Center: Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Standard Header (breadcrumbs, user menu) */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* MMORPG HUD Bar — below header */}
        <div className="border-b border-[hsl(var(--border)_/_0.3)] bg-[hsl(var(--background))] px-4 py-2 lg:px-6">
          <HudTopBar {...MOCK_HUD} />
        </div>

        {/* Content + Quest Panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content */}
          <main className="flex-1 overflow-auto bg-[hsl(var(--muted)_/_0.3)] p-4 lg:p-6">
            {children}
          </main>

          {/* Right: Quest Panel (desktop only, collapsible) */}
          {questPanelOpen && (
            <aside className="hidden xl:block w-72 overflow-y-auto border-l border-[hsl(var(--border)_/_0.3)] bg-[hsl(var(--background))] p-3">
              <QuestPanel quests={MOCK_QUESTS} />

              {/* Toggle button */}
              <button
                onClick={() => setQuestPanelOpen(false)}
                className="mt-3 w-full rounded-lg border border-[hsl(var(--border)_/_0.5)] py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Ẩn nhiệm vụ
              </button>
            </aside>
          )}
        </div>
      </div>

      {/* Floating quest toggle when panel is hidden */}
      {!questPanelOpen && (
        <button
          onClick={() => setQuestPanelOpen(true)}
          className="fixed bottom-4 right-4 z-50 hidden xl:flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg hover:scale-110 transition-transform"
          title="Hiện nhiệm vụ"
        >
          📋
        </button>
      )}
    </div>
  );
}
