'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, RefreshCw,
  Activity, Server, Database, Bell, ChevronRight,
  XCircle, Clock,
} from 'lucide-react';

interface ModuleStatus {
  key: string;
  active: boolean;
  ready: boolean;
  reasons: string[];
  seedCount: number;
}

interface ModuleHealthResult {
  orgId: string;
  profile: string;
  checkedAt: string;
  modules: ModuleStatus[];
  overall: 'PASS' | 'FAIL';
  failCount: number;
}

interface Blocker {
  module: string;
  severity: 'critical' | 'warning';
  message: string;
}

interface ActivationResult {
  totalBlockers: number;
  criticalCount: number;
  warningCount: number;
  blockers: Blocker[];
  canActivate: boolean;
  checkedAt: string;
}

interface ReleaseGate {
  id: string;
  environment: string;
  profile: string;
  status: string;
  buildId?: string;
  commitSha?: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : ''}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function StatusBadge({ status }: { status: 'PASS' | 'FAIL' | string }) {
  const pass = status === 'PASS' || status === 'ok';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      pass ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
           : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      {pass ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {status}
    </span>
  );
}

export default function ReleaseDashboardPage() {
  const [health, setHealth] = useState<ModuleHealthResult | null>(null);
  const [blockers, setBlockers] = useState<ActivationResult | null>(null);
  const [gate, setGate] = useState<ReleaseGate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, b, g] = await Promise.all([
        apiFetch<ModuleHealthResult>('/system/module-health'),
        apiFetch<ActivationResult>('/system/activation-blockers'),
        apiFetch<ReleaseGate>('/system/release-gates/latest'),
      ]);
      setHealth(h);
      setBlockers(b);
      setGate(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const moduleIcon = (key: string) => {
    switch (key) {
      case 'HRM': return <Server className="h-4 w-4" />;
      case 'NOTIFICATIONS': return <Bell className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Release Dashboard</h1>
          <p className="text-muted-foreground">Module health, activation blockers &amp; release gates</p>
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

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-primary/10 p-2"><Shield className="h-5 w-5 text-primary" /></div>
            <h3 className="font-semibold">Module Health</h3>
          </div>
          {health ? (
            <div className="space-y-2">
              <StatusBadge status={health.overall} />
              <p className="text-sm text-muted-foreground">
                {health.modules.filter(m => m.ready).length}/{health.modules.length} modules ready
              </p>
            </div>
          ) : <div className="h-8 animate-pulse rounded bg-muted" />}
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-amber-500/10 p-2"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
            <h3 className="font-semibold">Activation Blockers</h3>
          </div>
          {blockers ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {blockers.totalBlockers}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({blockers.criticalCount} critical, {blockers.warningCount} warnings)
                </span>
              </div>
              <StatusBadge status={blockers.canActivate ? 'PASS' : 'FAIL'} />
            </div>
          ) : <div className="h-8 animate-pulse rounded bg-muted" />}
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-blue-500/10 p-2"><Activity className="h-5 w-5 text-blue-500" /></div>
            <h3 className="font-semibold">Release Gate</h3>
          </div>
          {gate ? (
            <div className="space-y-2">
              <StatusBadge status={gate.status?.toUpperCase() ?? 'PENDING'} />
              <p className="text-sm text-muted-foreground">
                {gate.profile ?? 'No reports'} • {gate.environment ?? '—'}
              </p>
              {gate.createdAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />{new Date(gate.createdAt).toLocaleString('vi-VN')}
                </p>
              )}
            </div>
          ) : <div className="h-8 animate-pulse rounded bg-muted" />}
        </div>
      </div>

      {/* Module Health Grid */}
      {health && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4"><h3 className="font-semibold">Module Status</h3></div>
          <div className="divide-y">
            {health.modules.map((mod) => (
              <div key={mod.key} className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {moduleIcon(mod.key)}
                  <span className="font-medium text-sm">{mod.key}</span>
                  {mod.seedCount > 0 && (
                    <span className="text-xs text-muted-foreground">({mod.seedCount} records)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {mod.ready ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {mod.reasons.length > 0 && (
                    <span className="text-xs text-muted-foreground max-w-xs truncate">{mod.reasons[0]}</span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blockers List */}
      {blockers && blockers.blockers.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4"><h3 className="font-semibold">Activation Blockers</h3></div>
          <div className="divide-y">
            {blockers.blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-3 px-6 py-3">
                {b.severity === 'critical' ? (
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                )}
                <div>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    b.severity === 'critical'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>{b.module}</span>
                  <p className="text-sm mt-1">{b.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checked timestamp */}
      {health && (
        <p className="text-xs text-muted-foreground text-right">
          Last check: {new Date(health.checkedAt).toLocaleString('vi-VN')}
        </p>
      )}
    </div>
  );
}
