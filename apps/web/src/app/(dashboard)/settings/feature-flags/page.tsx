'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Flag, ToggleLeft, ToggleRight, Search, AlertTriangle } from 'lucide-react';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  requiresRestart?: boolean;
}

const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    id: '1',
    key: 'WAREHOUSE_SYNC_ENABLED',
    name: 'BigQuery Sync',
    description: 'Đồng bộ dữ liệu hoạt động lên BigQuery warehouse',
    enabled: false,
    category: 'data',
  },
  {
    id: '2',
    key: 'PEER_RECOGNITION_ENABLED',
    name: 'Nhận diện đồng đẳng',
    description: 'Cho phép đoàn sinh tặng nhận xét cho nhau',
    enabled: true,
    category: 'rewards',
  },
  {
    id: '3',
    key: 'QUIZ_BATTLE_ENABLED',
    name: 'Đấu trí Quiz',
    description: 'Chế độ đấu trí thời gian thực giữa đoàn sinh',
    enabled: true,
    category: 'lms',
  },
  {
    id: '4',
    key: 'OFFLINE_PACKS_ENABLED',
    name: 'Gói Offline',
    description: 'Cho phép tải nội dung để dùng ngoại tuyến',
    enabled: false,
    category: 'system',
  },
  {
    id: '5',
    key: 'PARENT_PORTAL_ENABLED',
    name: 'Cổng Phụ huynh',
    description: 'Phụ huynh xem tiến trình con em',
    enabled: true,
    category: 'hrm',
  },
  {
    id: '6',
    key: 'LEADERBOARD_PUBLIC',
    name: 'Bảng xếp hạng công khai',
    description: 'Hiển thị bảng xếp hạng cho tất cả thành viên',
    enabled: true,
    category: 'rewards',
  },
  {
    id: '7',
    key: 'AUTO_BADGE_AWARD',
    name: 'Tự động cấp huy hiệu',
    description: 'Hệ thống tự cấp huy hiệu khi đạt điều kiện',
    enabled: true,
    category: 'rewards',
  },
  {
    id: '8',
    key: 'NOTIFICATION_EMAIL',
    name: 'Thông báo qua Email',
    description: 'Gửi email cho sự kiện quan trọng',
    enabled: false,
    category: 'notifications',
    requiresRestart: true,
  },
  {
    id: '9',
    key: 'NOTIFICATION_PUSH',
    name: 'Thông báo Push',
    description: 'Gửi push notification cho ứng dụng di động',
    enabled: false,
    category: 'notifications',
    requiresRestart: true,
  },
  {
    id: '10',
    key: 'SOP_APPROVAL_REQUIRED',
    name: 'Yêu cầu phê duyệt SOP',
    description: 'SOP phải qua phê duyệt trước khi xuất bản',
    enabled: true,
    category: 'process',
  },
  {
    id: '11',
    key: 'FINANCIAL_AUDIT_TRAIL',
    name: 'Audit trail tài chính',
    description: 'Ghi lại mọi thay đổi tài chính',
    enabled: true,
    category: 'finance',
  },
  {
    id: '12',
    key: 'CHILD_SAFETY_STRICT',
    name: 'An toàn trẻ em nghiêm ngặt',
    description: 'Bật tất cả biện pháp bảo vệ trẻ em',
    enabled: true,
    category: 'safety',
  },
  {
    id: '13',
    key: 'DARK_MODE',
    name: 'Chế độ tối',
    description: 'Cho phép chuyển giao diện tối',
    enabled: false,
    category: 'ui',
  },
  {
    id: '14',
    key: 'EXPERIMENTAL_3D',
    name: '3D Scene (thử nghiệm)',
    description: 'Bật chế độ 3D cho trang dashboard',
    enabled: false,
    category: 'ui',
    requiresRestart: true,
  },
];

const CATEGORIES: Record<string, string> = {
  rewards: 'Điểm thưởng',
  lms: 'Học tập',
  hrm: 'Nhân sự',
  data: 'Dữ liệu',
  system: 'Hệ thống',
  notifications: 'Thông báo',
  process: 'Quy trình',
  finance: 'Tài chính',
  safety: 'An toàn',
  ui: 'Giao diện',
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(DEFAULT_FLAGS);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const toggle = (id: string) => {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  };

  const categories = [...new Set(flags.map((f) => f.category))];
  const filtered = flags.filter((f) => {
    const matchSearch =
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || f.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6" />
            Feature Flags
          </h1>
          <p className="text-muted-foreground">Bật/tắt tính năng cho toàn hệ thống</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {flags.filter((f) => f.enabled).length}/{flags.length} đang bật
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm"
            placeholder="Tìm feature flag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option value="all">Tất cả</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORIES[c] || c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((f) => (
          <Card key={f.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">{f.name}</h3>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.key}</code>
                  {f.requiresRestart && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      Cần khởi động lại
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                <span className="text-xs text-muted-foreground">
                  {CATEGORIES[f.category] || f.category}
                </span>
              </div>
              <button onClick={() => toggle(f.id)} className="shrink-0 ml-4">
                {f.enabled ? (
                  <ToggleRight className="h-8 w-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-300" />
                )}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
