'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { HudTopBar } from '@/components/layout/hud-top-bar';
import { QuestPanel } from '@/components/layout/quest-panel';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface MyDashboard {
  exp: {
    totalExp: number;
    availableExp: number;
  };
  skills: {
    details: Array<{
      skillName: string;
      currentLevel: number;
      maxLevel: number;
      completed: boolean;
    }>;
  };
  attendance: {
    rate: number;
  };
  upcoming: {
    sessions: Array<{ id: string; title: string }>;
  };
}

interface ExpSummary {
  totalExp?: number;
  availableExp?: number;
}

interface ScoutDashboard {
  stats: {
    currentRank?: {
      rank?: {
        rankName?: string;
        rankOrder?: number;
      };
    } | null;
  };
}

interface Quest {
  id: string;
  title: string;
  category: 'skill' | 'session' | 'project' | 'enrichment';
  progress: number;
  expReward: number;
  completed: boolean;
}

function nextLevelExp(totalExp: number) {
  return Math.max(500, Math.ceil((totalExp + 1) / 500) * 500);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [questPanelOpen, setQuestPanelOpen] = useState(true);
  const [myDashboard, setMyDashboard] = useState<MyDashboard | null>(null);
  const [expSummary, setExpSummary] = useState<ExpSummary | null>(null);
  const [scoutDashboard, setScoutDashboard] = useState<ScoutDashboard | null>(null);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!user?.memberId) {
      setMyDashboard(null);
      setExpSummary(null);
      setScoutDashboard(null);
      return;
    }

    let active = true;
    async function loadHud() {
      const [my, exp, scout] = await Promise.all([
        api.get<MyDashboard>('/dashboards/my'),
        api.get<ExpSummary>(`/rewards/exp/summary/${user!.memberId}`),
        api.get<ScoutDashboard>(`/scout/dashboard/${user!.memberId}`),
      ]);
      if (active) {
        setMyDashboard(my);
        setExpSummary(exp);
        setScoutDashboard(scout);
      }
    }

    void loadHud().catch(() => {
      if (active) {
        setMyDashboard(null);
        setExpSummary(null);
        setScoutDashboard(null);
      }
    });

    return () => {
      active = false;
    };
  }, [user?.memberId]);

  const totalExp = expSummary?.totalExp ?? myDashboard?.exp.totalExp ?? 0;
  const rank = scoutDashboard?.stats.currentRank?.rank;

  const quests = useMemo<Quest[]>(() => {
    const skillQuests =
      myDashboard?.skills.details
        .filter((skill) => !skill.completed)
        .slice(0, 3)
        .map((skill, index) => ({
          id: `skill-${index}-${skill.skillName}`,
          title: `Hoan thanh ${skill.skillName}`,
          category: 'skill' as const,
          progress:
            skill.maxLevel > 0 ? Math.round((skill.currentLevel / skill.maxLevel) * 100) : 0,
          expReward: 100,
          completed: false,
        })) ?? [];

    const sessionQuests =
      myDashboard?.upcoming.sessions.slice(0, 2).map((session) => ({
        id: `session-${session.id}`,
        title: `Tham gia ${session.title}`,
        category: 'session' as const,
        progress: 0,
        expReward: 50,
        completed: false,
      })) ?? [];

    return [...skillQuests, ...sessionQuests];
  }, [myDashboard]);

  return (
    <div className="motion-page flex h-screen bg-[hsl(var(--surface))]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="motion-panel border-b border-[hsl(var(--border)_/_0.65)] bg-[hsl(var(--card)_/_0.92)] px-4 py-2 shadow-sm lg:px-6">
          <HudTopBar
            memberName={user?.email ?? 'Unknown user'}
            rankName={rank?.rankName ?? 'No active rank'}
            rankTier={rank?.rankOrder ?? 1}
            currentExp={totalExp}
            nextLevelExp={nextLevelExp(totalExp)}
            level={Math.max(1, Math.floor(totalExp / 500) + 1)}
            streak={myDashboard?.attendance.rate ?? 0}
            activeQuests={quests.length}
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <main className="ttndd-command-surface motion-page min-w-0 flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>

          {questPanelOpen && (
            <aside className="motion-panel hidden w-72 overflow-y-auto border-l border-[hsl(var(--border)_/_0.65)] bg-[hsl(var(--card))] p-3 xl:block">
              <QuestPanel quests={quests} />
              <button
                onClick={() => setQuestPanelOpen(false)}
                className="motion-pressable mt-3 w-full rounded-md border border-[hsl(var(--border)_/_0.8)] py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              >
                An nhiem vu
              </button>
            </aside>
          )}
        </div>
      </div>

      {!questPanelOpen && (
        <button
          onClick={() => setQuestPanelOpen(true)}
          className="motion-pressable fixed bottom-4 right-4 z-50 hidden h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg xl:flex"
          title="Hien nhiem vu"
        >
          Q
        </button>
      )}
    </div>
  );
}
