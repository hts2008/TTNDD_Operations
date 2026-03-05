'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Play, FileText, HelpCircle, Clock, CheckCircle2, Circle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type LessonType = 'video' | 'text' | 'quiz';

interface Lesson {
  id: string;
  order: number;
  title: string;
  type: LessonType;
  duration: string;
  completed: boolean;
}

const TYPE_CONFIG: Record<LessonType, { label: string; icon: typeof Play; className: string }> = {
  video: { label: 'Video', icon: Play, className: 'bg-red-100 text-red-700' },
  text: { label: 'Bài đọc', icon: FileText, className: 'bg-blue-100 text-blue-700' },
  quiz: { label: 'Kiểm tra', icon: HelpCircle, className: 'bg-purple-100 text-purple-700' },
};

const COURSE = {
  id: 'c1',
  title: 'Nhập môn Hướng Đạo',
  description:
    'Khóa học toàn diện về lịch sử, nguyên tắc và phương pháp Hướng Đạo Sinh. Bạn sẽ tìm hiểu về Robert Baden-Powell, phong trào Hướng Đạo quốc tế và cách áp dụng vào hoạt động DTNDD.',
  expReward: 200,
  progress: 60,
};

const LESSONS: Lesson[] = [
  { id: 'l1', order: 1, title: 'Lịch sử phong trào Hướng Đạo', type: 'text', duration: '15 phút', completed: true },
  { id: 'l2', order: 2, title: 'Lời hứa và Luật Hướng Đạo', type: 'video', duration: '20 phút', completed: true },
  { id: 'l3', order: 3, title: 'Kiểm tra: Nền tảng Hướng Đạo', type: 'quiz', duration: '10 phút', completed: true },
  { id: 'l4', order: 4, title: 'Phương pháp Hướng Đạo trong DTNDD', type: 'video', duration: '25 phút', completed: false },
  { id: 'l5', order: 5, title: 'Bài tập thực hành: Lập kế hoạch sinh hoạt', type: 'text', duration: '30 phút', completed: false },
];

export default function CourseDetailPage() {
  const [lessons, setLessons] = useState(LESSONS);
  const completedCount = lessons.filter((l) => l.completed).length;
  const progress = Math.round((completedCount / lessons.length) * 100);

  const toggleLesson = (id: string) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === id ? { ...l, completed: !l.completed } : l)),
    );
  };

  const nextLesson = lessons.find((l) => !l.completed);

  return (
    <div className="space-y-6 p-6">
      <Button variant="ghost" size="sm" className="gap-1" onClick={() => window.history.back()}>
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </Button>

      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl text-green-900">{COURSE.title}</CardTitle>
              <p className="text-sm text-green-700">{COURSE.description}</p>
            </div>
            <Badge variant="success" className="shrink-0 text-sm px-3 py-1">
              <Zap className="h-3.5 w-3.5 mr-1" /> +{COURSE.expReward} EXP
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-green-600 font-medium">Tiến trình</p>
              <p className="text-2xl font-bold text-green-800">{progress}%</p>
            </div>
            <div className="flex-1">
              <div className="w-full bg-green-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-green-600 mt-1">
                {completedCount}/{lessons.length} bài đã hoàn thành
              </p>
            </div>
            {nextLesson && (
              <Button className="shrink-0 bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-1" /> Bắt đầu học
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Danh sách bài học
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {lessons.map((lesson) => {
              const typeCfg = TYPE_CONFIG[lesson.type];
              const TypeIcon = typeCfg.icon;
              return (
                <li
                  key={lesson.id}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                    lesson.completed
                      ? 'bg-green-50/50 border-green-200'
                      : 'hover:bg-[hsl(var(--muted)_/_0.5)]',
                  )}
                >
                  <button
                    onClick={() => toggleLesson(lesson.id)}
                    className="shrink-0"
                  >
                    {lesson.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
                    )}
                  </button>

                  <span className="text-sm font-medium text-[hsl(var(--muted-foreground))] w-8">
                    {lesson.order}.
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium', lesson.completed && 'line-through text-[hsl(var(--muted-foreground))]')}>
                      {lesson.title}
                    </p>
                  </div>

                  <Badge className={cn('border-0 shrink-0', typeCfg.className)}>
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {typeCfg.label}
                  </Badge>

                  <span className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-1 shrink-0 w-20 justify-end">
                    <Clock className="h-3.5 w-3.5" /> {lesson.duration}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
