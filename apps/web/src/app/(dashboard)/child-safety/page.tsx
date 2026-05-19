'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpCircle,
  Clock,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ChildSafetyIncident {
  id: string;
  ticketNumber: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority: string;
  status: string;
  isAnonymous?: boolean;
  customFields?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Low', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-red-100 text-red-700 border-red-200' },
  assigned: { label: 'Assigned', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  in_progress: { label: 'Investigating', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  resolved: { label: 'Resolved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

function badgeConfig(value: string, config: Record<string, { label: string; className: string }>) {
  return config[value] ?? { label: value, className: 'bg-gray-100 text-gray-700 border-gray-200' };
}

function escalationLevel(incident: ChildSafetyIncident) {
  const value = incident.customFields?.escalationLevel;
  return typeof value === 'number' ? value : 0;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN');
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

export default function ChildSafetyPage() {
  const [incidents, setIncidents] = useState<ChildSafetyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportCategory, setReportCategory] = useState('child_safety_incident');
  const [reportDescription, setReportDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyIncidentId, setBusyIncidentId] = useState<string | null>(null);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ChildSafetyIncident[]>('/child-safety/incidents', { limit: 50 });
      setIncidents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc child-safety incidents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  const stats = useMemo(() => {
    const active = incidents.filter(
      (incident) => !['resolved', 'closed'].includes(incident.status),
    );
    const escalated = incidents.filter((incident) => escalationLevel(incident) > 0);
    const closed = incidents.filter((incident) => ['resolved', 'closed'].includes(incident.status));
    const avgResolutionDays =
      closed.length === 0
        ? 0
        : Math.round(
            closed.reduce((sum, incident) => {
              const created = new Date(incident.createdAt).getTime();
              const updated = new Date(incident.updatedAt).getTime();
              return sum + Math.max(0, updated - created) / 86400000;
            }, 0) / closed.length,
          );
    return { active: active.length, escalated: escalated.length, avgResolutionDays };
  }, [incidents]);

  async function reportIncident() {
    const title = reportTitle.trim();
    if (!title || submitting) return;
    setSubmitting(true);
    setError(null);
    setStatus(null);
    try {
      await api.post('/child-safety/incidents', {
        title,
        category: reportCategory || undefined,
        description: reportDescription.trim() || undefined,
        isAnonymous,
      });
      setReportTitle('');
      setReportDescription('');
      setIsAnonymous(false);
      setShowReportForm(false);
      setStatus('Da ghi nhan incident va tao sensitive ticket.');
      await loadIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong report duoc incident');
    } finally {
      setSubmitting(false);
    }
  }

  async function escalateIncident(incident: ChildSafetyIncident) {
    if (busyIncidentId) return;
    setBusyIncidentId(incident.id);
    setError(null);
    setStatus(null);
    try {
      await api.post(`/child-safety/incidents/${incident.id}/escalate`);
      setStatus(`Da escalate ${incident.ticketNumber}.`);
      await loadIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong escalate duoc incident');
    } finally {
      setBusyIncidentId(null);
    }
  }

  async function exportIncident(incident: ChildSafetyIncident) {
    if (busyIncidentId) return;
    setBusyIncidentId(incident.id);
    setError(null);
    try {
      const payload = await api.get(`/child-safety/incidents/${incident.id}/export`);
      downloadJson(`${incident.ticketNumber}_council_export.json`, payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong export duoc incident');
    } finally {
      setBusyIncidentId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <ShieldAlert className="h-8 w-8 text-red-500" />
            Child safety
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Restricted incident workspace backed by sensitive ticket APIs and audit logging.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadIncidents} disabled={loading}>
            <RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="destructive" onClick={() => setShowReportForm((value) => !value)}>
            <Plus className="mr-1 h-4 w-4" />
            Report incident
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
        <p className="text-sm font-medium text-red-700">
          Restricted area. Access, export, escalation, and incident changes must be treated as
          audited PII/safety activity.
        </p>
      </div>

      {(error || status) && (
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

      {showReportForm && (
        <Card className="border-red-200">
          <CardContent className="space-y-3 p-4">
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Incident title"
              value={reportTitle}
              onChange={(event) => setReportTitle(event.target.value)}
            />
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Category"
              value={reportCategory}
              onChange={(event) => setReportCategory(event.target.value)}
            />
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Description"
              value={reportDescription}
              onChange={(event) => setReportDescription(event.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
              />
              Anonymous report
            </label>
            <Button
              variant="destructive"
              disabled={!reportTitle.trim() || submitting}
              onClick={reportIncident}
            >
              {submitting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Submit incident
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active incidents"
          value={stats.active}
          icon={<ShieldAlert className="h-6 w-6 text-red-500" />}
          tone="red"
        />
        <MetricCard
          label="Avg resolution days"
          value={stats.avgResolutionDays}
          icon={<Clock className="h-6 w-6 text-blue-500" />}
          tone="blue"
        />
        <MetricCard
          label="Escalated"
          value={stats.escalated}
          icon={<ArrowUpCircle className="h-6 w-6 text-amber-500" />}
          tone="amber"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Incident list</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : incidents.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              Khong co incident sensitive ticket nao.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-3 pr-4">Ticket</th>
                    <th className="py-3 pr-4">Title</th>
                    <th className="py-3 pr-4">Priority</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Escalation</th>
                    <th className="py-3 pr-4">Reported</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => {
                    const priority = badgeConfig(incident.priority, PRIORITY_CONFIG);
                    const state = badgeConfig(incident.status, STATUS_CONFIG);
                    const level = escalationLevel(incident);
                    return (
                      <tr key={incident.id} className="border-b align-top last:border-b-0">
                        <td className="py-3 pr-4 font-mono font-medium">{incident.ticketNumber}</td>
                        <td className="min-w-64 py-3 pr-4">
                          <p className="font-medium">{incident.title}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {incident.category ?? 'child_safety_incident'}
                            {incident.isAnonymous ? ' - anonymous' : ''}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={cn('border', priority.className)}>
                            {priority.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={cn('border', state.className)}>{state.label}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={cn('font-medium', level >= 2 ? 'text-red-600' : '')}>
                            {level > 0 ? `Level ${level}` : '-'}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{formatDate(incident.createdAt)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyIncidentId === incident.id}
                              onClick={() => escalateIncident(incident)}
                            >
                              Escalate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyIncidentId === incident.id}
                              onClick={() => exportIncident(incident)}
                            >
                              <Download className="mr-1 h-4 w-4" />
                              Export
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: 'red' | 'blue' | 'amber';
}) {
  const toneClass = {
    red: 'border-red-200 bg-red-50',
    blue: 'border-blue-200 bg-blue-50',
    amber: 'border-amber-200 bg-amber-50',
  }[tone];

  return (
    <Card className={toneClass}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
