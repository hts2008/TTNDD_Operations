'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Star, Zap, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface CourseResponse {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  category: string | null;
  difficulty: string | null;
  expReward: number;
  totalDuration: number | null;
  status: string;
  _count: { lessons: number; quizzes: number; progress: number };
}

interface PageMeta {
  total: number;
  page: number;
  limit: number;
}

const DIFFICULTY_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'destructive' }
> = {
  beginner: { label: 'Cơ bản', variant: 'success' },
  intermediate: { label: 'Trung cấp', variant: 'warning' },
  advanced: { label: 'Nâng cao', variant: 'destructive' },
};

const GRADIENT_MAP: Record<string, string> = {
  scout: 'from-green-400 to-emerald-500',
  religion: 'from-blue-400 to-indigo-500',
  skill: 'from-amber-400 to-orange-500',
  leadership: 'from-purple-400 to-violet-500',
  health: 'from-red-400 to-rose-500',
  default: 'from-teal-400 to-cyan-500',
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return '--';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
}

export default function LmsPage() {
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ data: CourseResponse[]; meta: PageMeta }>('/lms/courses', {
        page: String(meta.page),
        limit: String(meta.limit),
      })
      .then((res) => {
        setCourses(res.data);
        setMeta(res.meta);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [meta.page, meta.limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-[hsl(var(--muted-foreground))]">
        <Loader2 className="h-6 w-6 animate-spin" />
        Đang tải danh sách khóa học...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-red-500">
        <AlertCircle className="h-6 w-6" />
        {error}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-[hsl(var(--muted-foreground))]">
        <BookOpen className="h-12 w-12" />
        <p className="text-lg">Chưa có khóa học nào</p>
        <p className="text-sm">Khóa học sẽ xuất hiện ở đây khi được tạo bởi quản trị viên.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-blue-500" />
        Học tập
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const diff =
            DIFFICULTY_CONFIG[course.difficulty ?? 'beginner'] ?? DIFFICULTY_CONFIG.beginner;
          const gradient = GRADIENT_MAP[course.category ?? 'default'] ?? GRADIENT_MAP.default;

          return (
            <Link href={`/lms/${course.id}`} key={course.id}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer h-full">
                <div
                  className={cn(
                    'h-36 bg-gradient-to-br flex items-center justify-center',
                    gradient,
                  )}
                >
                  <BookOpen className="h-16 w-16 text-white/80 group-hover:scale-110 transition-transform" />
                </div>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base leading-tight">{course.title}</h3>
                    <Badge variant={diff.variant} className="shrink-0 text-[10px]">
                      {diff.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">
                    {course.description ?? 'Chưa có mô tả'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> {course._count.lessons} bài
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {formatDuration(course.totalDuration)}
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <Zap className="h-3.5 w-3.5" /> +{course.expReward} EXP
                    </span>
                  </div>

                  <Button variant="outline" size="sm" className="w-full">
                    {course._count.progress > 0 ? 'Tiếp tục học' : 'Đăng ký khóa học'}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {meta.total > meta.limit && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => setMeta((p) => ({ ...p, page: p.page - 1 }))}
          >
            Trang trước
          </Button>
          <span className="flex items-center text-sm text-[hsl(var(--muted-foreground))]">
            Trang {meta.page} / {Math.ceil(meta.total / meta.limit)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page * meta.limit >= meta.total}
            onClick={() => setMeta((p) => ({ ...p, page: p.page + 1 }))}
          >
            Trang sau
          </Button>
        </div>
      )}
    </div>
  );
}
