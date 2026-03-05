'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeItem {
  id: string;
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  earnedDate?: string;
}

const BADGES: BadgeItem[] = [
  { id: 'b1', icon: '🏕️', name: 'Nhà cắm trại', description: 'Tham gia 5 trại huấn luyện', earned: true, earnedDate: '2026-01-15' },
  { id: 'b2', icon: '🔥', name: 'Người giữ lửa', description: 'Nhóm lửa trại thành công 3 lần', earned: true, earnedDate: '2025-12-20' },
  { id: 'b3', icon: '🧭', name: 'Hoa tiêu', description: 'Hoàn thành bài kiểm tra định hướng', earned: true, earnedDate: '2025-11-10' },
  { id: 'b4', icon: '🎖️', name: 'Chiến sĩ xuất sắc', description: 'Đạt top 10 bảng xếp hạng EXP', earned: true, earnedDate: '2026-02-28' },
  { id: 'b5', icon: '📖', name: 'Người truyền đạo', description: 'Hoàn thành khóa Giáo lý Cao Đài', earned: true, earnedDate: '2025-10-05' },
  { id: 'b6', icon: '🏊', name: 'Thủy thủ', description: 'Vượt qua bài kiểm tra bơi lội', earned: false },
  { id: 'b7', icon: '🎯', name: 'Xạ thủ', description: 'Đạt 90+ điểm bắn cung', earned: false },
  { id: 'b8', icon: '🌟', name: 'Ngôi sao dẫn đường', description: 'Dẫn dắt nhóm hoàn thành 3 dự án', earned: false },
];

export default function BadgesPage() {
  const earnedCount = BADGES.filter((b) => b.earned).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Award className="h-8 w-8 text-yellow-500" />
          Bộ sưu tập huy hiệu
        </h1>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {earnedCount}/{BADGES.length} đã đạt
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {BADGES.map((badge) => (
          <Card
            key={badge.id}
            className={cn(
              'text-center hover:shadow-md transition-all',
              !badge.earned && 'opacity-50 grayscale',
            )}
          >
            <CardContent className="p-6 space-y-3">
              <div className={cn(
                'text-5xl mx-auto w-20 h-20 rounded-full flex items-center justify-center',
                badge.earned
                  ? 'bg-gradient-to-br from-yellow-100 to-amber-100'
                  : 'bg-gray-100',
              )}>
                {badge.icon}
              </div>
              <h3 className="font-semibold">{badge.name}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{badge.description}</p>
              {badge.earned && badge.earnedDate ? (
                <div className="flex items-center justify-center gap-1 text-xs text-emerald-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Đạt ngày {new Date(badge.earnedDate).toLocaleDateString('vi-VN')}
                </div>
              ) : (
                <p className="text-xs text-[hsl(var(--muted-foreground))] italic">Chưa đạt</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
