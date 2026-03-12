'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Member {
  id: string;
  memberCode?: string;
  scoutName?: string;
  heroName?: string;
  role: string;
  status: string;
  branchId?: string;
  joinedDate?: string;
  user?: { displayName?: string; email?: string; avatarUrl?: string };
}

interface MembersResponse {
  data: Member[];
  total: number;
  page: number;
  limit: number;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-500/20 text-red-300',
  admin: 'bg-amber-500/20 text-amber-300',
  leader: 'bg-blue-500/20 text-blue-300',
  volunteer: 'bg-emerald-500/20 text-emerald-300',
  member: 'bg-zinc-500/20 text-zinc-300',
  parent: 'bg-violet-500/20 text-violet-300',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Quản trị',
  leader: 'Huynh trưởng',
  volunteer: 'Tình nguyện',
  member: 'Đoàn sinh',
  parent: 'Phụ huynh',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-300',
  inactive: 'bg-zinc-500/20 text-zinc-300',
  suspended: 'bg-red-500/20 text-red-300',
  pending: 'bg-amber-500/20 text-amber-300',
};

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (roleFilter) params.set('role', roleFilter);
      if (search) params.set('search', search);
      const res = await api.get<MembersResponse>(`/hrm/members?${params}`);
      setMembers(res.data || []);
      setTotal(res.total || 0);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">👥</span> Thành Viên
        </h1>
        <p className="text-zinc-400 mt-1">
          Quản lý đoàn sinh, huynh trưởng, tình nguyện viên — {total} thành viên
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 flex gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="🔍 Tìm kiếm theo tên, mã..."
          className="flex-1 min-w-[200px] max-w-md bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:border-amber-500 outline-none"
        />
        <div className="flex gap-1 flex-wrap">
          {['', 'member', 'leader', 'volunteer', 'admin', 'parent'].map((r) => (
            <button
              key={r}
              onClick={() => {
                setRoleFilter(r);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${roleFilter === r ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'}`}
            >
              {r === '' ? 'Tất cả' : ROLE_LABELS[r] || r}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-zinc-400 text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          {members.length === 0 && (
            <p className="text-zinc-500 text-center py-12">Không tìm thấy thành viên nào.</p>
          )}
          {members.map((m) => (
            <div
              key={m.id}
              onClick={() => router.push(`/members/${m.id}`)}
              className="flex items-center gap-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 hover:border-zinc-600 cursor-pointer transition-colors"
            >
              {/* Avatar */}
              {m.user?.avatarUrl ? (
                <img
                  src={m.user.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full ring-1 ring-zinc-600"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white font-bold">
                  {(m.user?.displayName || m.scoutName || '?')[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {m.user?.displayName || m.scoutName || m.memberCode || 'Unnamed'}
                </p>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                  {m.memberCode && <span className="font-mono">{m.memberCode}</span>}
                  {m.scoutName && <span>· {m.scoutName}</span>}
                  {m.branchId && <span>· {m.branchId}</span>}
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-lg font-medium ${ROLE_COLORS[m.role] || 'bg-zinc-700 text-zinc-300'}`}
              >
                {ROLE_LABELS[m.role] || m.role}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-lg ${STATUS_COLORS[m.status] || 'bg-zinc-700 text-zinc-300'}`}
              >
                {m.status}
              </span>
            </div>
          ))}
          {total > 20 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded bg-zinc-700 text-zinc-300 disabled:opacity-30 text-sm"
              >
                ← Trước
              </button>
              <span className="text-zinc-400 text-sm">
                Trang {page} / {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={members.length < 20}
                className="px-3 py-1 rounded bg-zinc-700 text-zinc-300 disabled:opacity-30 text-sm"
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
