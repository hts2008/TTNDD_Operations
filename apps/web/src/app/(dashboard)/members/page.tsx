'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { Search, UserPlus, Users } from 'lucide-react';

interface Member {
  id: string;
  code: string;
  name: string;
  branch: string;
  unit: string;
  status: string;
  exp: number;
  [key: string]: unknown;
}

const MOCK_MEMBERS: Member[] = [
  { id: '1', code: 'DS-001', name: 'Nguyễn Văn An', branch: 'Ngành Thiếu', unit: 'Đội Hướng Dương', status: 'active', exp: 1250 },
  { id: '2', code: 'DS-002', name: 'Trần Thị Bình', branch: 'Ngành Thiếu', unit: 'Đội Hải Âu', status: 'active', exp: 980 },
  { id: '3', code: 'DS-003', name: 'Lê Minh Châu', branch: 'Ngành Đồng', unit: 'Đàn Sơn Ca', status: 'active', exp: 450 },
  { id: '4', code: 'DS-004', name: 'Phạm Đức Dũng', branch: 'Ngành Thanh', unit: 'Toán Bạch Mã', status: 'inactive', exp: 2100 },
  { id: '5', code: 'DS-005', name: 'Hoàng Thị Lan', branch: 'Ngành Thiếu', unit: 'Đội Hướng Dương', status: 'suspended', exp: 320 },
];

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  active: { label: 'Hoạt động', variant: 'success' },
  inactive: { label: 'Ngưng', variant: 'secondary' },
  suspended: { label: 'Đình chỉ', variant: 'destructive' },
};

const FILTER_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Hoạt động' },
  { key: 'inactive', label: 'Ngưng' },
  { key: 'suspended', label: 'Đình chỉ' },
];

export default function MembersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = MOCK_MEMBERS.filter((m) => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns = [
    { key: 'code', label: 'Mã' },
    { key: 'name', label: 'Họ tên', render: (m: Member) => <span className="font-medium">{m.name}</span> },
    { key: 'branch', label: 'Ngành' },
    { key: 'unit', label: 'Đơn vị' },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (m: Member) => {
        const s = STATUS_MAP[m.status];
        return s ? <Badge variant={s.variant}>{s.label}</Badge> : m.status;
      },
    },
    {
      key: 'exp',
      label: 'EXP',
      render: (m: Member) => <span className="font-mono text-sm font-medium text-amber-600">{m.exp.toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Users className="h-6 w-6 text-[hsl(var(--primary))]" />
            Đoàn sinh
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Quản lý danh sách đoàn sinh</p>
        </div>
        <Button className="gap-2 self-start">
          <UserPlus className="h-4 w-4" />
          Thêm đoàn sinh
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Tìm theo tên hoặc mã..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  filter === tab.key
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(m) => router.push(`/members/${m.id}`)}
        className="bg-[hsl(var(--card))]"
      />
    </div>
  );
}
