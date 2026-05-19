import { AlertTriangle, CheckCircle2, Circle, Clock3, GitBranch, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ApprovalStepView {
  id?: string;
  stepOrder: number;
  stepName: string;
  approverRole?: string | null;
  approverUserId?: string | null;
  status: string;
  dueAt?: string | Date | null;
  decidedAt?: string | Date | null;
}

export interface ApprovalDecisionView {
  id?: string;
  stepId?: string | null;
  stepOrder?: number | null;
  decision?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | Date | null;
  notes?: string | null;
}

export interface ApprovalFlowView {
  id?: string;
  flowId?: string;
  approvalType?: string;
  type?: string;
  amount?: number | null;
  status?: string;
  currentStepOrder?: number;
  totalSteps?: number;
  requestedBy?: string;
  requestedAt?: string | Date | null;
  completedAt?: string | Date | null;
  slaDueAt?: string | Date | null;
  metadata?: Record<string, unknown> | null;
  notes?: string | null;
  decisionNotes?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | Date | null;
  steps?: ApprovalStepView[];
  decisions?: ApprovalDecisionView[];
}

export interface ApprovalFlowResponse {
  ticketId?: string;
  flow?: ApprovalFlowView | null;
  legacyApprovalRequest?: ApprovalFlowView | null;
  legacyApproval?: ApprovalFlowView | null;
}

interface ApprovalSummary {
  status: string;
  statusLabel: string;
  type: string;
  notes: string | null;
  amount: number | null;
  currentStepOrder: number;
  totalSteps: number;
  progressPct: number;
  isOverdue: boolean;
}

interface ApprovalFlowStepperProps {
  response?: ApprovalFlowResponse | ApprovalFlowView | null;
  compact?: boolean;
  title?: string;
  loading?: boolean;
  error?: string | null;
  className?: string;
  showHeader?: boolean;
}

const STATUS_META: Record<
  string,
  { label: string; icon: React.ReactNode; dot: string; chip: string; panel: string }
> = {
  pending: {
    label: 'Pending',
    icon: <Clock3 className="h-3.5 w-3.5" />,
    dot: 'border-amber-300 bg-amber-100 text-amber-700',
    chip: 'border-amber-200 bg-amber-50 text-amber-700',
    panel: 'border-amber-200 bg-amber-50/60',
  },
  approved: {
    label: 'Approved',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    dot: 'border-emerald-300 bg-emerald-100 text-emerald-700',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    panel: 'border-emerald-200 bg-emerald-50/60',
  },
  rejected: {
    label: 'Rejected',
    icon: <XCircle className="h-3.5 w-3.5" />,
    dot: 'border-red-300 bg-red-100 text-red-700',
    chip: 'border-red-200 bg-red-50 text-red-700',
    panel: 'border-red-200 bg-red-50/60',
  },
  skipped: {
    label: 'Skipped',
    icon: <Circle className="h-3.5 w-3.5" />,
    dot: 'border-slate-300 bg-slate-100 text-slate-600',
    chip: 'border-slate-200 bg-slate-50 text-slate-600',
    panel: 'border-slate-200 bg-slate-50/60',
  },
};

function isResponse(value: ApprovalFlowResponse | ApprovalFlowView): value is ApprovalFlowResponse {
  return 'flow' in value || 'legacyApprovalRequest' in value || 'legacyApproval' in value;
}

export function resolveApprovalFlow(
  value?: ApprovalFlowResponse | ApprovalFlowView | null,
): ApprovalFlowView | null {
  if (!value) return null;
  return isResponse(value)
    ? (value.flow ?? value.legacyApprovalRequest ?? value.legacyApproval ?? null)
    : value;
}

function statusMeta(status?: string) {
  return STATUS_META[status ?? ''] ?? STATUS_META.pending;
}

function normalizeStatus(status?: string) {
  return status && STATUS_META[status] ? status : 'pending';
}

function normalizeDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value?: string | Date | null) {
  const date = normalizeDate(value);
  if (!date) return '-';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value?: number | null) {
  if (value === undefined || value === null) return null;
  return `${value.toLocaleString('vi-VN')} VND`;
}

function flowType(flow: ApprovalFlowView | null) {
  return flow?.approvalType ?? flow?.type ?? 'general';
}

function flowNotes(flow: ApprovalFlowView | null) {
  if (!flow) return null;
  if (typeof flow.notes === 'string') return flow.notes;
  const metadataNotes = flow.metadata?.notes;
  return typeof metadataNotes === 'string' ? metadataNotes : null;
}

function sortedSteps(flow: ApprovalFlowView | null): ApprovalStepView[] {
  if (!flow) return [];
  if (flow.steps?.length) {
    return [...flow.steps].sort((a, b) => a.stepOrder - b.stepOrder);
  }

  return [
    {
      id: flow.id ?? flow.flowId ?? 'legacy-approval-step',
      stepOrder: 1,
      stepName: `${flowType(flow)} approval`,
      approverRole: null,
      approverUserId: null,
      status: flow.status ?? 'pending',
      dueAt: flow.slaDueAt ?? null,
      decidedAt: flow.decidedAt ?? flow.completedAt ?? null,
    },
  ];
}

function decisionForStep(flow: ApprovalFlowView | null, step: ApprovalStepView) {
  const decisions = flow?.decisions ?? [];
  return decisions.find((decision) => {
    if (decision.stepId && step.id) return decision.stepId === step.id;
    if (decision.stepOrder) return decision.stepOrder === step.stepOrder;
    return false;
  });
}

export function getApprovalSummary(
  value?: ApprovalFlowResponse | ApprovalFlowView | null,
): ApprovalSummary | null {
  const flow = resolveApprovalFlow(value);
  if (!flow) return null;

  const steps = sortedSteps(flow);
  const totalSteps = flow.totalSteps ?? steps.length;
  const currentStepOrder =
    flow.currentStepOrder ??
    steps.find((step) => step.status === 'pending')?.stepOrder ??
    totalSteps;
  const approvedSteps = steps.filter((step) => step.status === 'approved').length;
  const rejected = flow.status === 'rejected' || steps.some((step) => step.status === 'rejected');
  const status = normalizeStatus(flow.status ?? (rejected ? 'rejected' : 'pending'));
  const progressPct =
    status === 'approved'
      ? 100
      : totalSteps > 0
        ? Math.min(100, Math.round((approvedSteps / totalSteps) * 100))
        : 0;
  const due = normalizeDate(flow.slaDueAt);
  const isOverdue = Boolean(due && due < new Date() && status === 'pending');

  return {
    status,
    statusLabel: statusMeta(status).label,
    type: flowType(flow),
    notes: flowNotes(flow),
    amount: flow.amount ?? null,
    currentStepOrder,
    totalSteps,
    progressPct,
    isOverdue,
  };
}

export function ApprovalFlowStepper({
  response,
  compact = false,
  title = 'Approval journey',
  loading,
  error,
  className,
  showHeader = true,
}: ApprovalFlowStepperProps) {
  const flow = resolveApprovalFlow(response);
  const summary = getApprovalSummary(response);
  const steps = sortedSteps(flow);
  const meta = statusMeta(summary?.status);

  if (loading) {
    return (
      <div className={cn('rounded-lg border bg-card p-4', className)}>
        <div className="mb-4 h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm', className)}>
        <div className="flex gap-2 text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!flow || !summary) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground',
          className,
        )}
      >
        No approval flow attached to this ticket.
      </div>
    );
  }

  return (
    <section
      className={cn('rounded-lg border bg-card p-4 shadow-sm motion-panel', className)}
      data-testid="approval-flow-stepper"
    >
      {showHeader && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              <h2 className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>{title}</h2>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Type: {summary.type}</span>
              {formatMoney(summary.amount) && <span>Amount: {formatMoney(summary.amount)}</span>}
              {flow.requestedAt && <span>Requested: {formatDateTime(flow.requestedAt)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {summary.isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Overdue
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium',
                meta.chip,
              )}
            >
              {meta.icon}
              {meta.label}
            </span>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {summary.currentStepOrder}/{summary.totalSteps}
          </span>
          <span>{summary.progressPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="motion-progress h-full rounded-full bg-emerald-500"
            style={{ width: `${summary.progressPct}%` }}
          />
        </div>
      </div>

      {summary.notes && !compact && (
        <p className="mb-4 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          {summary.notes}
        </p>
      )}

      <div className={cn('space-y-3', compact && 'space-y-2')}>
        {steps.map((step) => {
          const stepStatus = normalizeStatus(step.status);
          const stepMeta = statusMeta(stepStatus);
          const isCurrent =
            summary.status === 'pending' &&
            stepStatus === 'pending' &&
            step.stepOrder === summary.currentStepOrder;
          const decision = decisionForStep(flow, step);

          return (
            <div
              key={step.id ?? `${step.stepOrder}-${step.stepName}`}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                stepMeta.panel,
                isCurrent && 'ring-2 ring-amber-300',
                compact && 'p-2',
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                    stepMeta.dot,
                  )}
                >
                  {stepMeta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
                      {step.stepOrder}. {step.stepName}
                    </p>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        stepMeta.chip,
                      )}
                    >
                      {stepMeta.label}
                    </span>
                  </div>
                  {!compact && (
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {step.approverRole && <span>Role: {step.approverRole}</span>}
                      {step.approverUserId && <span>User: {step.approverUserId.slice(0, 8)}</span>}
                      {step.dueAt && <span>Due: {formatDateTime(step.dueAt)}</span>}
                      {step.decidedAt && <span>Decided: {formatDateTime(step.decidedAt)}</span>}
                    </div>
                  )}
                  {!compact && decision?.notes && (
                    <p className="mt-2 rounded-md bg-background/70 px-2 py-1 text-xs text-muted-foreground">
                      {decision.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {flow.slaDueAt && !compact && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          SLA due: {formatDateTime(flow.slaDueAt)}
        </div>
      )}
    </section>
  );
}
