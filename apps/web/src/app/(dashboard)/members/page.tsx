'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Search,
  UserPlus,
  Users,
  Loader2,
  AlertCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface MemberData {
  id: string;
  memberCode: string | null;
  scoutName: string | null;
  status: string;
  user: { id: string; displayName: string | null; email: string | null; avatarUrl: string | null };
  branch: { id: string; name: string; code: string } | null;
  unit: { id: string; name: string } | null;
  profile: { fullName: string; birthDate: string | null } | null;
  [key: string]: unknown;
}

interface ApiResponse {
  data: MemberData[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_MAP: Record<
  string,
  { label: string; variant: 'success' | 'secondary' | 'destructive' | 'warning' }
> = {
  active: { label: 'Hoạt động', variant: 'success' },
  pending: { label: 'Chờ duyệt', variant: 'warning' },
  inactive: { label: 'Ngưng', variant: 'secondary' },
  suspended: { label: 'Đình chỉ', variant: 'destructive' },
  transferred: { label: 'Chuyển đoàn', variant: 'secondary' },
  left: { label: 'Rời đoàn', variant: 'secondary' },
};

const FILTER_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Hoạt động' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'inactive', label: 'Ngưng' },
  { key: 'suspended', label: 'Đình chỉ' },
];

export default function MembersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (filter !== 'all') params.set('status', filter);
      if (search) params.set('search', search);

      const json = await api.getEnvelope<MemberData[]>('/hrm/members', Object.fromEntries(params));
      setData({ data: json.data, meta: json.meta as ApiResponse['meta'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    const debounce = setTimeout(fetchMembers, search ? 400 : 0);
    return () => clearTimeout(debounce);
  }, [fetchMembers, search]);

  const columns = [
    {
      key: 'memberCode',
      label: 'Mã',
      render: (m: MemberData) => <span className="font-mono text-xs">{m.memberCode || '—'}</span>,
    },
    {
      key: 'fullName',
      label: 'Họ tên',
      render: (m: MemberData) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))] shrink-0">
            {(m.profile?.fullName || m.user.displayName || '?').split(' ').slice(-1)[0]?.charAt(0)}
          </div>
          <div>
            <span className="font-medium">{m.profile?.fullName || m.user.displayName}</span>
            {m.scoutName && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{m.scoutName}</p>
            )}
          </div>
        </div>
      ),
    },
    { key: 'branch', label: 'Ngành', render: (m: MemberData) => m.branch?.name || '—' },
    { key: 'unit', label: 'Đơn vị', render: (m: MemberData) => m.unit?.name || '—' },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (m: MemberData) => {
        const s = STATUS_MAP[m.status];
        return s ? (
          <Badge variant={s.variant as 'success' | 'secondary' | 'destructive'}>{s.label}</Badge>
        ) : (
          <Badge variant="secondary">{m.status}</Badge>
        );
      },
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
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Quản lý danh sách đoàn sinh
            {data && <span className="ml-1">({data.meta.total} thành viên)</span>}
          </p>
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
              placeholder="Tìm theo tên, mã đoàn sinh..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setFilter(tab.key);
                  setPage(1);
                }}
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

      {/* T-1015: Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
          <span className="ml-3 text-sm text-[hsl(var(--muted-foreground))]">Đang tải...</span>
        </div>
      )}

      {/* T-1015: Error state */}
      {error && !loading && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-10 w-10 text-[hsl(var(--destructive))] mb-3" />
          <p className="text-sm font-medium text-[hsl(var(--destructive))]">Lỗi tải dữ liệu</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchMembers}>
            Thử lại
          </Button>
        </Card>
      )}

      {/* T-1015: Empty state */}
      {!loading && !error && data?.data.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-10 w-10 text-[hsl(var(--muted-foreground))] mb-3" />
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Chưa có đoàn sinh</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            {search ? 'Không tìm thấy kết quả phù hợp.' : 'Hãy thêm đoàn sinh đầu tiên.'}
          </p>
        </Card>
      )}

      {/* Data table */}
      {!loading && !error && data && data.data.length > 0 && (
        <>
          <DataTable
            columns={columns}
            data={data.data}
            onRowClick={(m) => router.push(`/members/${m.id}`)}
            className="bg-[hsl(var(--card))]"
          />

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Trang {data.meta.page}/{data.meta.totalPages} • {data.meta.total} kết quả
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
