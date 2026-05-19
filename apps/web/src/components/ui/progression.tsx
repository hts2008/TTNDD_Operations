import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'navy' | 'gold' | 'emerald' | 'sky' | 'rose' | 'neutral';

const toneClasses: Record<Tone, string> = {
  navy: 'border-indigo-100 bg-indigo-50 text-indigo-900',
  gold: 'border-amber-100 bg-amber-50 text-amber-900',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-900',
  sky: 'border-sky-100 bg-sky-50 text-sky-900',
  rose: 'border-rose-100 bg-rose-50 text-rose-900',
  neutral: 'border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]',
};

interface MetricTileProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail?: string;
  tone?: Tone;
}

export function MetricTile({ icon, label, value, detail, tone = 'neutral' }: MetricTileProps) {
  return (
    <div className={cn('rounded-lg border p-4', toneClasses[tone])}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">
          {label}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/70">
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold leading-none">{value}</div>
      {detail && <div className="mt-2 text-xs leading-5 opacity-75">{detail}</div>}
    </div>
  );
}

interface ProgressMeterProps {
  value: number;
  label: string;
  detail?: string;
}

export function ProgressMeter({ value, label, detail }: ProgressMeterProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[hsl(var(--foreground))]">{label}</span>
        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
          {safeValue}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-[hsl(var(--muted))]">
        <div
          className="h-2 rounded-full bg-[hsl(var(--primary))] transition-all"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {detail && <p className="text-xs text-[hsl(var(--muted-foreground))]">{detail}</p>}
    </div>
  );
}

interface NextAction {
  type?: string;
  label: string;
  href?: string;
  priority?: string;
}

export function NextActionList({ actions }: { actions: NextAction[] }) {
  if (actions.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Khong co viec khan can xu ly</p>
          <p className="mt-1 text-xs opacity-75">Ho so hien tai khong co canh bao bat buoc.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action, index) => {
        const content = (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-amber-950 transition-colors hover:border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium">{action.label}</p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-amber-700">
                  {action.priority || 'normal'} {action.type ? `/ ${action.type}` : ''}
                </p>
              </div>
            </div>
            {action.href && <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />}
          </div>
        );

        return action.href ? (
          <Link key={`${action.label}-${index}`} href={action.href} className="block">
            {content}
          </Link>
        ) : (
          <div key={`${action.label}-${index}`}>{content}</div>
        );
      })}
    </div>
  );
}
