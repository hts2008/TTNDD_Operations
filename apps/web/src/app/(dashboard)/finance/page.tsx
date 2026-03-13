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
  Download,
  BarChart3,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
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
  referenceNo?: string | null;
}

interface Sponsor {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  sponsorType: string;
  totalContributed: number;
  isActive: boolean;
  _count?: { contributions: number };
}

interface CostCenter {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { transactions: number };
}

interface Projection {
  month: number;
  label: string;
  estimatedBalance: number;
  projectedIncome: number;
  projectedExpense: number;
}

interface BalanceProjection {
  totalCurrentBalance: number;
  expectedIncome: number;
  monthlyExpenseAvg: number;
  accounts: { id: string; name: string; currentBalance: number; currency: string }[];
  projections: Projection[];
}

// ── Helpers ──
const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    unpaid: 'bg-red-500/15 text-red-400 border-red-500/30',
    overdue: 'bg-red-500/15 text-red-400 border-red-500/30',
    partial: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    waived: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    draft: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    reversed: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };
  return map[status] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
};

const statusLabel: Record<string, string> = {
  completed: 'Hoàn thành',
  approved: 'Đã duyệt',
  pending: 'Chờ duyệt',
  unpaid: 'Chưa nộp',
  overdue: 'Quá hạn',
  partial: 'Nộp 1 phần',
  paid: 'Đã nộp',
  waived: 'Miễn phí',
  draft: 'Nháp',
  reversed: 'Đã hoàn',
};

type TabKey =
  | 'overview'
  | 'transactions'
  | 'fees'
  | 'plans'
  | 'sponsors'
  | 'projections'
  | 'cost-centers';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'transactions', label: 'Giao dịch' },
  { key: 'fees', label: 'Phí thành viên' },
  { key: 'plans', label: 'Kế hoạch phí' },
  { key: 'sponsors', label: 'Nhà tài trợ' },
  { key: 'projections', label: 'Dự báo' },
  { key: 'cost-centers', label: 'Trung tâm chi phí' },
];

// ── Component ──
export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [fees, setFees] = useState<{ data: Fee[]; meta: { total: number } } | null>(null);
  const [feePlans, setFeePlans] = useState<{ data: FeePlan[]; meta: { total: number } } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');

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
          <p className="text-sm text-zinc-400">Treasury, fee management & reporting</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              api
                .get('/api/v1/finance/export')
                .then((data) => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `finance-export-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                })
                .catch(() => alert('Export failed'))
            }
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            <Download className="h-4 w-4" /> Xuất dữ liệu
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" /> Làm mới
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Thu nhập"
          value={fmt(totals.income)}
          color="emerald"
          trend="+12%"
        />
        <StatCard
          icon={TrendingDown}
          label="Chi tiêu"
          value={fmt(totals.expense)}
          color="red"
          trend="-3%"
        />
        <StatCard
          icon={Wallet}
          label="Số dư"
          value={fmt(totals.net)}
          color={totals.net >= 0 ? 'blue' : 'red'}
        />
        <StatCard
          icon={Users}
          label="Tổng phí"
          value={`${fees?.meta.total ?? 0} khoản`}
          color="purple"
          subtitle={`${feePlans?.meta.total ?? 0} kế hoạch`}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab summary={summary} />}
      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'fees' && <FeesTab fees={fees?.data ?? []} />}
      {tab === 'plans' && <PlansTab plans={feePlans?.data ?? []} />}
      {tab === 'sponsors' && <SponsorsTab />}
      {tab === 'projections' && <ProjectionsTab />}
      {tab === 'cost-centers' && <CostCentersTab />}
    </div>
  );
}

// ── Sub-components ──
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  trend,
  subtitle,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  trend?: string;
  subtitle?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    red: 'from-red-500/20 to-red-500/5 text-red-400',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400',
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
      <div className="mt-1 flex items-center gap-2">
        {trend && <span className="text-xs text-zinc-500">{trend}</span>}
        {subtitle && <span className="text-xs text-zinc-500">{subtitle}</span>}
      </div>
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

function TransactionsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api
      .get<{ rows: Transaction[] }>('/api/v1/finance/export')
      .then((res) => setTransactions(res.rows ?? []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const filtered =
    filter === 'all' ? transactions : transactions.filter((t) => t.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">Lịch sử giao dịch</h3>
        <div className="flex gap-1">
          {['all', 'pending', 'completed', 'reversed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {f === 'all' ? 'Tất cả' : (statusLabel[f] ?? f)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} message="Chưa có giao dịch nào" />
      ) : (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-left text-zinc-400">
                  <th className="pb-2">Ngày</th>
                  <th className="pb-2">Mô tả</th>
                  <th className="pb-2">Loại</th>
                  <th className="pb-2 text-right">Số tiền</th>
                  <th className="pb-2 text-center">Trạng thái</th>
                  <th className="pb-2">Mã</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                    <td className="py-2.5 text-zinc-400">{fmtDate(tx.transactionDate)}</td>
                    <td className="py-2.5 text-zinc-200">{tx.description}</td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1">
                        {tx.transactionType === 'income' ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className="text-xs text-zinc-400">
                          {tx.transactionType === 'income' ? 'Thu' : 'Chi'}
                        </span>
                      </span>
                    </td>
                    <td
                      className={`py-2.5 text-right font-medium ${
                        tx.transactionType === 'income' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {tx.transactionType === 'income' ? '+' : '-'}
                      {fmt(tx.amount)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(tx.status)}`}
                      >
                        {statusLabel[tx.status] ?? tx.status}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-xs text-zinc-500">
                      {tx.referenceNo ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FeesTab({ fees }: { fees: Fee[] }) {
  if (!fees.length) return <EmptyState icon={FileText} message="Chưa có khoản phí nào" />;

  const overdue = fees.filter(
    (f) => f.status === 'unpaid' && f.dueDate && new Date(f.dueDate) < new Date(),
  );
  const partial = fees.filter((f) => f.status === 'partial');
  const waived = fees.filter((f) => f.status === 'waived');

  return (
    <div className="space-y-4">
      {/* Fee stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Quá hạn</span>
          </div>
          <p className="mt-1 text-xl font-bold text-red-400">{overdue.length}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Nộp 1 phần</span>
          </div>
          <p className="mt-1 text-xl font-bold text-amber-400">{partial.length}</p>
        </div>
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <div className="flex items-center gap-2 text-blue-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Miễn phí</span>
          </div>
          <p className="mt-1 text-xl font-bold text-blue-400">{waived.length}</p>
        </div>
      </div>

      {/* Fee table */}
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
                <th className="pb-2 text-right">Còn lại</th>
                <th className="pb-2 text-center">Trạng thái</th>
                <th className="pb-2">Hạn</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => {
                const remaining = f.amountDue - f.amountPaid;
                const isOverdue =
                  f.status === 'unpaid' && f.dueDate && new Date(f.dueDate) < new Date();
                return (
                  <tr
                    key={f.id}
                    className={`border-b border-zinc-700/50 ${isOverdue ? 'bg-red-500/5' : ''}`}
                  >
                    <td className="py-2.5 text-zinc-200">{f.feeType ?? '—'}</td>
                    <td className="py-2.5 text-zinc-400">{f.feePeriod ?? '—'}</td>
                    <td className="py-2.5 text-right text-zinc-200">{fmt(f.amountDue)}</td>
                    <td className="py-2.5 text-right text-emerald-400">{fmt(f.amountPaid)}</td>
                    <td
                      className={`py-2.5 text-right font-medium ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}
                    >
                      {fmt(remaining)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(f.status)}`}
                      >
                        {statusLabel[f.status] ?? f.status}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 ${isOverdue ? 'font-medium text-red-400' : 'text-zinc-400'}`}
                    >
                      {fmtDate(f.dueDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PlansTab({ plans }: { plans: FeePlan[] }) {
  if (!plans.length) return <EmptyState icon={CreditCard} message="Chưa có kế hoạch phí nào" />;

  const freqLabel: Record<string, string> = {
    monthly: 'Hàng tháng',
    quarterly: 'Hàng quý',
    annual: 'Hàng năm',
    'one-time': 'Một lần',
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => (
        <div
          key={p.id}
          className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 transition-all hover:border-zinc-600"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-zinc-100">{p.name}</h4>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${p.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-600/15 text-zinc-500'}`}
            >
              {p.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-400">{fmt(p.amount)}</p>
          <div className="mt-3 flex items-center justify-between border-t border-zinc-700/50 pt-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {freqLabel[p.frequency] ?? p.frequency}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {p._count.fees} thành viên
            </span>
          </div>
          <div className="mt-2 text-xs text-zinc-500">Hiệu lực từ: {fmtDate(p.effectiveDate)}</div>
        </div>
      ))}
    </div>
  );
}

function SponsorsTab() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Sponsor[] }>('/api/v1/finance/sponsors')
      .then((res) => setSponsors(res.data))
      .catch(() => setSponsors([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!sponsors.length) return <EmptyState icon={Users} message="Chưa có nhà tài trợ nào" />;

  const totalContributed = sponsors.reduce((s, sp) => s + Number(sp.totalContributed), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">Nhà tài trợ</h3>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
          <span className="text-sm text-emerald-400">Tổng cộng: {fmt(totalContributed)}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sponsors.map((sp) => (
          <div
            key={sp.id}
            className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 transition-all hover:border-zinc-600"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-zinc-100">{sp.name}</h4>
                <span className="mt-0.5 inline-block rounded bg-zinc-700/50 px-1.5 py-0.5 text-xs text-zinc-400">
                  {sp.sponsorType === 'cash'
                    ? 'Tiền mặt'
                    : sp.sponsorType === 'in-kind'
                      ? 'Hiện vật'
                      : 'Kết hợp'}
                </span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${sp.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-600/15 text-zinc-500'}`}
              >
                {sp.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="mt-3 text-xl font-bold text-emerald-400">
              {fmt(Number(sp.totalContributed))}
            </p>
            {(sp.contactEmail || sp.contactPhone) && (
              <div className="mt-3 border-t border-zinc-700/50 pt-2 text-xs text-zinc-400">
                {sp.contactEmail && <div>📧 {sp.contactEmail}</div>}
                {sp.contactPhone && <div>📞 {sp.contactPhone}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectionsTab() {
  const [data, setData] = useState<BalanceProjection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<BalanceProjection>('/api/v1/finance/projections')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState icon={BarChart3} message="Không thể tải dữ liệu dự báo" />;

  return (
    <div className="space-y-4">
      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="text-sm text-zinc-400">Số dư hiện tại</div>
          <p className="mt-1 text-xl font-bold text-blue-400">{fmt(data.totalCurrentBalance)}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-sm text-zinc-400">Thu dự kiến (phí đang chờ)</div>
          <p className="mt-1 text-xl font-bold text-emerald-400">{fmt(data.expectedIncome)}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="text-sm text-zinc-400">Chi TB/tháng (6 tháng)</div>
          <p className="mt-1 text-xl font-bold text-red-400">{fmt(data.monthlyExpenseAvg)}</p>
        </div>
      </div>

      {/* Projection table */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">Dự báo số dư 6 tháng</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="pb-2">Tháng</th>
                <th className="pb-2 text-right">Thu dự kiến</th>
                <th className="pb-2 text-right">Chi dự kiến</th>
                <th className="pb-2 text-right">Số dư dự kiến</th>
              </tr>
            </thead>
            <tbody>
              {data.projections.map((p) => (
                <tr key={p.month} className="border-b border-zinc-700/50">
                  <td className="py-2.5 text-zinc-200">{p.label}</td>
                  <td className="py-2.5 text-right text-emerald-400">{fmt(p.projectedIncome)}</td>
                  <td className="py-2.5 text-right text-red-400">{fmt(p.projectedExpense)}</td>
                  <td
                    className={`py-2.5 text-right font-medium ${p.estimatedBalance >= 0 ? 'text-blue-400' : 'text-red-400'}`}
                  >
                    {fmt(p.estimatedBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accounts */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
        <h3 className="mb-3 text-lg font-semibold text-zinc-100">Tài khoản</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.accounts.map((acc) => (
            <div key={acc.id} className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-3">
              <div className="text-sm text-zinc-400">{acc.name}</div>
              <p className="mt-1 text-lg font-bold text-zinc-100">{fmt(acc.currentBalance)}</p>
              <span className="text-xs text-zinc-500">{acc.currency}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CostCentersTab() {
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: CostCenter[] }>('/api/v1/finance/cost-centers')
      .then((res) => setCenters(res.data))
      .catch(() => setCenters([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!centers.length)
    return <EmptyState icon={Building2} message="Chưa có trung tâm chi phí nào" />;

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
      <h3 className="mb-4 text-lg font-semibold text-zinc-100">Trung tâm chi phí</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-left text-zinc-400">
              <th className="pb-2">Mã</th>
              <th className="pb-2">Tên</th>
              <th className="pb-2">Mô tả</th>
              <th className="pb-2 text-center">Trạng thái</th>
              <th className="pb-2 text-right">Giao dịch</th>
            </tr>
          </thead>
          <tbody>
            {centers.map((cc) => (
              <tr key={cc.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                <td className="py-2.5 font-mono text-sm text-blue-400">{cc.code}</td>
                <td className="py-2.5 text-zinc-200">{cc.name}</td>
                <td className="py-2.5 text-zinc-400">{cc.description ?? '—'}</td>
                <td className="py-2.5 text-center">
                  {cc.isActive ? (
                    <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="mx-auto h-4 w-4 text-zinc-500" />
                  )}
                </td>
                <td className="py-2.5 text-right text-zinc-300">{cc._count.transactions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
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
