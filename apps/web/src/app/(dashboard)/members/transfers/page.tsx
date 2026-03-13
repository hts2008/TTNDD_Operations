'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  ArrowRightLeft,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  ChevronRight,
  User,
  MapPin,
  Star,
  Trophy,
  Loader2,
} from 'lucide-react';

// ── Types ──

type TransferStatus =
  | 'initiated'
  | 'pending_handover'
  | 'handover_complete'
  | 'closed'
  | 'cancelled';

interface TransferCase {
  id: string;
  memberName: string;
  memberCode: string;
  fromBranch: string;
  fromUnit: string;
  toBranch: string;
  toUnit?: string;
  status: TransferStatus;
  reason: string;
  triggerType: 'manual' | 'age_threshold';
  summarySnapshot: { totalExp: number; currentRank: string | null; badgeCount: number };
  initiatedAt: string;
  completedAt?: string;
  memberId?: string;
  handoverNote?: string;
}

// ── Status Configuration ──

const STATUS_CONFIG: Record<
  TransferStatus,
  {
    label: string;
    variant: 'default' | 'warning' | 'success' | 'secondary' | 'destructive';
    icon: React.ReactNode;
  }
> = {
  initiated: {
    label: 'Đã khởi tạo',
    variant: 'default',
    icon: <Clock className="h-3 w-3" />,
  },
  pending_handover: {
    label: 'Chờ bàn giao',
    variant: 'warning',
    icon: <FileCheck className="h-3 w-3" />,
  },
  handover_complete: {
    label: 'Đã bàn giao',
    variant: 'success',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  closed: {
    label: 'Đã hoàn tất',
    variant: 'secondary',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  cancelled: {
    label: 'Đã hủy',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
  },
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Thủ công',
  age_threshold: 'Quá tuổi',
};

const FILTER_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'initiated', label: 'Khởi tạo' },
  { key: 'pending_handover', label: 'Chờ bàn giao' },
  { key: 'handover_complete', label: 'Đã bàn giao' },
  { key: 'closed', label: 'Hoàn tất' },
  { key: 'cancelled', label: 'Đã hủy' },
];

// ── Create Transfer Dialog ──

function CreateTransferDialog({
  onClose,
  onCreated,
  showToast,
}: {
  onClose: () => void;
  onCreated: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [memberId, setMemberId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [toUnitId, setToUnitId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!memberId || !toBranchId) return;
    try {
      setSubmitting(true);
      await api.post(`/hrm/members/${memberId}/transfer`, {
        toBranchId,
        toUnitId: toUnitId || undefined,
        reason: reason || undefined,
      });
      showToast('✅ Đã tạo yêu cầu chuyển ngành', 'success');
      onCreated();
      onClose();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Không thể tạo yêu cầu'}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-indigo-500" />
          Tạo yêu cầu chuyển ngành
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">
              Member ID *
            </label>
            <Input
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="ID thành viên cần chuyển"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">
              Chi nhánh đích *
            </label>
            <Input
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
              placeholder="Branch ID đích"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">
              Đơn vị đích
            </label>
            <Input
              value={toUnitId}
              onChange={(e) => setToUnitId(e.target.value)}
              placeholder="Unit ID đích (tùy chọn)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">
              Lý do
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Lý do chuyển ngành"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Hủy
          </Button>
          <Button
            className="flex-1 bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            disabled={!memberId || !toBranchId || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Tạo yêu cầu
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Handover Note Dialog ──

function HandoverDialog({
  caseId,
  onClose,
  onDone,
  showToast,
}: {
  caseId: string;
  onClose: () => void;
  onDone: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) return;
    try {
      setSubmitting(true);
      await api.post(`/hrm/transfers/${caseId}/handover`, { note });
      showToast('✅ Đã hoàn tất bàn giao', 'success');
      onDone();
      onClose();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi bàn giao'}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold mb-3">📝 Ghi chú bàn giao</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú về quá trình bàn giao..."
          className="w-full bg-[hsl(var(--muted)_/_0.3)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm min-h-[100px] focus:border-[hsl(var(--primary))] outline-none resize-none"
        />
        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Hủy
          </Button>
          <Button
            className="flex-1 bg-linear-to-r from-amber-500 to-orange-600"
            disabled={!note.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? '⏳...' : '✅ Hoàn tất bàn giao'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<TransferCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCase, setSelectedCase] = useState<TransferCase | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHandoverDialog, setShowHandoverDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('memberId', search);
      const data = await api.get<TransferCase[]>(`/hrm/transfers?${params}`);
      setTransfers(Array.isArray(data) ? data : []);
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  // ── Action Handlers ──

  const handleApprove = async (caseId: string) => {
    try {
      setActionLoading(true);
      await api.post(`/hrm/transfers/${caseId}/approve`, {});
      showToast('✅ Đã phê duyệt chuyển ngành', 'success');
      await loadTransfers();
      setSelectedCase(null);
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi phê duyệt'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (caseId: string) => {
    try {
      setActionLoading(true);
      await api.post(`/hrm/transfers/${caseId}/accept`, {});
      showToast('✅ Đã tiếp nhận và đóng hồ sơ', 'success');
      await loadTransfers();
      setSelectedCase(null);
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi tiếp nhận'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (caseId: string) => {
    try {
      setActionLoading(true);
      await api.post(`/hrm/transfers/${caseId}/cancel`, {});
      showToast('🗑️ Đã hủy yêu cầu chuyển ngành', 'success');
      await loadTransfers();
      setSelectedCase(null);
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi hủy'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Derived Data ──

  const filtered = transfers.filter((tc) => {
    if (statusFilter !== 'all' && tc.status !== statusFilter) return false;
    if (
      search &&
      !(tc.memberName || '').toLowerCase().includes(search.toLowerCase()) &&
      !(tc.memberCode || '').toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const statusCounts = transfers.reduce(
    (acc, tc) => {
      acc[tc.status] = (acc[tc.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const columns = [
    {
      key: 'memberCode',
      label: 'Mã',
      render: (tc: TransferCase) => (
        <span className="font-mono text-sm font-medium">{tc.memberCode || '—'}</span>
      ),
    },
    {
      key: 'memberName',
      label: 'Đoàn sinh',
      render: (tc: TransferCase) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-sm">
            {(tc.memberName || '?').split(' ').slice(-1)[0]?.charAt(0)}
          </div>
          <span className="font-medium">{tc.memberName || 'Unnamed'}</span>
        </div>
      ),
    },
    {
      key: 'transfer',
      label: 'Chuyển',
      render: (tc: TransferCase) => (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">{tc.fromBranch || '—'}</span>
          <ChevronRight className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
          <span className="font-medium text-[hsl(var(--primary))]">{tc.toBranch || '—'}</span>
        </div>
      ),
    },
    {
      key: 'triggerType',
      label: 'Loại',
      render: (tc: TransferCase) => (
        <Badge variant="outline" className="text-xs">
          {TRIGGER_LABELS[tc.triggerType] || tc.triggerType || '—'}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (tc: TransferCase) => {
        const cfg = STATUS_CONFIG[tc.status] || STATUS_CONFIG.initiated;
        return (
          <Badge variant={cfg.variant} className="gap-1">
            {cfg.icon}
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: 'initiatedAt',
      label: 'Ngày tạo',
      render: (tc: TransferCase) => (
        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          {tc.initiatedAt
            ? new Date(tc.initiatedAt).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-3">
            <ArrowRightLeft className="h-7 w-7 text-indigo-500" />
            Chuyển ngành
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Quản lý các trường hợp chuyển ngành, lên ngành cho đoàn sinh — {transfers.length} hồ sơ
          </p>
        </div>
        <Button
          className="gap-2 self-start bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Tạo yêu cầu chuyển
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {FILTER_TABS.filter((t) => t.key !== 'all').map((tab) => {
          const cfg = STATUS_CONFIG[tab.key as TransferStatus];
          const count = statusCounts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(statusFilter === tab.key ? 'all' : tab.key)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all hover:shadow-md',
                statusFilter === tab.key
                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)_/_0.05)] ring-1 ring-[hsl(var(--primary)_/_0.2)]'
                  : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  {tab.label}
                </span>
                {cfg?.icon}
              </div>
              <span className="text-2xl font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filter + Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Tìm theo tên hoặc mã đoàn sinh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  statusFilter === tab.key
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]',
                )}
              >
                {tab.label}
                {tab.key !== 'all' && statusCounts[tab.key] ? (
                  <span className="ml-1 text-xs opacity-70">({statusCounts[tab.key]})</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
          <span className="ml-3 text-[hsl(var(--muted-foreground))]">
            Đang tải danh sách chuyển ngành...
          </span>
        </div>
      )}

      {/* Main Layout: Table + Detail */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transfer Cases Table */}
          <div className={cn('transition-all', selectedCase ? 'lg:col-span-2' : 'lg:col-span-3')}>
            {filtered.length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-[hsl(var(--muted-foreground))]">
                  <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Chưa có yêu cầu chuyển ngành nào</p>
                  <p className="text-sm mt-1">Nhấn &quot;Tạo yêu cầu chuyển&quot; để bắt đầu</p>
                </div>
              </Card>
            ) : (
              <DataTable
                columns={columns}
                data={filtered}
                onRowClick={(tc) => setSelectedCase(tc as TransferCase)}
                className="bg-[hsl(var(--card))]"
              />
            )}
          </div>

          {/* Detail Panel */}
          {selectedCase && (
            <Card className="lg:col-span-1 overflow-hidden">
              <CardHeader className="bg-linear-to-br from-indigo-500/10 to-purple-500/10 border-b border-[hsl(var(--border))]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Chi tiết chuyển ngành</CardTitle>
                  <button
                    onClick={() => setSelectedCase(null)}
                    className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-sm"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white font-bold shadow-md">
                    {(selectedCase.memberName || '?').split(' ').slice(-1)[0]?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedCase.memberName || 'Unnamed'}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                      {selectedCase.memberCode || '—'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Trạng thái</span>
                  <Badge
                    variant={STATUS_CONFIG[selectedCase.status]?.variant || 'default'}
                    className="gap-1"
                  >
                    {STATUS_CONFIG[selectedCase.status]?.icon}
                    {STATUS_CONFIG[selectedCase.status]?.label || selectedCase.status}
                  </Badge>
                </div>

                {/* Transfer Direction */}
                <div className="rounded-lg border border-[hsl(var(--border))] p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-red-400" />
                    <span className="text-[hsl(var(--muted-foreground))]">Từ:</span>
                    <span className="font-medium">
                      {selectedCase.fromBranch || '—'} — {selectedCase.fromUnit || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span className="text-[hsl(var(--muted-foreground))]">Đến:</span>
                    <span className="font-medium text-[hsl(var(--primary))]">
                      {selectedCase.toBranch || '—'}
                      {selectedCase.toUnit && ` — ${selectedCase.toUnit}`}
                    </span>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Lý do</span>
                  <p className="text-sm mt-1">{selectedCase.reason || '—'}</p>
                </div>

                {/* Summary Snapshot */}
                {selectedCase.summarySnapshot && (
                  <div>
                    <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                      Snapshot tại thời điểm chuyển
                    </span>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="rounded-lg bg-[hsl(var(--muted)_/_0.3)] p-2 text-center">
                        <Star className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                        <p className="text-lg font-bold">
                          {selectedCase.summarySnapshot.totalExp?.toLocaleString() || 0}
                        </p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">EXP</p>
                      </div>
                      <div className="rounded-lg bg-[hsl(var(--muted)_/_0.3)] p-2 text-center">
                        <Trophy className="h-4 w-4 mx-auto text-indigo-500 mb-1" />
                        <p className="text-sm font-bold">
                          {selectedCase.summarySnapshot.currentRank || '—'}
                        </p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Hạng</p>
                      </div>
                      <div className="rounded-lg bg-[hsl(var(--muted)_/_0.3)] p-2 text-center">
                        <User className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                        <p className="text-lg font-bold">
                          {selectedCase.summarySnapshot.badgeCount || 0}
                        </p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Huy hiệu</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Handover Note */}
                {selectedCase.handoverNote && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">📝 Ghi chú bàn giao</p>
                    <p className="text-sm text-amber-900">{selectedCase.handoverNote}</p>
                  </div>
                )}

                {/* Action Buttons based on status */}
                <div className="pt-2 border-t border-[hsl(var(--border))] space-y-2">
                  {selectedCase.status === 'initiated' && (
                    <>
                      <Button
                        className="w-full bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        disabled={actionLoading}
                        onClick={() => handleApprove(selectedCase.id)}
                      >
                        {actionLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Phê duyệt chuyển ngành
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-red-500 border-red-200 hover:bg-red-50"
                        disabled={actionLoading}
                        onClick={() => handleCancel(selectedCase.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Hủy yêu cầu
                      </Button>
                    </>
                  )}
                  {selectedCase.status === 'pending_handover' && (
                    <Button
                      className="w-full bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                      disabled={actionLoading}
                      onClick={() => setShowHandoverDialog(true)}
                    >
                      <FileCheck className="h-4 w-4 mr-2" />
                      Hoàn tất bàn giao
                    </Button>
                  )}
                  {selectedCase.status === 'handover_complete' && (
                    <Button
                      className="w-full bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                      disabled={actionLoading}
                      onClick={() => handleAccept(selectedCase.id)}
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Tiếp nhận & đóng hồ sơ
                    </Button>
                  )}
                  {selectedCase.status === 'closed' && (
                    <div className="text-center text-sm text-[hsl(var(--muted-foreground))] py-2">
                      ✅ Đã hoàn tất vào{' '}
                      {selectedCase.completedAt &&
                        new Date(selectedCase.completedAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                    </div>
                  )}
                  {selectedCase.status === 'cancelled' && (
                    <div className="text-center text-sm text-red-500 py-2">
                      ❌ Yêu cầu đã bị hủy
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateTransferDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={loadTransfers}
          showToast={showToast}
        />
      )}
      {showHandoverDialog && selectedCase && (
        <HandoverDialog
          caseId={selectedCase.id}
          onClose={() => setShowHandoverDialog(false)}
          onDone={loadTransfers}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 border border-emerald-700 text-emerald-200'
              : 'bg-red-900/90 border border-red-700 text-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
