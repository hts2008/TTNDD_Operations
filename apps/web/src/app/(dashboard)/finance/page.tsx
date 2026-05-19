'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

interface Transaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: string;
  status: string;
  reference: string;
}

interface FinanceSummary {
  byCategory: Record<string, { income: number; expense: number; net: number }>;
  totals: { income: number; expense: number; net: number };
}

interface FeeItem {
  id: string;
  feeType: string | null;
  feePeriod: string | null;
  amountDue: number;
  amountPaid: number;
  status: string;
  dueDate: string | null;
  orgMember?: { scoutName: string; memberCode: string };
}

const FEE_STATUS: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' }
> = {
  paid: { label: 'Đã đóng', variant: 'success' },
  partial: { label: 'Đóng 1 phần', variant: 'warning' },
  unpaid: { label: 'Chờ đóng', variant: 'outline' },
  overdue: { label: 'Quá hạn', variant: 'destructive' },
  waived: { label: 'Miễn phí', variant: 'success' },
};

const txColumns = [
  {
    key: 'date',
    label: 'Ngày',
    render: (item: Transaction) => (
      <span className="text-sm">{new Date(item.date).toLocaleDateString('vi-VN')}</span>
    ),
  },
  {
    key: 'description',
    label: 'Mô tả',
    render: (item: Transaction) => <span className="font-medium">{item.description}</span>,
  },
  { key: 'category', label: 'Danh mục' },
  {
    key: 'amount',
    label: 'Số tiền',
    render: (item: Transaction) => (
      <span
        className={cn(
          'font-semibold',
          item.type === 'income' ? 'text-emerald-600' : 'text-red-600',
        )}
      >
        {item.type === 'income' ? '+' : '-'}
        {formatVND(item.amount)}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (item: Transaction) => (
      <Badge
        variant={
          item.status === 'completed'
            ? 'success'
            : item.status === 'reversed'
              ? 'destructive'
              : 'warning'
        }
      >
        {item.status === 'completed'
          ? 'Hoàn thành'
          : item.status === 'reversed'
            ? 'Đã hủy'
            : 'Chờ duyệt'}
      </Badge>
    ),
  },
];

const feeColumns = [
  {
    key: 'memberName',
    label: 'Đoàn sinh',
    render: (item: FeeItem) => (
      <span className="font-medium">{item.orgMember?.scoutName ?? '—'}</span>
    ),
  },
  {
    key: 'feePeriod',
    label: 'Kỳ thu',
    render: (item: FeeItem) => <span>{item.feePeriod ?? '—'}</span>,
  },
  {
    key: 'amountDue',
    label: 'Phải thu',
    render: (item: FeeItem) => <span>{formatVND(Number(item.amountDue))}</span>,
  },
  {
    key: 'amountPaid',
    label: 'Đã thu',
    render: (item: FeeItem) => (
      <span className="text-emerald-600">{formatVND(Number(item.amountPaid))}</span>
    ),
  },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (item: FeeItem) => {
      const cfg = FEE_STATUS[item.status] ?? { label: item.status, variant: 'outline' as const };
      return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
    },
  },
  {
    key: 'dueDate',
    label: 'Hạn nộp',
    render: (item: FeeItem) => {
      if (!item.dueDate)
        return <span className="text-sm text-[hsl(var(--muted-foreground))]">—</span>;
      const isOverdue =
        new Date(item.dueDate) < new Date() && !['paid', 'waived'].includes(item.status);
      return (
        <span className={cn('text-sm', isOverdue ? 'text-red-500 font-medium' : '')}>
          {isOverdue && <AlertTriangle className="inline h-3 w-3 mr-1" />}
          {new Date(item.dueDate).toLocaleDateString('vi-VN')}
        </span>
      );
    },
  },
];

export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumData, txData, feeData] = await Promise.all([
        api.get<FinanceSummary>('/finance/summary'),
        api.get<Transaction[]>('/finance/export/transactions'),
        api.get<FeeItem[]>('/finance/fees', { limit: 50 }),
      ]);
      setSummary(sumData);
      setTransactions(txData);
      setFees(feeData);
      setError(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredFees = fees.filter((f) =>
    (f.orgMember?.scoutName ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  if (error)
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <Wallet className="h-8 w-8 text-emerald-500" />
          Tài chính
        </h1>
        <div className="p-4 bg-red-950 rounded-lg text-red-200">⚠️ {error}</div>
      </div>
    );

  const totals = summary?.totals ?? { income: 0, expense: 0, net: 0 };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Wallet className="h-8 w-8 text-emerald-500" />
          Tài chính
        </h1>
        <Button>
          <Plus className="h-4 w-4 mr-1" /> Tạo giao dịch
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Tổng số dư</p>
                <p className="text-2xl font-bold text-emerald-800">
                  {loading ? '...' : formatVND(totals.net)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Thu nhập</p>
                <p className="text-2xl font-bold text-blue-800">
                  {loading ? '...' : formatVND(totals.income)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-600 font-medium">Chi tiêu</p>
                <p className="text-2xl font-bold text-rose-800">
                  {loading ? '...' : formatVND(totals.expense)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Giao dịch gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
              <p className="text-4xl mb-2">📊</p>
              <p>Chưa có giao dịch nào.</p>
            </div>
          ) : (
            <DataTable columns={txColumns} data={transactions.slice(0, 20)} />
          )}
        </CardContent>
      </Card>

      {/* Fees */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5" />
              Thu phí Đoàn sinh
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Tìm Đoàn sinh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
              <p className="text-4xl mb-2">💳</p>
              <p>Chưa có khoản phí nào.</p>
            </div>
          ) : (
            <DataTable columns={feeColumns} data={filteredFees} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
