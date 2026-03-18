'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  BookOpen,
  Play,
  FileText,
  HelpCircle,
  Clock,
  CheckCircle2,
  Circle,
  Zap,
  Loader2,
  AlertCircle,
  Download,
  Wifi,
  WifiOff,
  Swords,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

type LessonType = 'video' | 'text' | 'quiz';

interface Lesson {
  id: string;
  orderIndex: number;
  title: string;
  lessonType: LessonType | null;
  duration: number | null;
  isRequired: boolean;
}

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  expReward: number;
  difficulty: string | null;
  category: string | null;
  status: string;
  lessons: Lesson[];
  modules: Array<{
    id: string;
    title: string;
    lessons: Lesson[];
  }>;
  quizzes: Array<{ id: string; title: string; _count: { questions: number } }>;
  competencies: Array<{ competency: { name: string; competencyCode: string } }>;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Play; className: string }> = {
  video: { label: 'Video', icon: Play, className: 'bg-red-100 text-red-700' },
  text: { label: 'Bài đọc', icon: FileText, className: 'bg-blue-100 text-blue-700' },
  quiz: { label: 'Kiểm tra', icon: HelpCircle, className: 'bg-purple-100 text-purple-700' },
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return '--';
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 > 0 ? `${minutes % 60}p` : ''}`
    : `${minutes} phút`;
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params?.courseId as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packSize, setPackSize] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [battleCode, setBattleCode] = useState('');

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    api
      .get<CourseDetail>(`/lms/courses/${courseId}`)
      .then((data) => setCourse(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Fetch pack size estimate
    api
      .get<{ estimatedSizeKB: number; courseId: string }>(`/lms/courses/${courseId}/pack-size`)
      .then((data) => {
        const kb = data.estimatedSizeKB;
        setPackSize(kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
      })
      .catch(() => setPackSize(null));
  }, [courseId]);

  const handleCompleteLesson = useCallback(async (lessonId: string) => {
    try {
      await api.post(`/lms/lessons/${lessonId}/complete`, {
        memberId: 'current', // Will be resolved server-side from auth context
      });
      setCompletedLessons((prev) => new Set(prev).add(lessonId));
    } catch {
      // Silently handle for now — could add toast
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-[hsl(var(--muted-foreground))]">
        <Loader2 className="h-6 w-6 animate-spin" />
        Đang tải khóa học...
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-red-500">
        <AlertCircle className="h-6 w-6" />
        {error ?? 'Không tìm thấy khóa học'}
      </div>
    );
  }

  // Combine lessons from flat list and modules
  const allLessons =
    course.lessons.length > 0 ? course.lessons : course.modules.flatMap((m) => m.lessons);

  const totalLessons = allLessons.length;
  const completedCount = completedLessons.size;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const nextLesson = allLessons.find((l) => !completedLessons.has(l.id));

  return (
    <div className="space-y-6 p-6">
      <Button variant="ghost" size="sm" className="gap-1" onClick={() => window.history.back()}>
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </Button>

      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl text-green-900">{course.title}</CardTitle>
              <p className="text-sm text-green-700">{course.description ?? 'Chưa có mô tả'}</p>
            </div>
            <Badge variant="success" className="shrink-0 text-sm px-3 py-1">
              <Zap className="h-3.5 w-3.5 mr-1" /> +{course.expReward} EXP
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
                {completedCount}/{totalLessons} bài đã hoàn thành
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

      {/* Competencies */}
      {course.competencies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
            Năng lực đạt được:
          </span>
          {course.competencies.map((c) => (
            <Badge key={c.competency.competencyCode} variant="outline">
              {c.competency.name}
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Danh sách bài học
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {allLessons.map((lesson) => {
              const typeCfg = TYPE_CONFIG[lesson.lessonType ?? 'text'] ?? TYPE_CONFIG.text;
              const TypeIcon = typeCfg.icon;
              const isCompleted = completedLessons.has(lesson.id);

              return (
                <li
                  key={lesson.id}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                    isCompleted
                      ? 'bg-green-50/50 border-green-200'
                      : 'hover:bg-[hsl(var(--muted)/0.5)]',
                  )}
                >
                  <button
                    onClick={() => handleCompleteLesson(lesson.id)}
                    className="shrink-0"
                    disabled={isCompleted}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
                    )}
                  </button>

                  <span className="text-sm font-medium text-[hsl(var(--muted-foreground))] w-8">
                    {lesson.orderIndex + 1}.
                  </span>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'font-medium',
                        isCompleted && 'line-through text-[hsl(var(--muted-foreground))]',
                      )}
                    >
                      {lesson.title}
                    </p>
                  </div>

                  <Badge className={cn('border-0 shrink-0', typeCfg.className)}>
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {typeCfg.label}
                  </Badge>

                  <span className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-1 shrink-0 w-20 justify-end">
                    <Clock className="h-3.5 w-3.5" /> {formatDuration(lesson.duration)}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Offline Pack & Battle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Offline Pack Download */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <WifiOff className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="font-semibold text-blue-900">Gói Học Offline</h3>
                <p className="text-xs text-blue-600">Tải nội dung để học khi không có mạng</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600 flex items-center gap-1">
                <Wifi className="h-3.5 w-3.5" />
                Kích thước: {packSize ?? 'Đang ước tính...'}
              </span>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 gap-1"
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true);
                  try {
                    const pack = await api.get<unknown>(`/lms/courses/${courseId}/offline-pack`);
                    const blob = new Blob([JSON.stringify(pack, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `course-${courseId}-offline.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    // Could add error toast
                  } finally {
                    setDownloading(false);
                  }
                }}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? 'Đang tải...' : 'Tải xuống'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Battle Arena Join */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <Swords className="h-8 w-8 text-purple-500" />
              <div>
                <h3 className="font-semibold text-purple-900">Đấu Trường Quiz</h3>
                <p className="text-xs text-purple-600">Thi đấu trắc nghiệm real-time với bạn bè</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nhập mã trận đấu..."
                value={battleCode}
                onChange={(e) => setBattleCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-1.5 rounded-lg border text-sm font-mono uppercase tracking-wider"
                maxLength={8}
              />
              <Link href={battleCode ? `/lms/battle/${battleCode}` : '#'}>
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 gap-1"
                  disabled={!battleCode}
                >
                  <Swords className="h-4 w-4" /> Vào phòng
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quizzes */}
      {course.quizzes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Bài kiểm tra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {course.quizzes.map((quiz) => (
                <li
                  key={quiz.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-[hsl(var(--muted)/0.5)]"
                >
                  <HelpCircle className="h-5 w-5 text-purple-500" />
                  <div className="flex-1">
                    <p className="font-medium">{quiz.title}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {quiz._count.questions} câu hỏi
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Làm bài
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
