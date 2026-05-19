'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageError, PageLoading } from '@/components/ui/page-states';
import {
  ApprovalFlowResponse,
  ApprovalFlowStepper,
  ApprovalFlowView,
  getApprovalSummary,
} from '@/components/ui/approval-flow-stepper';
import { api } from '@/lib/api';
import { ArrowRight, CheckCircle2, Clock, FilePlus, XCircle } from 'lucide-react';

interface Ticket {
  id: string;
  ticketNumber?: string;
  title: string;
  requesterId?: string;
  status: string;
  createdAt: string;
  description?: string;
  customFields?: {
    approvalRequest?: ApprovalFlowView;
  };
}

interface ApprovalRow {
  id: string;
  ticketNumber?: string;
  type: string;
  title: string;
  requester: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string | Date;
  description?: string;
  approvalResponse: ApprovalFlowResponse;
}

export default function ApprovalsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('pending');
  const [flowMap, setFlowMap] = useState<Record<string, ApprovalFlowResponse>>({});
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function loadRequests() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEnvelope<Ticket[]>('/tickets', { limit: 100 });
      setTickets(data.data);
      const approvalTickets = data.data.filter((ticket) => ticket.customFields?.approvalRequest);
      const entries = await Promise.all(
        approvalTickets.map(async (ticket) => {
          try {
            const flow = await api.get<ApprovalFlowResponse>(`/tickets/${ticket.id}/approval-flow`);
            return [ticket.id, flow] as const;
          } catch {
            return [
              ticket.id,
              {
                ticketId: ticket.id,
                legacyApprovalRequest: ticket.customFields?.approvalRequest ?? null,
              } satisfies ApprovalFlowResponse,
            ] as const;
          }
        }),
      );
      setFlowMap(Object.fromEntries(entries));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong the tai approvals');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    if (actioningId) return;
    setActioningId(id);
    setError(null);
    try {
      await api.post(`/tickets/${id}/approve`, {
        decision: action,
        notes:
          action === 'approve' ? 'Approved from approvals page' : 'Rejected from approvals page',
      });
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong the cap nhat approval');
    } finally {
      setActioningId(null);
    }
  }

  const requests = useMemo<ApprovalRow[]>(() => {
    const rows: ApprovalRow[] = [];
    tickets.forEach((ticket) => {
      const approval = ticket.customFields?.approvalRequest;
      if (!approval) return;
      const approvalResponse =
        flowMap[ticket.id] ??
        ({
          ticketId: ticket.id,
          legacyApprovalRequest: approval,
        } satisfies ApprovalFlowResponse);
      const summary = getApprovalSummary(approvalResponse);
      rows.push({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        type: summary?.type ?? approval.type ?? approval.approvalType ?? 'general',
        title: ticket.title,
        requester: approval.requestedBy ?? ticket.requesterId ?? '-',
        status: (summary?.status ?? approval.status ?? 'pending') as
          | 'pending'
          | 'approved'
          | 'rejected',
        createdAt: approval.requestedAt ?? ticket.createdAt,
        description:
          summary?.notes ??
          approval.notes ??
          (summary?.amount
            ? `${summary.amount.toLocaleString('vi-VN')} VND`
            : approval.amount
              ? `${approval.amount.toLocaleString('vi-VN')} VND`
              : ticket.description),
        approvalResponse,
      });
    });
    return rows;
  }, [flowMap, tickets]);

  const statusBadge = (s: string) => {
    const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
      pending: {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: 'Cho duyet',
        cls: 'bg-amber-100 text-amber-700',
      },
      approved: {
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        label: 'Da duyet',
        cls: 'bg-emerald-100 text-emerald-700',
      },
      rejected: {
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: 'Tu choi',
        cls: 'bg-red-100 text-red-700',
      },
    };
    const v = map[s] || map.pending;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${v.cls}`}
      >
        {v.icon}
        {v.label}
      </span>
    );
  };

  const filtered = requests.filter((r) => tab === 'all' || r.status === tab);
  const tabs = [
    {
      key: 'pending',
      label: 'Cho duyet',
      count: requests.filter((r) => r.status === 'pending').length,
    },
    {
      key: 'approved',
      label: 'Da duyet',
      count: requests.filter((r) => r.status === 'approved').length,
    },
    {
      key: 'rejected',
      label: 'Tu choi',
      count: requests.filter((r) => r.status === 'rejected').length,
    },
    { key: 'all', label: 'Tat ca', count: requests.length },
  ];

  if (loading) return <PageLoading message="Dang tai approval tickets..." />;
  if (error) return <PageError message={error} onRetry={loadRequests} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phe duyet</h1>
          <p className="text-muted-foreground">
            Nguon du lieu: tickets co customFields.approvalRequest.
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            window.location.href = '/tickets';
          }}
        >
          <FilePlus className="h-4 w-4" />
          Tao ticket
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">Khong co yeu cau phe duyet.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card
              key={r.id}
              className="motion-panel transition-shadow hover:shadow-md"
              data-testid={`approval-row-${r.id}`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">
                        {r.ticketNumber ? `${r.ticketNumber} - ` : ''}
                        {r.title}
                      </h3>
                      {statusBadge(r.status)}
                    </div>
                    <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                      <span>Requester: {r.requester}</span>
                      <span>Type: {r.type}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    {r.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                    )}
                  </div>
                  {r.status === 'pending' ? (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="motion-pressable text-red-600 hover:bg-red-50"
                        disabled={Boolean(actioningId)}
                        onClick={() => void handleAction(r.id, 'reject')}
                      >
                        {actioningId === r.id ? 'Dang xu ly' : 'Tu choi'}
                      </Button>
                      <Button
                        size="sm"
                        className="motion-pressable bg-emerald-600 hover:bg-emerald-700"
                        disabled={Boolean(actioningId)}
                        onClick={() => void handleAction(r.id, 'approve')}
                      >
                        {actioningId === r.id ? 'Dang xu ly' : 'Phe duyet'}
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="motion-pressable rounded-md p-2 text-muted-foreground hover:bg-muted"
                      aria-label="Mo ticket"
                      onClick={() => {
                        window.location.href = `/tickets/${r.id}`;
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <ApprovalFlowStepper
                  response={r.approvalResponse}
                  compact
                  title="Approval path"
                  className="mt-4 bg-background/70"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
