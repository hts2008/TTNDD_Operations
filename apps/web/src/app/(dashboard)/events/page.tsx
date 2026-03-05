'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Users, Search, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type EventStatus = 'planning' | 'approved' | 'registration_open' | 'in_progress' | 'completed';

interface EventItem {
  id: string;
  name: string;
  date: string;
  endDate: string;
  location: string;
  status: EventStatus;
  registered: number;
  maxCapacity: number;
  description: string;
}

const STATUS_CONFIG: Record<EventStatus, { label: string; className: string }> = {
  planning: { label: 'Đang lên kế hoạch', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  approved: { label: 'Đã duyệt', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  registration_open: { label: 'Mở đăng ký', className: 'bg-green-100 text-green-700 border-green-200' },
  in_progress: { label: 'Đang diễn ra', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  completed: { label: 'Đã hoàn thành', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const EVENTS: EventItem[] = [
  {
    id: '1',
    name: 'Trại Hè Thanh Thiếu Niên 2026',
    date: '2026-06-15',
    endDate: '2026-06-18',
    location: 'Tòa Thánh Tây Ninh',
    status: 'registration_open',
    registered: 45,
    maxCapacity: 80,
    description: 'Trại hè thường niên với các hoạt động ngoài trời, huấn luyện kỹ năng và sinh hoạt tôn giáo.',
  },
  {
    id: '2',
    name: 'Hội thảo Kỹ năng Lãnh đạo',
    date: '2026-04-20',
    endDate: '2026-04-20',
    location: 'Thánh Thất Quận 1',
    status: 'approved',
    registered: 0,
    maxCapacity: 30,
    description: 'Chương trình đào tạo kỹ năng lãnh đạo dành cho các Trưởng.',
  },
  {
    id: '3',
    name: 'Ngày hội Gia Đình Đạo',
    date: '2026-03-30',
    endDate: '2026-03-30',
    location: 'Công viên Tao Đàn',
    status: 'registration_open',
    registered: 120,
    maxCapacity: 200,
    description: 'Ngày hội giao lưu giữa các gia đình đạo hữu với trò chơi, ẩm thực chay và văn nghệ.',
  },
  {
    id: '4',
    name: 'Trại Huấn Luyện Sơ Cấp',
    date: '2026-03-10',
    endDate: '2026-03-12',
    location: 'KDL Suối Tiên',
    status: 'in_progress',
    registered: 35,
    maxCapacity: 35,
    description: 'Trại sơ cấp dành cho Đoàn sinh mới, tập trung vào kỹ năng Hướng Đạo cơ bản.',
  },
  {
    id: '5',
    name: 'Lễ Phát Thưởng Cuối Năm 2025',
    date: '2025-12-20',
    endDate: '2025-12-20',
    location: 'Tòa Thánh Tây Ninh',
    status: 'completed',
    registered: 200,
    maxCapacity: 200,
    description: 'Lễ phát thưởng thường niên, vinh danh các Đoàn sinh và Trưởng xuất sắc.',
  },
];

export default function EventsPage() {
  const [search, setSearch] = useState('');

  const filtered = EVENTS.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Calendar className="h-8 w-8 text-blue-500" />
          Sự kiện & Trại
        </h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Tìm kiếm sự kiện..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((event) => {
          const statusCfg = STATUS_CONFIG[event.status];
          const isFull = event.registered >= event.maxCapacity;
          const canRegister = event.status === 'registration_open' && !isFull;

          return (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{event.name}</h3>
                      <Badge className={cn('border', statusCfg.className)}>{statusCfg.label}</Badge>
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{event.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-[hsl(var(--muted-foreground))]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(event.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {event.date !== event.endDate && ` — ${new Date(event.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.registered}/{event.maxCapacity} người
                        {isFull && <Badge variant="destructive" className="ml-1 text-[10px]">Hết chỗ</Badge>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canRegister && (
                      <Button>Đăng ký</Button>
                    )}
                    {event.status === 'registration_open' && isFull && (
                      <Button variant="outline" disabled>Hết chỗ</Button>
                    )}
                    {event.status === 'completed' && (
                      <Button variant="outline">Xem kết quả</Button>
                    )}
                    {event.status === 'in_progress' && (
                      <Badge variant="warning" className="px-3 py-1.5">Đang diễn ra</Badge>
                    )}
                    {(event.status === 'planning' || event.status === 'approved') && (
                      <Button variant="outline" disabled>Chưa mở đăng ký</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
            Không tìm thấy sự kiện nào.
          </div>
        )}
      </div>
    </div>
  );
}
