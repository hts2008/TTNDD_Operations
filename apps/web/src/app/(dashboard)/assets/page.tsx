'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, MapPin, HandMetal } from 'lucide-react';
import { cn } from '@/lib/utils';

type AssetStatus = 'available' | 'in_use' | 'maintenance' | 'retired';
type AssetCategory = 'equipment' | 'uniform' | 'document' | 'other';

interface Asset {
  id: string;
  name: string;
  code: string;
  category: AssetCategory;
  status: AssetStatus;
  available: number;
  total: number;
  location: string;
}

const STATUS_CONFIG: Record<AssetStatus, { label: string; className: string }> = {
  available: { label: 'Sẵn có', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  in_use: { label: 'Đang mượn', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  maintenance: { label: 'Bảo trì', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  retired: { label: 'Thanh lý', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const CATEGORY_CONFIG: Record<AssetCategory, { label: string; emoji: string }> = {
  equipment: { label: 'Thiết bị', emoji: '🔧' },
  uniform: { label: 'Trang phục', emoji: '👕' },
  document: { label: 'Tài liệu', emoji: '📄' },
  other: { label: 'Khác', emoji: '📦' },
};

const ASSETS: Asset[] = [
  { id: '1', name: 'Lều trại 6 người', code: 'TB-001', category: 'equipment', status: 'available', available: 8, total: 10, location: 'Kho Tòa Thánh' },
  { id: '2', name: 'Áo đồng phục Ngành Thiếu', code: 'TP-001', category: 'uniform', status: 'available', available: 25, total: 50, location: 'Kho Thánh Thất Q1' },
  { id: '3', name: 'Dây thừng 10m', code: 'TB-002', category: 'equipment', status: 'in_use', available: 0, total: 20, location: 'Trại huấn luyện' },
  { id: '4', name: 'Sách Giáo lý Cao Đài', code: 'TL-001', category: 'document', status: 'available', available: 40, total: 50, location: 'Thư viện' },
  { id: '5', name: 'Bộ nồi nấu trại', code: 'TB-003', category: 'equipment', status: 'maintenance', available: 0, total: 5, location: 'Xưởng sửa chữa' },
  { id: '6', name: 'Mũ beret Hướng Đạo', code: 'TP-002', category: 'uniform', status: 'retired', available: 0, total: 15, location: 'Kho cũ' },
];

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'equipment', label: 'Thiết bị' },
  { key: 'uniform', label: 'Trang phục' },
  { key: 'document', label: 'Tài liệu' },
] as const;

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<string>('all');

  const filtered = activeTab === 'all' ? ASSETS : ASSETS.filter((a) => a.category === activeTab);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Package className="h-8 w-8 text-sky-500" />
        Tài sản
      </h1>

      <div className="flex gap-1 border-b border-[hsl(var(--border))]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === tab.key
                ? 'text-[hsl(var(--primary))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--primary))]" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((asset) => {
          const statusCfg = STATUS_CONFIG[asset.status];
          const catCfg = CATEGORY_CONFIG[asset.category];
          const canBorrow = asset.status === 'available' && asset.available > 0;

          return (
            <Card key={asset.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{catCfg.emoji}</span>
                    <div>
                      <CardTitle className="text-base">{asset.name}</CardTitle>
                      <p className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{asset.code}</p>
                    </div>
                  </div>
                  <Badge className={cn('border shrink-0', statusCfg.className)}>{statusCfg.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">Số lượng</span>
                  <span className="font-medium">
                    <span className={cn(asset.available === 0 ? 'text-red-500' : 'text-emerald-600')}>
                      {asset.available}
                    </span>
                    /{asset.total}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))]">
                  <MapPin className="h-3.5 w-3.5" /> {asset.location}
                </div>

                {canBorrow && (
                  <Button size="sm" className="w-full">
                    <HandMetal className="h-4 w-4 mr-1" /> Mượn tài sản
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
