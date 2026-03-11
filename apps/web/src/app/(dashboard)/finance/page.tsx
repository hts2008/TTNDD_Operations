'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Plus,
  FileText,
  CreditCard,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';

// ── Types ──
interface FinanceSummary {
  byCategory: Record<string, { income: number; expense: number; net: number }>;
  totals: { income: number; expense: number; net: number };
}

interface Fee {
  id: string;
  orgMemberId: string;
  feeType: string | null;
  feePeriod: string | null;
  amountDue: number;
  amountPaid: number;
  dueDate: string | null;
  status: string;
  waiverReason?: string | null;
  createdAt: string;
}

interface FeePlan {
  id: string;
  name: string;
  feeType: string;
  amount: number;
  frequency: string;
  effectiveDate: string;
  isActive: boolean;
  _count: { fees: number };
}

interface Transaction {
  id: string;
  transactionType: string;
  category: string | null;
  amount: number;
  description: string;
  status: string;
  transactionDate: string;
}

// ── Helpers ──
const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    unpaid: 'bg-red-500/15 text-red-400 border-red-500/30',
    partial: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    waived: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    draft: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  };
  return map[status] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
};

// ── Component ──
export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [fees, setFees] = useState<{ data: Fee[]; meta: { total: number } } | null>(null);
  const [feePlans, setFeePlans] = useState<{ data: FeePlan[]; meta: { total: number } } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'fees' | 'plans' | 'sponsors'>('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, feesRes, plansRes] = await Promise.all([
        api.get<FinanceSummary>('/api/v1/finance/summary'),
        api.get<{ data: Fee[]; meta: { total: number } }>('/api/v1/finance/fees'),
        api.get<{ data: FeePlan[]; meta: { total: number } }>('/api/v1/finance/fee-plans'),
      ]);
      setSummary(summaryRes);
      setFees(feesRes);
      setFeePlans(plansRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-zinc-400">{error}</p>
        <button
          onClick={loadData}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const totals = summary?.totals ?? { income: 0, expense: 0, net: 0 };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Quản lý Tài chính</h1>
          <p className="text-sm text-zinc-400">Treasury & fee management</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" /> Làm mới
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Thu nhập" value={fmt(totals.income)} color="emerald" />
        <StatCard icon={TrendingDown} label="Chi tiêu" value={fmt(totals.expense)} color="red" />
        <StatCard icon={Wallet} label="Số dư" value={fmt(totals.net)} color="blue" />
        <StatCard
          icon={Users}
          label="Tổng phí"
          value={`${fees?.meta.total ?? 0} khoản`}
          color="purple"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-1">
        {(['overview', 'fees', 'plans', 'sponsors'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              tab === t
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            {t === 'overview'
              ? 'Tổng quan'
              : t === 'fees'
                ? 'Phí thành viên'
                : t === 'plans'
                  ? 'Kế hoạch phí'
                  : 'Nhà tài trợ'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab summary={summary} />}
      {tab === 'fees' && <FeesTab fees={fees?.data ?? []} />}
      {tab === 'plans' && <PlansTab plans={feePlans?.data ?? []} />}
      {tab === 'sponsors' && <SponsorsTab />}
    </div>
  );
}

// ── Sub-components ──
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    red: 'from-red-500/20 to-red-500/5 text-red-400',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400',
  };
  return (
    <div
      className={`rounded-xl border border-zinc-700/50 bg-gradient-to-br ${colorMap[color]} p-4`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <Icon className="h-5 w-5 opacity-60" />
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function OverviewTab({ summary }: { summary: FinanceSummary | null }) {
  const categories = summary ? Object.entries(summary.byCategory) : [];
  if (!categories.length) {
    return <EmptyState icon={DollarSign} message="Chưa có giao dịch nào" />;
  }
  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
      <h3 className="mb-4 text-lg font-semibold text-zinc-100">Thu chi theo danh mục</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-left text-zinc-400">
              <th className="pb-2">Danh mục</th>
              <th className="pb-2 text-right">Thu</th>
              <th className="pb-2 text-right">Chi</th>
              <th className="pb-2 text-right">Ròng</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(([cat, data]) => (
              <tr key={cat} className="border-b border-zinc-700/50">
                <td className="py-2.5 capitalize text-zinc-200">{cat}</td>
                <td className="py-2.5 text-right text-emerald-400">{fmt(data.income)}</td>
                <td className="py-2.5 text-right text-red-400">{fmt(data.expense)}</td>
                <td
                  className={`py-2.5 text-right font-medium ${data.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {fmt(data.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeesTab({ fees }: { fees: Fee[] }) {
  if (!fees.length) return <EmptyState icon={FileText} message="Chưa có khoản phí nào" />;
  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
      <h3 className="mb-4 text-lg font-semibold text-zinc-100">Danh sách phí thành viên</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-left text-zinc-400">
              <th className="pb-2">Loại phí</th>
              <th className="pb-2">Kỳ</th>
              <th className="pb-2 text-right">Phải nộp</th>
              <th className="pb-2 text-right">Đã nộp</th>
              <th className="pb-2 text-center">Trạng thái</th>
              <th className="pb-2">Hạn</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f) => (
              <tr key={f.id} className="border-b border-zinc-700/50">
                <td className="py-2.5 text-zinc-200">{f.feeType ?? '—'}</td>
                <td className="py-2.5 text-zinc-400">{f.feePeriod ?? '—'}</td>
                <td className="py-2.5 text-right text-zinc-200">{fmt(f.amountDue)}</td>
                <td className="py-2.5 text-right text-emerald-400">{fmt(f.amountPaid)}</td>
                <td className="py-2.5 text-center">
                  <span
                    className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(f.status)}`}
                  >
                    {f.status}
                  </span>
                </td>
                <td className="py-2.5 text-zinc-400">
                  {f.dueDate ? new Date(f.dueDate).toLocaleDateString('vi-VN') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlansTab({ plans }: { plans: FeePlan[] }) {
  if (!plans.length) return <EmptyState icon={CreditCard} message="Chưa có kế hoạch phí nào" />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => (
        <div key={p.id} className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-zinc-100">{p.name}</h4>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${p.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-600/15 text-zinc-500'}`}
            >
              {p.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-1 text-xl font-bold text-blue-400">{fmt(p.amount)}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
            <span className="capitalize">{p.frequency}</span>
            <span>{p._count.fees} thành viên</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SponsorsTab() {
  const [sponsors, setSponsors] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: unknown[] }>('/api/v1/finance/sponsors')
      .then((res) => setSponsors(res.data))
      .catch(() => setSponsors([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  if (!sponsors.length) return <EmptyState icon={Users} message="Chưa có nhà tài trợ nào" />;

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
      <h3 className="mb-4 text-lg font-semibold text-zinc-100">Nhà tài trợ</h3>
      <p className="text-sm text-zinc-400">{sponsors.length} nhà tài trợ đang hoạt động</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30 py-12">
      <Icon className="h-10 w-10 text-zinc-600" />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
