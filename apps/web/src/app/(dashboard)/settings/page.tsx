'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  GitBranch,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  ToggleLeft,
  ToggleRight,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface Organization {
  id: string;
  slug: string;
  name: string;
  fullName?: string | null;
  logoUrl?: string | null;
  subscriptionPlan?: string | null;
  isActive?: boolean;
  settings?: Record<string, unknown>;
}

interface Branch {
  id: string;
  code: string;
  name: string;
  narrativeName?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  colorTheme?: string | null;
}

interface Unit {
  id: string;
  name: string;
  totemName?: string | null;
  unitType?: string | null;
  branchId?: string | null;
  branch?: { name?: string | null; code?: string | null };
  childUnits?: unknown[];
}

interface OrgMember {
  id: string;
  branchId?: string | null;
  unitId?: string | null;
  status?: string | null;
}

const moduleCatalog = [
  { key: 'hrm', name: 'HRM members', description: 'Ho so, guardians, compliance va org chart' },
  { key: 'rewards', name: 'Rewards EXP', description: 'EXP, badge, leaderboard va shop' },
  { key: 'scout', name: 'Scout skills', description: 'Cay ky nang, dang thu, minh chung' },
  {
    key: 'sessions',
    name: 'Sessions',
    description: 'Buoi sinh hoat, diem danh, attendance report',
  },
  { key: 'events', name: 'Events camp', description: 'Su kien, dang ky, consent, check-in' },
  { key: 'lms', name: 'LMS', description: 'Course, lesson, quiz, battle va offline pack' },
  { key: 'finance', name: 'Finance', description: 'Thu chi, fee, ledger va reconciliation' },
  { key: 'assets', name: 'Assets', description: 'Tai san, loan, uniform, kit va maintenance' },
  { key: 'projects', name: 'Projects', description: 'Plan, project, task va kanban' },
  { key: 'tickets', name: 'Tickets', description: 'Ticket, approval va consent template' },
  { key: 'process', name: 'Process SOP', description: 'SOP, workflow, template va graph run' },
  { key: 'enrichment', name: 'Enrichment', description: 'Spiritual log, Ngu Gioi, mentoring' },
  {
    key: 'child_safety',
    name: 'Child safety',
    description: 'Incident, escalation va safety export',
  },
  {
    key: 'notifications',
    name: 'Notifications',
    description: 'In-app notification, preference va template',
  },
] as const;

function getEnabledModules(settings?: Record<string, unknown>) {
  const modules = settings?.modules;
  if (modules && typeof modules === 'object' && !Array.isArray(modules)) {
    return modules as Record<string, boolean>;
  }

  const legacyEnabledModules = settings?.enabledModules;
  if (Array.isArray(legacyEnabledModules)) {
    return Object.fromEntries(
      legacyEnabledModules
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => [entry.toLowerCase(), true]),
    );
  }

  return {};
}

function getAgeRange(branch: Branch) {
  if (branch.minAge && branch.maxAge) return `${branch.minAge}-${branch.maxAge} tuoi`;
  if (branch.minAge) return `Tu ${branch.minAge} tuoi`;
  if (branch.maxAge) return `Den ${branch.maxAge} tuoi`;
  return 'Chua khai bao do tuoi';
}

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const orgId = user?.orgId;

  const [org, setOrg] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [busyModule, setBusyModule] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrate, hydrated]);

  const load = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [orgData, branchRows, unitRows, memberRows] = await Promise.all([
        api.get<Organization>(`/organizations/id/${orgId}`),
        api.get<Branch[]>(`/organizations/${orgId}/branches`),
        api.get<Unit[]>(`/organizations/${orgId}/units`),
        api.get<OrgMember[]>(`/organizations/${orgId}/members`, { limit: 500 }),
      ]);
      setOrg(orgData);
      setName(orgData.name ?? '');
      setFullName(orgData.fullName ?? '');
      setLogoUrl(orgData.logoUrl ?? '');
      setBranches(branchRows);
      setUnits(unitRows);
      setMembers(memberRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc cau hinh to chuc');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const enabledModules = useMemo(() => getEnabledModules(org?.settings), [org?.settings]);
  const enabledCount = moduleCatalog.filter((module) => enabledModules[module.key]).length;

  async function saveOrgInfo() {
    if (!orgId || savingInfo) return;
    setSavingInfo(true);
    setError(null);
    setStatus(null);
    try {
      const updated = await api.patch<Organization>(`/organizations/${orgId}/info`, {
        name,
        fullName: fullName.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      });
      setOrg(updated);
      setStatus('Da luu thong tin to chuc.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong luu duoc thong tin to chuc');
    } finally {
      setSavingInfo(false);
    }
  }

  async function toggleModule(moduleKey: string) {
    if (!orgId || busyModule) return;
    const enabled = !enabledModules[moduleKey];
    setBusyModule(moduleKey);
    setError(null);
    setStatus(null);
    try {
      const updated = await api.patch<Organization>(
        `/organizations/${orgId}/modules/${moduleKey}`,
        {
          enabled,
        },
      );
      setOrg(updated);
      setStatus(`${moduleKey} da ${enabled ? 'bat' : 'tat'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong cap nhat duoc module');
    } finally {
      setBusyModule(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Dang tai settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Settings className="h-8 w-8 text-gray-500" />
            Cai dat
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cau hinh to chuc, module, branches va units lay truc tiep tu backend.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={!orgId || loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tai lai
        </Button>
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

      {!orgId ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Tai khoan hien tai chua co orgId nen khong the tai settings.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Thong tin to chuc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ten ngan</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Slug</label>
              <Input value={org?.slug ?? ''} disabled />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium">Ten day du</label>
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium">Logo URL</label>
              <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
            </div>
            <div className="rounded-md border p-3 text-sm">
              <p className="text-muted-foreground">Plan</p>
              <p className="font-medium">{org?.subscriptionPlan ?? '-'}</p>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{org?.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={saveOrgInfo} disabled={!orgId || savingInfo || !name.trim()}>
              {savingInfo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Luu thay doi
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ToggleRight className="h-5 w-5" />
            Quan ly Module
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {enabledCount}/{moduleCatalog.length} module dang bat trong organization settings.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {moduleCatalog.map((module) => {
              const enabled = Boolean(enabledModules[module.key]);
              return (
                <div
                  key={module.key}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-[hsl(var(--muted)_/_0.3)]"
                >
                  <div>
                    <p className="text-sm font-medium">{module.name}</p>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </div>
                  <button
                    onClick={() => toggleModule(module.key)}
                    className="shrink-0"
                    disabled={busyModule === module.key}
                    aria-label={`Toggle ${module.key}`}
                  >
                    {busyModule === module.key ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : enabled ? (
                      <ToggleRight className="h-8 w-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-gray-300" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5" />
            Quan ly Nganh
          </CardTitle>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Chua co branch trong to chuc.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {branches.map((branch) => {
                const memberCount = members.filter(
                  (member) => member.branchId === branch.id,
                ).length;
                return (
                  <div key={branch.id} className="space-y-2 rounded-lg border p-4 text-center">
                    <Badge
                      className="border-0"
                      style={{
                        backgroundColor: branch.colorTheme ? `${branch.colorTheme}22` : undefined,
                        color: branch.colorTheme ?? undefined,
                      }}
                    >
                      {branch.narrativeName || branch.name}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{getAgeRange(branch)}</p>
                    <p className="text-2xl font-bold">{memberCount}</p>
                    <p className="text-xs text-muted-foreground">thanh vien</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Quan ly Don vi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Chua co unit trong to chuc.
            </div>
          ) : (
            <div className="space-y-3">
              {units.map((unit) => {
                const memberCount = members.filter((member) => member.unitId === unit.id).length;
                return (
                  <div
                    key={unit.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{unit.totemName || unit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {unit.branch?.name ?? 'No branch'} · {unit.unitType ?? 'unit'} ·{' '}
                        {memberCount} thanh vien
                      </p>
                    </div>
                    <Badge variant="outline">{unit.childUnits?.length ?? 0} don vi con</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
