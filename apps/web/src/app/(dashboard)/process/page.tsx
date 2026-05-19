'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileCheck,
  FileText,
  GitBranch,
  Play,
  Plus,
  Search,
  Send,
  Tags,
  Workflow,
  XCircle,
} from 'lucide-react';

type TabKey = 'workflows' | 'sops';

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string | null;
  steps?: unknown;
  nodesJson?: unknown;
  edgesJson?: unknown;
  version?: number;
  isActive?: boolean;
  _count?: { runs?: number };
}

interface WorkflowRun {
  id: string;
  status: string;
  currentStep?: number;
  currentNodeId?: string | null;
  activeNodeIds?: string[];
  stepResults?: unknown;
  createdAt: string;
  completedAt?: string | null;
  definition?: { name?: string | null };
}

interface SopVersionSummary {
  versionNo: number;
  status: string;
  publishedAt?: string | null;
}

interface SopDocument {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  tags: string[];
  status: string;
  updatedAt: string;
  createdBy?: string | null;
  versions?: SopVersionSummary[];
  _count?: { versions?: number; approvals?: number };
}

const RUN_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  in_progress: { label: 'In progress', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  waiting: { label: 'Waiting', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  succeeded: {
    label: 'Succeeded',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const SOP_STATUS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  draft: {
    label: 'Draft',
    icon: <FileText className="h-3 w-3" />,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  published: {
    label: 'Published',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  superseded: {
    label: 'Superseded',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  archived: {
    label: 'Archived',
    icon: <XCircle className="h-3 w-3" />,
    className: 'bg-red-100 text-red-600 border-red-200',
  },
};

function statusClass(config: Record<string, { className: string }>, status: string) {
  return config[status]?.className ?? 'bg-gray-100 text-gray-600 border-gray-200';
}

function workflowStepCount(definition: WorkflowDefinition) {
  if (Array.isArray(definition.nodesJson)) return definition.nodesJson.length;
  if (Array.isArray(definition.steps)) return definition.steps.length;
  return 0;
}

function latestVersion(sop: SopDocument) {
  return sop.versions?.[0]?.versionNo ?? sop._count?.versions ?? 1;
}

function latestVersionStatus(sop: SopDocument) {
  return sop.versions?.[0]?.status ?? sop.status;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

export default function ProcessPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('sops');
  const [sopSearch, setSopSearch] = useState('');
  const [sopCategoryFilter, setSopCategoryFilter] = useState('');
  const [sops, setSops] = useState<SopDocument[]>([]);
  const [sopCategories, setSopCategories] = useState<string[]>([]);
  const [workflowDefs, setWorkflowDefs] = useState<WorkflowDefinition[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingDefinitionId, setStartingDefinitionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sopData, categoryData, definitionData, runData] = await Promise.all([
        api.get<SopDocument[]>('/process/sops', {
          limit: 50,
          search: sopSearch || undefined,
          category: sopCategoryFilter || undefined,
        }),
        api.get<string[]>('/process/sops/categories'),
        api.get<WorkflowDefinition[]>('/process/definitions', { limit: 50 }),
        api.get<WorkflowRun[]>('/process/runs', { limit: 20 }),
      ]);
      setSops(sopData);
      setSopCategories(categoryData);
      setWorkflowDefs(definitionData);
      setWorkflowRuns(runData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc du lieu quy trinh');
    } finally {
      setLoading(false);
    }
  }, [sopCategoryFilter, sopSearch]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void loadData();
      },
      sopSearch ? 300 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [loadData, sopSearch]);

  const sopStats = useMemo(
    () => ({
      total: sops.length,
      published: sops.filter((sop) => sop.status === 'published').length,
      review: sops.filter((sop) => latestVersionStatus(sop) === 'review').length,
      draft: sops.filter((sop) => sop.status === 'draft').length,
    }),
    [sops],
  );

  async function startWorkflow(definitionId: string) {
    if (startingDefinitionId) return;
    setStartingDefinitionId(definitionId);
    setError(null);
    try {
      await api.post('/process/graph-runs', { definitionId });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong khoi chay duoc workflow');
    } finally {
      setStartingDefinitionId(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Workflow className="h-8 w-8 text-cyan-500" />
          Quy trinh & SOP
        </h1>
        {activeTab === 'sops' ? (
          <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="mr-1 h-4 w-4" /> Tao SOP moi
          </Button>
        ) : (
          <Link href="/process/workflow-builder">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
              <GitBranch className="mr-1 h-4 w-4" /> Workflow Builder
            </Button>
          </Link>
        )}
      </div>

      <div className="flex w-fit gap-1 rounded-lg bg-[hsl(var(--muted)_/_0.5)] p-1">
        <button
          onClick={() => setActiveTab('sops')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'sops'
              ? 'bg-white text-cyan-700 shadow'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
          )}
        >
          <BookOpen className="h-4 w-4" /> Thu vien SOP
        </button>
        <button
          onClick={() => setActiveTab('workflows')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'workflows'
              ? 'bg-white text-cyan-700 shadow'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
          )}
        >
          <GitBranch className="h-4 w-4" /> Quy trinh tu dong
        </button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <Button size="sm" variant="outline" onClick={loadData}>
              Thu lai
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'sops' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Tim kiem SOP..."
                value={sopSearch}
                onChange={(event) => setSopSearch(event.target.value)}
                className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <select
              value={sopCategoryFilter}
              onChange={(event) => setSopCategoryFilter(event.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Tat ca danh muc</option>
              {sopCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                <BookOpen className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '...' : sopStats.total}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Tong SOP</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '...' : sopStats.published}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Da ban hanh</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Send className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '...' : sopStats.review}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Cho duyet</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '...' : sopStats.draft}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Ban nhap</p>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Thu vien SOP ({loading ? '...' : sops.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : sops.length === 0 ? (
                <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">
                  <BookOpen className="mx-auto mb-3 h-12 w-12 opacity-30" />
                  <p>Khong co SOP phu hop.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sops.map((sop) => {
                    const statusCfg = SOP_STATUS[sop.status] ?? SOP_STATUS.draft;
                    return (
                      <div
                        key={sop.id}
                        className="flex items-start justify-between rounded-lg border p-4 transition-colors hover:bg-[hsl(var(--muted)_/_0.3)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15px] font-semibold">{sop.title}</h3>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              v{latestVersion(sop)}
                            </Badge>
                            <Badge
                              className={cn(
                                'flex items-center gap-1 border text-[10px]',
                                statusCfg.className,
                              )}
                            >
                              {statusCfg.icon} {statusCfg.label}
                            </Badge>
                            {latestVersionStatus(sop) === 'review' && (
                              <Badge className="border border-purple-200 bg-purple-100 text-[10px] text-purple-700">
                                Version waiting review
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-1 text-sm text-[hsl(var(--muted-foreground))]">
                            {sop.description || 'Chua co mo ta.'}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                            <span className="flex items-center gap-1">
                              <Tags className="h-3 w-3" />
                              {sop.tags.length ? sop.tags.join(', ') : 'No tags'}
                            </span>
                            <span>Danh muc: {sop.category ?? '-'}</span>
                            <span>Cap nhat: {formatDate(sop.updatedAt)}</span>
                            <span>By: {sop.createdBy ? sop.createdBy.slice(0, 8) : '-'}</span>
                          </div>
                        </div>
                        <Link href={`/process/sops/${sop.id}`}>
                          <Button variant="ghost" size="sm" className="ml-4 shrink-0">
                            <Eye className="mr-1 h-4 w-4" /> Xem
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'workflows' && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileCheck className="h-5 w-5" />
                Dinh nghia quy trinh ({loading ? '...' : workflowDefs.length})
              </CardTitle>
              <Link href="/process/workflow-builder">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-violet-300 text-violet-600 hover:bg-violet-50"
                >
                  <GitBranch className="mr-1 h-4 w-4" /> Mo Builder
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : workflowDefs.length === 0 ? (
                <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">
                  <GitBranch className="mx-auto mb-3 h-12 w-12 opacity-30" />
                  <p>Chua co workflow nao.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workflowDefs.map((definition) => (
                    <div
                      key={definition.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-[hsl(var(--muted)_/_0.3)]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{definition.name}</h3>
                          <Badge variant="outline" className="text-[10px]">
                            v{definition.version ?? 1}
                          </Badge>
                          <Badge
                            className={cn(
                              'border',
                              definition.isActive !== false
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200',
                            )}
                          >
                            {definition.isActive !== false ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          {definition.description || 'Chua co mo ta.'}
                        </p>
                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          {workflowStepCount(definition)} nodes/steps,{' '}
                          {definition._count?.runs ?? 0} runs
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0 gap-2">
                        <Link href={`/process/workflow-builder?definitionId=${definition.id}`}>
                          <Button variant="outline" size="sm">
                            <GitBranch className="mr-1 h-4 w-4" /> Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={startingDefinitionId === definition.id}
                          onClick={() => startWorkflow(definition.id)}
                        >
                          <Play className="mr-1 h-4 w-4" />
                          {startingDefinitionId === definition.id ? 'Starting' : 'Run'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitBranch className="h-5 w-5" />
                Quy trinh dang chay ({loading ? '...' : workflowRuns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((item) => (
                    <div key={item} className="h-24 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : workflowRuns.length === 0 ? (
                <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">
                  <Workflow className="mx-auto mb-3 h-12 w-12 opacity-30" />
                  <p>Chua co workflow run nao.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workflowRuns.map((run) => {
                    const statusCfg = RUN_STATUS[run.status] ?? {
                      label: run.status,
                      className: statusClass(RUN_STATUS, run.status),
                    };
                    const activeCount = run.activeNodeIds?.length ?? (run.currentNodeId ? 1 : 0);
                    return (
                      <div key={run.id} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">
                              {run.definition?.name ?? `Run ${run.id.slice(0, 8)}`}
                            </h3>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              Started {formatDate(run.createdAt)}
                              {run.completedAt ? `, completed ${formatDate(run.completedAt)}` : ''}
                            </p>
                          </div>
                          <Badge className={cn('border', statusCfg.className)}>
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 overflow-x-auto pt-1">
                          {[1, 2, 3, 4].map((step, index) => (
                            <div key={step} className="flex items-center">
                              <div
                                className={cn(
                                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                  index < (run.currentStep ?? 0)
                                    ? 'bg-cyan-500 text-white'
                                    : index === (run.currentStep ?? 0)
                                      ? 'bg-cyan-100 text-cyan-700 ring-2 ring-cyan-500'
                                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
                                )}
                              >
                                {step}
                              </div>
                              {index < 3 && (
                                <ChevronRight className="h-3 w-3 shrink-0 text-[hsl(var(--muted-foreground))]" />
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                          Current node: {run.currentNodeId ?? '-'}; active nodes: {activeCount}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
