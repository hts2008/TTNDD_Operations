'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lessonCount: number;
  expReward: number;
  enrolled: boolean;
  progress: number;
  gradient: string;
  duration: string;
}

const DIFFICULTY_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  beginner: { label: 'Cơ bản', variant: 'success' },
  intermediate: { label: 'Trung cấp', variant: 'warning' },
  advanced: { label: 'Nâng cao', variant: 'destructive' },
};

const COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Nhập môn Hướng Đạo',
    description: 'Tìm hiểu lịch sử, nguyên tắc và phương pháp Hướng Đạo Sinh.',
    difficulty: 'beginner',
    lessonCount: 8,
    expReward: 200,
    enrolled: true,
    progress: 75,
    gradient: 'from-green-400 to-emerald-500',
    duration: '4 giờ',
  },
  {
    id: 'c2',
    title: 'Kỹ năng Trại & Dã ngoại',
    description: 'Dựng lều, nấu ăn ngoài trời, sinh tồn trong tự nhiên.',
    difficulty: 'intermediate',
    lessonCount: 12,
    expReward: 350,
    enrolled: true,
    progress: 40,
    gradient: 'from-amber-400 to-orange-500',
    duration: '6 giờ',
  },
  {
    id: 'c3',
    title: 'Giáo lý Cao Đài cơ bản',
    description: 'Tìm hiểu nền tảng giáo lý Đại Đạo Tam Kỳ Phổ Độ.',
    difficulty: 'beginner',
    lessonCount: 10,
    expReward: 250,
    enrolled: false,
    progress: 0,
    gradient: 'from-blue-400 to-indigo-500',
    duration: '5 giờ',
  },
  {
    id: 'c4',
    title: 'Sơ cấp cứu thực hành',
    description: 'Kỹ năng xử lý tình huống khẩn cấp, băng bó và hồi sức.',
    difficulty: 'intermediate',
    lessonCount: 6,
    expReward: 300,
    enrolled: false,
    progress: 0,
    gradient: 'from-red-400 to-rose-500',
    duration: '3 giờ',
  },
  {
    id: 'c5',
    title: 'Lãnh đạo & Quản lý đội nhóm',
    description: 'Phát triển kỹ năng lãnh đạo, giao tiếp và tổ chức hoạt động.',
    difficulty: 'advanced',
    lessonCount: 15,
    expReward: 500,
    enrolled: false,
    progress: 0,
    gradient: 'from-purple-400 to-violet-500',
    duration: '8 giờ',
  },
  {
    id: 'c6',
    title: 'Ngũ Giới & Đạo đức sống',
    description: 'Ứng dụng Ngũ Giới vào cuộc sống hằng ngày, rèn luyện đạo đức.',
    difficulty: 'beginner',
    lessonCount: 5,
    expReward: 150,
    enrolled: true,
    progress: 100,
    gradient: 'from-teal-400 to-cyan-500',
    duration: '2.5 giờ',
  },
];

export default function LmsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-blue-500" />
        Học tập
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COURSES.map((course) => {
          const diff = DIFFICULTY_CONFIG[course.difficulty];
          return (
            <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              <div className={cn('h-36 bg-gradient-to-br flex items-center justify-center', course.gradient)}>
                <BookOpen className="h-16 w-16 text-white/80 group-hover:scale-110 transition-transform" />
              </div>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base leading-tight">{course.title}</h3>
                  <Badge variant={diff.variant} className="shrink-0 text-[10px]">{diff.label}</Badge>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">{course.description}</p>

                <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> {course.lessonCount} bài
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {course.duration}
                  </span>
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <Zap className="h-3.5 w-3.5" /> +{course.expReward} EXP
                  </span>
                </div>

                {course.enrolled && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[hsl(var(--muted-foreground))]">Tiến trình</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-[hsl(var(--muted))] rounded-full h-2 overflow-hidden">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all',
                          course.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500',
                        )}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  variant={course.enrolled ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                >
                  {course.progress === 100 ? (
                    <><Star className="h-4 w-4 mr-1" /> Đã hoàn thành</>
                  ) : course.enrolled ? (
                    'Tiếp tục học'
                  ) : (
                    'Đăng ký khóa học'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
