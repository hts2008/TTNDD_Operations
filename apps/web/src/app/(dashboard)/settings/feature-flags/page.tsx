'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Flag,
  Loader2,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface Organization {
  id: string;
  settings?: Record<string, unknown>;
}

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: string;
  requiresRestart?: boolean;
}

const flagCatalog: FeatureFlag[] = [
  {
    key: 'WAREHOUSE_SYNC_ENABLED',
    name: 'BigQuery Sync',
    description: 'Dong bo du lieu van hanh len analytics warehouse',
    category: 'data',
  },
  {
    key: 'PEER_RECOGNITION_ENABLED',
    name: 'Peer recognition',
    description: 'Cho phep doan sinh gui nhan xet va diem cong cho nhau',
    category: 'rewards',
  },
  {
    key: 'QUIZ_BATTLE_ENABLED',
    name: 'Quiz battle',
    description: 'Bat dau tri realtime trong LMS',
    category: 'lms',
  },
  {
    key: 'OFFLINE_PACKS_ENABLED',
    name: 'Offline packs',
    description: 'Cho phep tai noi dung LMS de dung ngoai tuyen',
    category: 'system',
  },
  {
    key: 'PARENT_PORTAL_ENABLED',
    name: 'Parent portal',
    description: 'Phu huynh xem tien trinh va thong tin duoc phep cua con',
    category: 'hrm',
  },
  {
    key: 'LEADERBOARD_PUBLIC',
    name: 'Public leaderboard',
    description: 'Hien thi bang xep hang cho thanh vien trong org',
    category: 'rewards',
  },
  {
    key: 'AUTO_BADGE_AWARD',
    name: 'Auto badge award',
    description: 'Worker tu dong cap badge khi dat dieu kien',
    category: 'rewards',
  },
  {
    key: 'NOTIFICATION_EMAIL',
    name: 'Email notification',
    description: 'Gui email cho notification quan trong',
    category: 'notifications',
    requiresRestart: true,
  },
  {
    key: 'NOTIFICATION_PUSH',
    name: 'Push notification',
    description: 'Gui push notification cho ung dung mobile/PWA',
    category: 'notifications',
    requiresRestart: true,
  },
  {
    key: 'SOP_APPROVAL_REQUIRED',
    name: 'SOP approval required',
    description: 'SOP phai qua approval truoc khi publish',
    category: 'process',
  },
  {
    key: 'FINANCIAL_AUDIT_TRAIL',
    name: 'Financial audit trail',
    description: 'Ghi audit trail cho thay doi tai chinh',
    category: 'finance',
  },
  {
    key: 'CHILD_SAFETY_STRICT',
    name: 'Child safety strict mode',
    description: 'Bat cac guard nghiem ngat cho incident va retention',
    category: 'safety',
  },
  {
    key: 'DARK_MODE',
    name: 'Dark mode',
    description: 'Cho phep user chuyen giao dien toi',
    category: 'ui',
  },
  {
    key: 'EXPERIMENTAL_3D',
    name: 'Experimental 3D',
    description: 'Bat cac scene 3D thu nghiem tren dashboard',
    category: 'ui',
    requiresRestart: true,
  },
];

const categories: Record<string, string> = {
  rewards: 'Diem thuong',
  lms: 'Hoc tap',
  hrm: 'Nhan su',
  data: 'Du lieu',
  system: 'He thong',
  notifications: 'Thong bao',
  process: 'Quy trinh',
  finance: 'Tai chinh',
  safety: 'An toan',
  ui: 'Giao dien',
};

function getFeatureFlags(settings?: Record<string, unknown>) {
  const flags = settings?.featureFlags;
  if (flags && typeof flags === 'object' && !Array.isArray(flags)) {
    return flags as Record<string, boolean>;
  }
  return {};
}

export default function FeatureFlagsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const orgId = user?.orgId;

  const [org, setOrg] = useState<Organization | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrate, hydrated]);

  const load = useCallback(async () => {
    if (!orgId) {
      setOrg(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const orgData = await api.get<Organization>(`/organizations/id/${orgId}`);
      setOrg(orgData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc feature flags');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const flagState = useMemo(() => getFeatureFlags(org?.settings), [org?.settings]);
  const visibleCategories = useMemo(
    () => [...new Set(flagCatalog.map((flag) => flag.category))],
    [],
  );
  const filtered = flagCatalog.filter((flag) => {
    const matchSearch =
      !search ||
      flag.name.toLowerCase().includes(search.toLowerCase()) ||
      flag.key.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || flag.category === catFilter;
    return matchSearch && matchCat;
  });
  const enabledCount = flagCatalog.filter((flag) => Boolean(flagState[flag.key])).length;

  async function toggleFlag(key: string) {
    if (!orgId || busyKey) return;
    const currentSettings = org?.settings ?? {};
    const currentFlags = getFeatureFlags(currentSettings);
    const enabled = !currentFlags[key];
    const nextSettings = {
      ...currentSettings,
      featureFlags: {
        ...currentFlags,
        [key]: enabled,
      },
    };

    setBusyKey(key);
    setError(null);
    setStatus(null);
    try {
      const updated = await api.patch<Organization>(
        `/organizations/${orgId}/settings`,
        nextSettings,
      );
      setOrg(updated);
      setStatus(`${key} da ${enabled ? 'bat' : 'tat'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong cap nhat duoc feature flag');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Flag className="h-6 w-6" />
            Feature Flags
          </h1>
          <p className="text-muted-foreground">
            Bat/tat tinh nang bang organization.settings.featureFlags.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {enabledCount}/{flagCatalog.length} dang bat
          </span>
          <Button variant="outline" onClick={load} disabled={loading || !orgId}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Tai lai
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {status && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {status}
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm"
            placeholder="Tim feature flag..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={catFilter}
          onChange={(event) => setCatFilter(event.target.value)}
        >
          <option value="all">Tat ca</option>
          {visibleCategories.map((category) => (
            <option key={category} value={category}>
              {categories[category] || category}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Dang tai flags...
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Khong co flag phu hop bo loc.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((flag) => {
            const enabled = Boolean(flagState[flag.key]);
            return (
              <Card key={flag.key} className="transition-shadow hover:shadow-sm">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium">{flag.name}</h3>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{flag.key}</code>
                      {flag.requiresRestart && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          Can restart
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{flag.description}</p>
                    <span className="text-xs text-muted-foreground">
                      {categories[flag.category] || flag.category}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleFlag(flag.key)}
                    className="ml-4 shrink-0"
                    disabled={!orgId || busyKey === flag.key}
                    aria-label={`Toggle ${flag.key}`}
                  >
                    {busyKey === flag.key ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : enabled ? (
                      <ToggleRight className="h-8 w-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-gray-300" />
                    )}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
