'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings, ToggleLeft, ToggleRight, RefreshCw,
  Shield, Package, Zap, RotateCcw,
} from 'lucide-react';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  scope: 'global' | 'org' | 'user';
  description: string;
  defaultValue: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<FeatureFlag[]>('/system/feature-flags');
      setFlags(data);
    } catch (err) {
      console.error('Failed to load flags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (key: string, enabled: boolean) => {
    setToggling(key);
    try {
      await apiFetch(`/system/feature-flags/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled } : f));
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setToggling(null);
    }
  };

  const reset = async (key: string) => {
    setToggling(key);
    try {
      await apiFetch(`/system/feature-flags/${encodeURIComponent(key)}`, { method: 'DELETE' });
      await refresh();
    } finally {
      setToggling(null);
    }
  };

  const moduleFlags = flags.filter((f) => f.key.startsWith('module.'));
  const featureFlags = flags.filter((f) => f.key.startsWith('feature.'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Feature Flags
          </h1>
          <p className="text-muted-foreground">Bật/tắt modules và tính năng cho tổ chức</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Module Flags */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Modules</h3>
          <span className="text-xs text-muted-foreground ml-2">
            {moduleFlags.filter((f) => f.enabled).length}/{moduleFlags.length} active
          </span>
        </div>
        <div className="divide-y">
          {moduleFlags.map((flag) => (
            <FlagRow
              key={flag.key}
              flag={flag}
              toggling={toggling === flag.key}
              onToggle={(enabled) => toggle(flag.key, enabled)}
              onReset={() => reset(flag.key)}
            />
          ))}
        </div>
      </div>

      {/* Feature Flags */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Features</h3>
          <span className="text-xs text-muted-foreground ml-2">
            {featureFlags.filter((f) => f.enabled).length}/{featureFlags.length} active
          </span>
        </div>
        <div className="divide-y">
          {featureFlags.map((flag) => (
            <FlagRow
              key={flag.key}
              flag={flag}
              toggling={toggling === flag.key}
              onToggle={(enabled) => toggle(flag.key, enabled)}
              onReset={() => reset(flag.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FlagRow({
  flag,
  toggling,
  onToggle,
  onReset,
}: {
  flag: FeatureFlag;
  toggling: boolean;
  onToggle: (enabled: boolean) => void;
  onReset: () => void;
}) {
  const isOverridden = flag.enabled !== flag.defaultValue;

  return (
    <div className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Shield className={`h-4 w-4 shrink-0 ${flag.enabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium truncate">{flag.key}</span>
            {isOverridden && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                overridden
              </span>
            )}
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {flag.scope}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{flag.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {isOverridden && (
          <button
            onClick={onReset}
            disabled={toggling}
            className="text-xs text-muted-foreground hover:text-foreground"
            title="Reset to default"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onToggle(!flag.enabled)}
          disabled={toggling}
          className="transition-colors disabled:opacity-50"
        >
          {flag.enabled ? (
            <ToggleRight className="h-7 w-7 text-emerald-500" />
          ) : (
            <ToggleLeft className="h-7 w-7 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
