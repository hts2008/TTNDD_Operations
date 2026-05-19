'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  Play,
  Swords,
  UserPlus,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type LessonType = 'video' | 'text' | 'quiz' | string;

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

interface CourseProgress {
  id: string;
  courseId: string;
  orgMemberId: string;
  status: string;
  progressPct?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  course?: { title: string; category?: string | null; expReward?: number };
}

interface MemberOption {
  id: string;
  scoutName?: string | null;
  memberCode?: string | null;
  role?: string | null;
  status?: string | null;
  user?: { displayName?: string | null; email?: string | null };
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Play; className: string }> = {
  video: { label: 'Video', icon: Play, className: 'bg-red-100 text-red-700' },
  text: { label: 'Reading', icon: FileText, className: 'bg-blue-100 text-blue-700' },
  quiz: { label: 'Quiz', icon: HelpCircle, className: 'bg-purple-100 text-purple-700' },
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return '--';
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 > 0 ? `${minutes % 60}m` : ''}`
    : `${minutes} min`;
}

function memberLabel(member: MemberOption) {
  return member.scoutName || member.user?.displayName || member.memberCode || member.id.slice(0, 8);
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params?.courseId as string;
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const memberId = user?.memberId;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [progressRecords, setProgressRecords] = useState<CourseProgress[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [packSize, setPackSize] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [battleCode, setBattleCode] = useState('');
  const [completingLessonId, setCompletingLessonId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [mentorId, setMentorId] = useState('');
  const [menteeId, setMenteeId] = useState('');
  const [assigningMentor, setAssigningMentor] = useState(false);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrate, hydrated]);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const [courseData, sizeData, memberData] = await Promise.all([
        api.get<CourseDetail>(`/lms/courses/${courseId}`),
        api
          .get<{ estimatedSizeKB: number; courseId: string }>(`/lms/courses/${courseId}/pack-size`)
          .catch(() => null),
        api.get<MemberOption[]>('/hrm/members', { status: 'active', limit: 100 }).catch(() => []),
      ]);
      setCourse(courseData);
      setMembers(memberData);
      if (sizeData) {
        const kb = sizeData.estimatedSizeKB;
        setPackSize(kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
      }
      setMentorId(
        (current) => current || memberData.find((member) => member.id !== memberId)?.id || '',
      );
      setMenteeId((current) => current || memberId || memberData[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc khoa hoc');
    } finally {
      setLoading(false);
    }
  }, [courseId, memberId, mentorId]);

  const loadProgress = useCallback(async () => {
    if (!memberId) {
      setProgressRecords([]);
      return;
    }
    try {
      const data = await api.get<CourseProgress[]>(`/lms/progress/${memberId}`);
      setProgressRecords(data);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Khong tai duoc tien trinh hoc');
    }
  }, [memberId]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const courseProgress = useMemo(
    () => progressRecords.find((record) => record.courseId === courseId) ?? null,
    [courseId, progressRecords],
  );

  const allLessons = useMemo(() => {
    if (!course) return [];
    return course.lessons.length > 0
      ? course.lessons
      : course.modules.flatMap((module) => module.lessons);
  }, [course]);

  const totalLessons = allLessons.length;
  const backendProgress = courseProgress?.progressPct ?? 0;
  const sessionProgress =
    totalLessons > 0 ? Math.round((completedLessons.size / totalLessons) * 100) : 0;
  const progress = Math.max(backendProgress, sessionProgress);
  const nextLesson = allLessons.find((lesson) => !completedLessons.has(lesson.id));

  async function startCourse() {
    if (!memberId || enrolling) {
      setActionError('Tai khoan hien tai chua co memberId de enroll khoa hoc.');
      return;
    }
    setEnrolling(true);
    setActionError(null);
    setActionStatus(null);
    try {
      await api.post(`/lms/courses/${courseId}/enroll`, { memberId });
      setActionStatus('Da enroll khoa hoc.');
      await loadProgress();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Khong enroll duoc khoa hoc');
    } finally {
      setEnrolling(false);
    }
  }

  async function completeLesson(lessonId: string) {
    if (!memberId || completingLessonId) {
      setActionError('Tai khoan hien tai chua co memberId de ghi nhan bai hoc.');
      return;
    }

    setCompletingLessonId(lessonId);
    setActionError(null);
    setActionStatus(null);
    try {
      await api.post(`/lms/lessons/${lessonId}/complete`, { memberId });
      setCompletedLessons((prev) => new Set(prev).add(lessonId));
      setActionStatus('Da ghi nhan bai hoc hoan thanh.');
      await loadProgress();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Khong hoan thanh duoc bai hoc');
    } finally {
      setCompletingLessonId(null);
    }
  }

  async function assignMentor() {
    if (!mentorId || !menteeId || assigningMentor) return;
    setAssigningMentor(true);
    setActionError(null);
    setActionStatus(null);
    try {
      await api.post(`/lms/courses/${courseId}/mentors`, { mentorId, menteeId });
      setActionStatus('Da gan mentor cho khoa hoc.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Khong gan mentor duoc');
    } finally {
      setAssigningMentor(false);
    }
  }

  async function downloadOfflinePack() {
    if (downloading) return;
    setDownloading(true);
    setActionError(null);
    try {
      const pack = await api.get<unknown>(`/lms/courses/${courseId}/offline-pack`);
      downloadJson(`course-${courseId}-offline.json`, pack);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Khong tai duoc offline pack');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Dang tai khoa hoc...
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-red-500">
        <AlertCircle className="h-6 w-6" />
        {error ?? 'Khong tim thay khoa hoc'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/lms">
        <Button variant="ghost" size="sm" className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Quay lai
        </Button>
      </Link>

      {(actionStatus || actionError) && (
        <div
          className={cn(
            'rounded-md border px-4 py-3 text-sm',
            actionError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
          )}
        >
          {actionError ?? actionStatus}
        </div>
      )}

      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {course.category && <Badge variant="outline">{course.category}</Badge>}
                {course.difficulty && <Badge variant="outline">{course.difficulty}</Badge>}
                <Badge variant="outline">{course.status}</Badge>
                {courseProgress && (
                  <Badge className="bg-emerald-600">{courseProgress.status}</Badge>
                )}
              </div>
              <CardTitle className="text-2xl text-green-900">{course.title}</CardTitle>
              <p className="text-sm text-green-700">{course.description ?? 'Chua co mo ta'}</p>
            </div>
            <Badge className="shrink-0 bg-green-600 px-3 py-1 text-sm text-white">
              <Zap className="mr-1 h-3.5 w-3.5" />+{course.expReward} EXP
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-medium text-green-600">Tien trinh</p>
              <p className="text-2xl font-bold text-green-800">{progress}%</p>
            </div>
            <div className="flex-1">
              <div className="h-3 w-full overflow-hidden rounded-full bg-green-200">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-green-600">
                {completedLessons.size}/{totalLessons} lessons completed in this session. Backend
                progress {backendProgress}%.
              </p>
            </div>
            <Button
              className="shrink-0 bg-green-600 hover:bg-green-700"
              disabled={enrolling || !memberId}
              onClick={startCourse}
            >
              {enrolling ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1 h-4 w-4" />
              )}
              {courseProgress ? 'Restart progress' : 'Enroll'}
            </Button>
            {nextLesson && (
              <Button
                variant="outline"
                className="shrink-0"
                disabled={!memberId}
                onClick={() => completeLesson(nextLesson.id)}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Complete next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {course.competencies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-muted-foreground">Competencies:</span>
          {course.competencies.map((item) => (
            <Badge key={item.competency.competencyCode} variant="outline">
              {item.competency.name}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lessons
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allLessons.length === 0 ? (
              <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                Course nay chua co lesson.
              </p>
            ) : (
              <ul className="space-y-2">
                {allLessons.map((lesson) => {
                  const typeCfg = TYPE_CONFIG[lesson.lessonType ?? 'text'] ?? TYPE_CONFIG.text;
                  const TypeIcon = typeCfg.icon;
                  const isCompleted = completedLessons.has(lesson.id);

                  return (
                    <li
                      key={lesson.id}
                      className={cn(
                        'flex items-center gap-4 rounded-lg border p-4 transition-colors',
                        isCompleted ? 'border-green-200 bg-green-50/50' : 'hover:bg-muted/50',
                      )}
                    >
                      <button
                        onClick={() => completeLesson(lesson.id)}
                        className="shrink-0"
                        disabled={isCompleted || completingLessonId === lesson.id || !memberId}
                        aria-label={`Complete ${lesson.title}`}
                      >
                        {completingLessonId === lesson.id ? (
                          <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </button>
                      <span className="w-8 text-sm font-medium text-muted-foreground">
                        {lesson.orderIndex + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'font-medium',
                            isCompleted && 'text-muted-foreground line-through',
                          )}
                        >
                          {lesson.title}
                        </p>
                        {lesson.isRequired && (
                          <p className="text-xs text-muted-foreground">Required lesson</p>
                        )}
                      </div>
                      <Badge className={cn('shrink-0 border-0', typeCfg.className)}>
                        <TypeIcon className="mr-1 h-3 w-3" />
                        {typeCfg.label}
                      </Badge>
                      <span className="flex w-20 shrink-0 items-center justify-end gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(lesson.duration)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50">
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center gap-3">
                <WifiOff className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold text-blue-900">Offline pack</h3>
                  <p className="text-xs text-blue-600">Download course JSON from backend.</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1 text-sm text-blue-600">
                  <Wifi className="h-3.5 w-3.5" />
                  Size: {packSize ?? 'unknown'}
                </span>
                <Button
                  size="sm"
                  className="gap-1 bg-blue-600 hover:bg-blue-700"
                  disabled={downloading}
                  onClick={downloadOfflinePack}
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloading ? 'Downloading' : 'Download'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center gap-3">
                <Swords className="h-8 w-8 text-purple-500" />
                <div>
                  <h3 className="font-semibold text-purple-900">Battle quiz</h3>
                  <p className="text-xs text-purple-600">
                    Join realtime battle with an existing code.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Battle code"
                  value={battleCode}
                  onChange={(event) => setBattleCode(event.target.value.toUpperCase())}
                  className="flex-1 rounded-lg border px-3 py-1.5 font-mono text-sm uppercase tracking-wider"
                  maxLength={8}
                />
                <Link href={battleCode ? `/lms/battle/${battleCode}` : '#'}>
                  <Button
                    size="sm"
                    className="gap-1 bg-purple-600 hover:bg-purple-700"
                    disabled={!battleCode}
                  >
                    <Swords className="h-4 w-4" />
                    Join
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="h-5 w-5" />
                Assign mentor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={mentorId}
                onChange={(event) => setMentorId(event.target.value)}
              >
                <option value="">Select mentor</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {memberLabel(member)}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={menteeId}
                onChange={(event) => setMenteeId(event.target.value)}
              >
                <option value="">Select mentee</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {memberLabel(member)}
                  </option>
                ))}
              </select>
              <Button
                className="w-full"
                disabled={!mentorId || !menteeId || mentorId === menteeId || assigningMentor}
                onClick={assignMentor}
              >
                {assigningMentor ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-1 h-4 w-4" />
                )}
                Assign mentor
              </Button>
              {mentorId && menteeId && mentorId === menteeId && (
                <p className="text-xs text-red-600">
                  Mentor va mentee phai la hai member khac nhau.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {course.quizzes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Quizzes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {course.quizzes.map((quiz) => (
                <li
                  key={quiz.id}
                  className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50"
                >
                  <HelpCircle className="h-5 w-5 text-purple-500" />
                  <div className="flex-1">
                    <p className="font-medium">{quiz.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {quiz._count.questions} questions
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Start
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
