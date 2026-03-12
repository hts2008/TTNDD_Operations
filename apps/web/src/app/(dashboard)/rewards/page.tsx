'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { Trophy, Star, TrendingUp, Medal, Search } from 'lucide-react';

const MY_EXP = {
  total: 2450,
  level: 12,
  currentLevelExp: 450,
  nextLevelExp: 600,
  rank: 'Hướng Thiện',
};

const LEADERBOARD = [
  { id: '1', rank: 1, name: 'Nguyễn Minh Tuấn', exp: 5200, level: 22, badges: 14 },
  { id: '2', rank: 2, name: 'Trần Thị Hồng Nhung', exp: 4850, level: 21, badges: 12 },
  { id: '3', rank: 3, name: 'Lê Hoàng Nam', exp: 4300, level: 19, badges: 11 },
  { id: '4', rank: 4, name: 'Phạm Thanh Hà', exp: 3900, level: 17, badges: 9 },
  { id: '5', rank: 5, name: 'Võ Đức Anh', exp: 3400, level: 15, badges: 8 },
  { id: '6', rank: 6, name: 'Huỳnh Thị Mai', exp: 3100, level: 14, badges: 7 },
  { id: '7', rank: 7, name: 'Đặng Quốc Bảo', exp: 2800, level: 13, badges: 6 },
  { id: '8', rank: 8, name: 'Bùi Thị Lan Anh', exp: 2450, level: 12, badges: 5 },
  { id: '9', rank: 9, name: 'Ngô Văn Hùng', exp: 2100, level: 10, badges: 4 },
  { id: '10', rank: 10, name: 'Trịnh Thị Ngọc', exp: 1800, level: 9, badges: 3 },
];

const RANK_MEDAL: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-gray-400',
  3: 'text-amber-600',
};

const columns = [
  {
    key: 'rank',
    label: '#',
    render: (item: (typeof LEADERBOARD)[0]) => (
      <span className={`font-bold text-lg ${RANK_MEDAL[item.rank] ?? 'text-[hsl(var(--muted-foreground))]'}`}>
        {item.rank <= 3 ? <Medal className="inline h-5 w-5" /> : null} {item.rank}
      </span>
    ),
  },
  {
    key: 'name',
    label: 'Họ tên',
    render: (item: (typeof LEADERBOARD)[0]) => (
      <span className="font-medium">{item.name}</span>
    ),
  },
  {
    key: 'exp',
    label: 'EXP',
    render: (item: (typeof LEADERBOARD)[0]) => (
      <span className="font-semibold text-amber-600">{item.exp.toLocaleString('vi-VN')}</span>
    ),
  },
  {
    key: 'level',
    label: 'Cấp độ',
    render: (item: (typeof LEADERBOARD)[0]) => (
      <Badge variant="secondary">Lv.{item.level}</Badge>
    ),
  },
  {
    key: 'badges',
    label: 'Huy hiệu',
    render: (item: (typeof LEADERBOARD)[0]) => (
      <span className="flex items-center gap-1">
        <Star className="h-4 w-4 text-yellow-500" /> {item.badges}
      </span>
    ),
  },
];

export default function RewardsPage() {
  const [search, setSearch] = useState('');
  const progressPercent = Math.round((MY_EXP.currentLevelExp / MY_EXP.nextLevelExp) * 100);

  const filtered = LEADERBOARD.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Trophy className="h-8 w-8 text-amber-500" />
        Điểm thưởng & Bảng xếp hạng
      </h1>

      <Card className="bg-linear-to-r from-amber-50 to-yellow-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Star className="h-6 w-6" />
            EXP của tôi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-amber-600 font-medium">Tổng EXP</p>
              <p className="text-3xl font-bold text-amber-800">{MY_EXP.total.toLocaleString('vi-VN')}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-amber-600 font-medium">Cấp độ</p>
              <p className="text-3xl font-bold text-amber-800">Lv.{MY_EXP.level}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-amber-600 font-medium">Đẳng thứ</p>
              <p className="text-xl font-bold text-amber-800">{MY_EXP.rank}</p>
            </div>
            <div>
              <p className="text-sm text-amber-600 font-medium mb-2">Tiến trình lên cấp</p>
              <div className="w-full bg-amber-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-linear-to-r from-amber-400 to-yellow-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-amber-600 mt-1 text-right">
                {MY_EXP.currentLevelExp} / {MY_EXP.nextLevelExp} EXP ({progressPercent}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Bảng xếp hạng
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filtered} />
        </CardContent>
      </Card>
    </div>
  );
}
