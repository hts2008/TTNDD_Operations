'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, BookHeart, ShieldCheck, CalendarDays, Lock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalEntry {
  id: string;
  date: string;
  type: string;
  emotionBefore: string;
  emotionAfter: string;
  notes: string;
}

const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'j1',
    date: '2026-03-04',
    type: 'Thiền định',
    emotionBefore: '😟 Lo lắng',
    emotionAfter: '😊 Bình an',
    notes: 'Thiền 15 phút trước giờ ngủ, cảm thấy tâm trí nhẹ nhàng hơn.',
  },
  {
    id: 'j2',
    date: '2026-03-02',
    type: 'Cầu nguyện',
    emotionBefore: '😔 Buồn',
    emotionAfter: '🙏 Biết ơn',
    notes: 'Cầu nguyện cho gia đình và bạn bè. Nhận ra nhiều điều cần trân trọng.',
  },
  {
    id: 'j3',
    date: '2026-02-28',
    type: 'Đọc kinh',
    emotionBefore: '😐 Bình thường',
    emotionAfter: '✨ Hứng khởi',
    notes: 'Đọc Thánh Ngôn Hiệp Tuyển, bài về Bác Ái — rất cảm động.',
  },
];

const FIVE_PRECEPTS = [
  { id: 'p1', name: 'Nhất giới: Không sát sanh', rating: 5, description: 'Tôn trọng sự sống' },
  { id: 'p2', name: 'Nhị giới: Không trộm cắp', rating: 5, description: 'Ngay thẳng, chính trực' },
  { id: 'p3', name: 'Tam giới: Không tà dâm', rating: 4, description: 'Giữ gìn phẩm hạnh' },
  { id: 'p4', name: 'Tứ giới: Không vọng ngữ', rating: 3, description: 'Nói lời chân thật' },
  { id: 'p5', name: 'Ngũ giới: Không dùng chất say', rating: 5, description: 'Giữ tâm trí trong sáng' },
];

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-5 w-5',
            i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200',
          )}
        />
      ))}
    </div>
  );
}

export default function EnrichmentPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Heart className="h-8 w-8 text-rose-500" />
        Tâm linh & Đánh giá
      </h1>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
        <Lock className="h-4 w-4 shrink-0" />
        <span>Chỉ bạn mới xem được thông tin này. Dữ liệu được bảo mật tuyệt đối.</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookHeart className="h-5 w-5 text-rose-500" />
              Nhật ký tâm linh
            </CardTitle>
            <Button size="sm">Thêm ghi chú</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {JOURNAL_ENTRIES.map((entry) => (
              <div key={entry.id} className="p-4 rounded-lg border hover:bg-[hsl(var(--muted)_/_0.3)] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{entry.type}</Badge>
                      <span className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(entry.date).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-sm">{entry.notes}</p>
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">Trước</div>
                    <div className="text-sm">{entry.emotionBefore}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Sau</div>
                    <div className="text-sm">{entry.emotionAfter}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            Ngũ Giới tự đánh giá
          </CardTitle>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Tự đánh giá tuần này (01/03 — 07/03/2026)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FIVE_PRECEPTS.map((precept) => (
              <div key={precept.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{precept.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{precept.description}</p>
                </div>
                <StarRating rating={precept.rating} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button>Lưu đánh giá</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
