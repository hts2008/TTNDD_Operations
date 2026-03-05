'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'completed' | 'pending';
}

interface Fee {
  id: string;
  memberName: string;
  period: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

const STATS = {
  balance: 45_600_000,
  incomeThisMonth: 12_500_000,
  expenseThisMonth: 8_200_000,
};

const TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2026-03-04', description: 'Thu phí sinh hoạt tháng 3', category: 'Phí sinh hoạt', amount: 5_000_000, type: 'income', status: 'completed' },
  { id: '2', date: '2026-03-03', description: 'Mua vật tư trại huấn luyện', category: 'Vật tư', amount: -3_200_000, type: 'expense', status: 'completed' },
  { id: '3', date: '2026-03-02', description: 'Tài trợ từ Ban Đại Diện', category: 'Tài trợ', amount: 7_500_000, type: 'income', status: 'completed' },
  { id: '4', date: '2026-03-01', description: 'In ấn tài liệu giáo lý', category: 'In ấn', amount: -1_800_000, type: 'expense', status: 'pending' },
  { id: '5', date: '2026-02-28', description: 'Chi phí thuê xe cho dã ngoại', category: 'Vận chuyển', amount: -3_200_000, type: 'expense', status: 'completed' },
];

const FEES: Fee[] = [
  { id: 'f1', memberName: 'Nguyễn Minh Tuấn', period: 'Q1/2026', amount: 300_000, status: 'paid' },
  { id: 'f2', memberName: 'Trần Thị Hồng Nhung', period: 'Q1/2026', amount: 300_000, status: 'pending' },
  { id: 'f3', memberName: 'Lê Hoàng Nam', period: 'Q1/2026', amount: 300_000, status: 'overdue' },
];

const FEE_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  paid: { label: 'Đã đóng', variant: 'success' },
  pending: { label: 'Chờ đóng', variant: 'warning' },
  overdue: { label: 'Quá hạn', variant: 'destructive' },
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
      <span className={cn('font-semibold', item.type === 'income' ? 'text-emerald-600' : 'text-red-600')}>
        {item.type === 'income' ? '+' : ''}{formatVND(item.amount)}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (item: Transaction) => (
      <Badge variant={item.status === 'completed' ? 'success' : 'warning'}>
        {item.status === 'completed' ? 'Hoàn thành' : 'Chờ duyệt'}
      </Badge>
    ),
  },
];

const feeColumns = [
  { key: 'memberName', label: 'Đoàn sinh', render: (item: Fee) => <span className="font-medium">{item.memberName}</span> },
  { key: 'period', label: 'Kỳ thu' },
  { key: 'amount', label: 'Số tiền', render: (item: Fee) => <span>{formatVND(item.amount)}</span> },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (item: Fee) => {
      const cfg = FEE_STATUS[item.status];
      return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
    },
  },
];

export default function FinancePage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Wallet className="h-8 w-8 text-emerald-500" />
        Tài chính
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Tổng số dư</p>
                <p className="text-2xl font-bold text-emerald-800">{formatVND(STATS.balance)}</p>
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
                <p className="text-sm text-blue-600 font-medium">Thu nhập tháng này</p>
                <p className="text-2xl font-bold text-blue-800">{formatVND(STATS.incomeThisMonth)}</p>
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
                <p className="text-sm text-rose-600 font-medium">Chi tiêu tháng này</p>
                <p className="text-2xl font-bold text-rose-800">{formatVND(STATS.expenseThisMonth)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Giao dịch gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={txColumns} data={TRANSACTIONS} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5" />
            Thu phí Đoàn sinh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={feeColumns} data={FEES} />
        </CardContent>
      </Card>
    </div>
  );
}
