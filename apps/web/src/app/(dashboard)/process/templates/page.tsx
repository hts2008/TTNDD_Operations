'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileJson,
  Package,
  Search,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TemplateNode {
  id: string;
  type: string;
  label?: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
}

interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

interface WorkflowTemplate {
  slug: string;
  name: string;
  description?: string | null;
  category?: string | null;
  nodesJson?: unknown;
  edgesJson?: unknown;
  triggersJson?: unknown;
  isBuiltIn?: boolean;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string | null;
  nodesJson?: unknown;
  edgesJson?: unknown;
  isActive?: boolean;
  createdAt?: string;
}

interface WorkflowExport {
  name: string;
  description?: string | null;
  nodes: unknown[];
  edges: unknown[];
  triggers?: unknown[];
  version?: number;
  exportedAt?: string;
}

const CATEGORY_META: Record<string, { label: string; className: string }> = {
  onboarding: { label: 'Onboarding', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  finance: { label: 'Finance', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  safety: { label: 'Safety', className: 'bg-red-100 text-red-700 border-red-200' },
  operations: {
    label: 'Operations',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  communication: {
    label: 'Communication',
    className: 'bg-violet-100 text-violet-700 border-violet-200',
  },
};

const NODE_TYPE_COLORS: Record<string, string> = {
  start: 'bg-emerald-500',
  end: 'bg-slate-500',
  task: 'bg-blue-500',
  approval: 'bg-amber-500',
  notification: 'bg-violet-500',
  condition: 'bg-orange-500',
  delay: 'bg-cyan-500',
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeCategory(category?: string | null) {
  return category?.trim() || 'uncategorized';
}

function categoryLabel(category: string) {
  return CATEGORY_META[category]?.label ?? category;
}

function categoryClass(category: string) {
  return CATEGORY_META[category]?.className ?? 'bg-gray-100 text-gray-700 border-gray-200';
}

function MiniFlowPreview({ nodes }: { nodes: TemplateNode[] }) {
  const visibleNodes = nodes.slice(0, 8);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visibleNodes.map((node, index) => (
        <div key={`${node.id}-${index}`} className="flex items-center gap-1">
          <div
            className={cn('h-2 w-2 rounded-full', NODE_TYPE_COLORS[node.type] || 'bg-gray-500')}
          />
          <span className="max-w-[90px] truncate text-[10px] text-muted-foreground">
            {node.label || node.type}
          </span>
          {index < visibleNodes.length - 1 && (
            <span className="text-[10px] text-muted-foreground/50">to</span>
          )}
        </div>
      ))}
      {nodes.length > visibleNodes.length && (
        <span className="text-[10px] text-muted-foreground">
          +{nodes.length - visibleNodes.length}
        </span>
      )}
    </div>
  );
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function TemplatesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState('');
  const [installedSlugs, setInstalledSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [templateData, definitionData] = await Promise.all([
        api.get<WorkflowTemplate[]>('/process/templates'),
        api.get<WorkflowDefinition[]>('/process/definitions', { limit: 100 }),
      ]);
      setTemplates(templateData);
      setDefinitions(definitionData);
      setSelectedTemplate((current) => {
        if (!current) return templateData[0] ?? null;
        return (
          templateData.find((template) => template.slug === current.slug) ?? templateData[0] ?? null
        );
      });
      setSelectedDefinitionId((current) => current || definitionData[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc template library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const categories = useMemo(() => {
    const values = new Set(templates.map((template) => safeCategory(template.category)));
    return ['all', ...Array.from(values).sort()];
  }, [templates]);

  const filtered = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return templates.filter((template) => {
      const category = safeCategory(template.category);
      const matchCategory = activeCategory === 'all' || category === activeCategory;
      const matchSearch =
        !search ||
        template.name.toLowerCase().includes(search) ||
        (template.description ?? '').toLowerCase().includes(search) ||
        category.toLowerCase().includes(search);
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchQuery, templates]);

  async function handleInstall(template: WorkflowTemplate) {
    if (busySlug) return;
    setBusySlug(template.slug);
    setStatus(null);
    setError(null);
    try {
      const definition = await api.post<WorkflowDefinition>(
        `/process/templates/${template.slug}/install`,
      );
      setInstalledSlugs((prev) => (prev.includes(template.slug) ? prev : [...prev, template.slug]));
      setDefinitions((prev) => [definition, ...prev.filter((item) => item.id !== definition.id)]);
      setSelectedDefinitionId(definition.id);
      setStatus(`Da cai template "${template.name}" thanh workflow definition.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong cai duoc template');
    } finally {
      setBusySlug(null);
    }
  }

  async function handleExport() {
    if (!selectedDefinitionId || exporting) return;
    setExporting(true);
    setStatus(null);
    setError(null);
    try {
      const exported = await api.post<WorkflowExport>(
        `/process/definitions/${selectedDefinitionId}/export`,
      );
      const filename = `${exported.name || 'workflow-definition'}.json`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      downloadJson(`${filename || 'workflow-definition'}.json`, exported);
      setStatus('Da xuat workflow JSON.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong xuat duoc workflow');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || importing) return;

    setImporting(true);
    setStatus(null);
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (
        typeof parsed.name !== 'string' ||
        !Array.isArray(parsed.nodes) ||
        !Array.isArray(parsed.edges)
      ) {
        throw new Error('File JSON phai co name, nodes va edges.');
      }
      const definition = await api.post<WorkflowDefinition>('/process/definitions/import', parsed);
      setDefinitions((prev) => [definition, ...prev.filter((item) => item.id !== definition.id)]);
      setSelectedDefinitionId(definition.id);
      setStatus(`Da nhap workflow "${definition.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong nhap duoc JSON');
    } finally {
      setImporting(false);
    }
  }

  const selectedNodes = asArray<TemplateNode>(selectedTemplate?.nodesJson);
  const selectedEdges = asArray<TemplateEdge>(selectedTemplate?.edgesJson);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/process">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Quay lai
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Thu vien mau quy trinh</h1>
            <p className="text-sm text-muted-foreground">
              Cai template tu backend catalog, nhap JSON, hoac xuat workflow definition hien co.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedDefinitionId}
            onChange={(event) => setSelectedDefinitionId(event.target.value)}
            disabled={definitions.length === 0}
          >
            {definitions.length === 0 ? (
              <option value="">Chua co workflow</option>
            ) : (
              definitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.name}
                </option>
              ))
            )}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1 h-4 w-4" />
            {importing ? 'Dang nhap' : 'Nhap JSON'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedDefinitionId || exporting}
            onClick={handleExport}
          >
            <Download className="mr-1 h-4 w-4" />
            {exporting ? 'Dang xuat' : 'Xuat JSON'}
          </Button>
        </div>
      </div>

      {(status || error) && (
        <div
          className={cn(
            'rounded-md border px-4 py-3 text-sm',
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
          )}
        >
          {error ?? status}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tim kiem mau..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory(category)}
            >
              {category === 'all' ? 'Tat ca' : categoryLabel(category)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-56 animate-pulse rounded-lg border bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-medium">Khong tim thay mau</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Doi bo loc, seed template o backend, hoac nhap workflow JSON.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((template) => {
                const category = safeCategory(template.category);
                const nodes = asArray<TemplateNode>(template.nodesJson);
                const edges = asArray<TemplateEdge>(template.edgesJson);
                const isInstalled = installedSlugs.includes(template.slug);
                const isSelected = selectedTemplate?.slug === template.slug;

                return (
                  <Card
                    key={template.slug}
                    className={cn('transition-colors', isSelected && 'border-primary')}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">{template.name}</CardTitle>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn('border text-[11px]', categoryClass(category))}
                            >
                              {categoryLabel(category)}
                            </Badge>
                            {template.isBuiltIn && <Badge variant="secondary">Built-in</Badge>}
                          </div>
                        </div>
                        <Package className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                        {template.description || 'Template chua co mo ta.'}
                      </p>
                      <div className="rounded-lg border bg-muted/40 p-3">
                        <MiniFlowPreview nodes={nodes} />
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{nodes.length} nodes</span>
                        <span>{edges.length} edges</span>
                        <span>{asArray(template.triggersJson).length} triggers</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={isInstalled || busySlug === template.slug}
                          onClick={() => handleInstall(template)}
                        >
                          {isInstalled ? (
                            <>
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Da cai
                            </>
                          ) : (
                            <>
                              <Download className="mr-1 h-4 w-4" />
                              {busySlug === template.slug ? 'Dang cai' : 'Cai dat'}
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTemplate(template)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Xem
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileJson className="h-5 w-5" />
              Template preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedTemplate ? (
              <p className="text-sm text-muted-foreground">Chon mot template de xem cau truc.</p>
            ) : (
              <>
                <div>
                  <h2 className="font-semibold">{selectedTemplate.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedTemplate.description || 'Template chua co mo ta.'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-lg font-semibold">{selectedNodes.length}</p>
                    <p className="text-xs text-muted-foreground">Nodes</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-lg font-semibold">{selectedEdges.length}</p>
                    <p className="text-xs text-muted-foreground">Edges</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-lg font-semibold">
                      {asArray(selectedTemplate.triggersJson).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Triggers</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedNodes.map((node, index) => (
                    <div
                      key={`${node.id}-${index}`}
                      className="flex items-center gap-3 rounded-md border p-3"
                    >
                      <div
                        className={cn(
                          'h-2.5 w-2.5 rounded-full',
                          NODE_TYPE_COLORS[node.type] || 'bg-gray-500',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{node.label || node.id}</p>
                        <p className="text-xs text-muted-foreground">{node.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  disabled={
                    busySlug === selectedTemplate.slug ||
                    installedSlugs.includes(selectedTemplate.slug)
                  }
                  onClick={() => handleInstall(selectedTemplate)}
                >
                  <Download className="mr-1 h-4 w-4" />
                  {installedSlugs.includes(selectedTemplate.slug)
                    ? 'Da cai dat'
                    : 'Cai template nay'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
