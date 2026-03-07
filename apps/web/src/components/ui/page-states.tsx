'use client';

import { Loader2, AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

/**
 * Standardized empty/loading/error states for the MMORPG shell.
 * Per V3 spec T-0013: empty/loading/error standards.
 *
 * Usage:
 *   <PageLoading />           — full-page loading spinner
 *   <PageEmpty />             — no-data state
 *   <PageError onRetry={fn} /> — error with retry button
 */

// ─── Loading State ─────────────────────────────────────────────
export function PageLoading({ message = 'Đang tải...' }: { message?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <div className="relative">
        <Loader2 className="h-10 w-10 text-[hsl(var(--primary))] animate-spin" />
        <div className="absolute inset-0 h-10 w-10 rounded-full bg-[hsl(var(--primary)_/_0.1)] animate-ping" />
      </div>
      <p className="text-sm text-[hsl(var(--muted-foreground))] animate-pulse">{message}</p>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────
interface PageEmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageEmpty({
  title = 'Chưa có dữ liệu',
  description = 'Dữ liệu sẽ xuất hiện khi bạn bắt đầu hoạt động.',
  icon,
  action,
}: PageEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
        {icon || <Inbox className="h-8 w-8" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h3>
        <p className="max-w-sm text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
      </div>
      {action}
    </div>
  );
}

// ─── Error State ───────────────────────────────────────────────
interface PageErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function PageError({
  title = 'Đã xảy ra lỗi',
  message = 'Không thể tải dữ liệu. Vui lòng thử lại.',
  onRetry,
}: PageErrorProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/20">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h3>
        <p className="max-w-sm text-sm text-[hsl(var(--muted-foreground))]">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)_/_0.9)] transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </button>
      )}
    </div>
  );
}

// ─── Card Skeleton ──────────────────────────────────────────────
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 animate-pulse"
        >
          <div className="h-4 w-24 rounded bg-[hsl(var(--muted))] mb-3" />
          <div className="h-8 w-32 rounded bg-[hsl(var(--muted))] mb-2" />
          <div className="h-3 w-full rounded bg-[hsl(var(--muted))]" />
        </div>
      ))}
    </div>
  );
}
