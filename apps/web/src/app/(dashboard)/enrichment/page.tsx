'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookHeart,
  CalendarDays,
  Heart,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SpiritualLog {
  id: string;
  logDate: string;
  logType?: string | null;
  durationMinutes?: number | null;
  notes?: string | null;
  thanhNgonRef?: string | null;
  emotionBefore?: number | null;
  emotionAfter?: number | null;
  expEarned?: number;
}

interface NguGioiAssessment {
  id: string;
  weekStart: string;
  batSatSinh?: number | null;
  batDuDao?: number | null;
  batTaDam?: number | null;
  batTuuNhuc?: number | null;
  batVongNgu?: number | null;
  reflection?: string | null;
}

const preceptFields = [
  { key: 'batSatSinh', label: 'Bat sat sinh', description: 'Ton trong su song' },
  { key: 'batDuDao', label: 'Bat du dao', description: 'Ngay thang va chinh truc' },
  { key: 'batTaDam', label: 'Bat ta dam', description: 'Giu pham hanh va ranh gioi' },
  { key: 'batTuuNhuc', label: 'Bat tuu nhuc', description: 'Giu than tam tinh tao' },
  { key: 'batVongNgu', label: 'Bat vong ngu', description: 'Noi loi chan that' },
] as const;

type PreceptKey = (typeof preceptFields)[number]['key'];
type Scores = Record<PreceptKey, number>;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function weekStartDate() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function numberOrUndefined(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function StarRating({
  rating,
  onChange,
  max = 5,
}: {
  rating: number;
  onChange?: (value: number) => void;
  max?: number;
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, index) => {
        const value = index + 1;
        const icon = (
          <Star
            className={cn(
              'h-5 w-5',
              index < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200',
            )}
          />
        );

        if (!onChange) return <span key={value}>{icon}</span>;

        return (
          <button
            key={value}
            type="button"
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            onClick={() => onChange(value)}
            aria-label={`Set rating ${value}`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

export default function EnrichmentPage() {
  const [logs, setLogs] = useState<SpiritualLog[]>([]);
  const [assessments, setAssessments] = useState<NguGioiAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logDate, setLogDate] = useState(todayDate());
  const [logType, setLogType] = useState('meditation');
  const [durationMinutes, setDurationMinutes] = useState('15');
  const [thanhNgonRef, setThanhNgonRef] = useState('');
  const [emotionBefore, setEmotionBefore] = useState(3);
  const [emotionAfter, setEmotionAfter] = useState(4);
  const [notes, setNotes] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  const [weekStart, setWeekStart] = useState(weekStartDate());
  const [scores, setScores] = useState<Scores>({
    batSatSinh: 5,
    batDuDao: 5,
    batTaDam: 5,
    batTuuNhuc: 5,
    batVongNgu: 5,
  });
  const [reflection, setReflection] = useState('');
  const [savingAssessment, setSavingAssessment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logRows, assessmentRows] = await Promise.all([
        api.get<SpiritualLog[]>('/enrichment/spiritual-logs/my'),
        api.get<NguGioiAssessment[]>('/enrichment/ngu-gioi/my'),
      ]);
      setLogs(logRows);
      setAssessments(assessmentRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc du lieu tam linh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const latestAssessment = assessments[0];
  const averageScore = useMemo(() => {
    if (!latestAssessment) return null;
    const values = preceptFields
      .map((field) => latestAssessment[field.key])
      .filter((value): value is number => typeof value === 'number');
    if (!values.length) return null;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }, [latestAssessment]);

  function updateScore(key: PreceptKey, value: number) {
    setScores((current) => ({ ...current, [key]: value }));
  }

  async function createLog() {
    if (savingLog) return;
    setSavingLog(true);
    setError(null);
    setStatus(null);
    try {
      await api.post('/enrichment/spiritual-logs', {
        logDate,
        logType,
        durationMinutes: numberOrUndefined(durationMinutes),
        thanhNgonRef: thanhNgonRef.trim() || undefined,
        emotionBefore,
        emotionAfter,
        notes: notes.trim() || undefined,
      });
      setNotes('');
      setThanhNgonRef('');
      setShowLogForm(false);
      setStatus('Da luu nhat ky tam linh.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong luu duoc nhat ky');
    } finally {
      setSavingLog(false);
    }
  }

  async function saveAssessment() {
    if (savingAssessment) return;
    setSavingAssessment(true);
    setError(null);
    setStatus(null);
    try {
      await api.post('/enrichment/ngu-gioi', {
        weekStart,
        ...scores,
        reflection: reflection.trim() || undefined,
      });
      setReflection('');
      setStatus('Da luu tu danh gia Ngu Gioi.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong luu duoc tu danh gia');
    } finally {
      setSavingAssessment(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Heart className="h-8 w-8 text-rose-500" />
            Tam linh & Danh gia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nhat ky rieng tu va tu danh gia Ngu Gioi duoc luu truc tiep qua Enrichment API.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Tai lai
          </Button>
          <Button onClick={() => setShowLogForm((value) => !value)}>
            <Plus className="mr-2 h-4 w-4" />
            Them ghi chu
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
        <Lock className="h-4 w-4 shrink-0" />
        <span>Du lieu nay chi lay tu endpoint rieng cua user dang dang nhap.</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {status && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {status}
        </div>
      )}

      {showLogForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookHeart className="h-5 w-5 text-rose-500" />
              Ghi nhat ky moi
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Ngay</span>
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={logDate}
                onChange={(event) => setLogDate(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Loai thuc hanh</span>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={logType}
                onChange={(event) => setLogType(event.target.value)}
              >
                <option value="meditation">Thien tinh</option>
                <option value="prayer">Cau nguyen</option>
                <option value="scripture">Doc kinh</option>
                <option value="service">Phung su</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Thoi luong phut</span>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Thanh ngon / nguon tham chieu</span>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={thanhNgonRef}
                onChange={(event) => setThanhNgonRef(event.target.value)}
                placeholder="VD: Thanh Ngon Hiep Tuyen..."
              />
            </label>
            <div className="space-y-1 text-sm">
              <span className="font-medium">Cam xuc truoc</span>
              <StarRating rating={emotionBefore} onChange={setEmotionBefore} />
            </div>
            <div className="space-y-1 text-sm">
              <span className="font-medium">Cam xuc sau</span>
              <StarRating rating={emotionAfter} onChange={setEmotionAfter} />
            </div>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium">Ghi chu</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ghi lai noi dung thuc hanh va dieu hoc duoc..."
              />
            </label>
            <div className="md:col-span-2">
              <Button onClick={createLog} disabled={savingLog || !logDate}>
                {savingLog ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Luu nhat ky
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BookHeart className="h-5 w-5 text-rose-500" />
              Nhat ky tam linh
            </CardTitle>
            <Badge variant="secondary">{logs.length} ban ghi</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Dang tai nhat ky...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Chua co spiritual log. Tao ban ghi dau tien de bat dau tracking.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-[hsl(var(--muted)_/_0.3)]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="secondary">{entry.logType || 'spiritual_log'}</Badge>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(entry.logDate)}
                        </span>
                        {entry.durationMinutes ? (
                          <span className="text-sm text-muted-foreground">
                            {entry.durationMinutes} phut
                          </span>
                        ) : null}
                        {entry.expEarned ? (
                          <Badge variant="outline">+{entry.expEarned} EXP</Badge>
                        ) : null}
                      </div>
                      {entry.thanhNgonRef ? (
                        <p className="text-xs text-muted-foreground">Nguon: {entry.thanhNgonRef}</p>
                      ) : null}
                      <p className="text-sm">{entry.notes || 'Khong co ghi chu.'}</p>
                    </div>
                    <div className="shrink-0 space-y-2 md:w-44">
                      <div className="text-xs text-muted-foreground">Truoc</div>
                      <StarRating rating={entry.emotionBefore ?? 0} />
                      <div className="text-xs text-muted-foreground">Sau</div>
                      <StarRating rating={entry.emotionAfter ?? 0} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            Ngu Gioi tu danh gia
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ban ghi gan nhat:{' '}
            {latestAssessment
              ? `${formatDate(latestAssessment.weekStart)} - diem TB ${averageScore ?? '-'}`
              : 'chua co'}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="block max-w-xs space-y-1 text-sm">
            <span className="font-medium">Tuan bat dau</span>
            <input
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={weekStart}
              onChange={(event) => setWeekStart(event.target.value)}
            />
          </label>

          <div className="space-y-4">
            {preceptFields.map((field) => (
              <div
                key={field.key}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{field.label}</p>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                  {latestAssessment?.[field.key] ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Gan nhat: {latestAssessment[field.key]}/5
                    </p>
                  ) : null}
                </div>
                <StarRating
                  rating={scores[field.key]}
                  onChange={(value) => updateScore(field.key, value)}
                />
              </div>
            ))}
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Reflection</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2"
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              placeholder="Ghi lai dieu can tiep tuc, dieu can sua va cam ket tuan toi..."
            />
          </label>

          <div className="flex justify-end">
            <Button onClick={saveAssessment} disabled={savingAssessment || !weekStart}>
              {savingAssessment ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Luu danh gia
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
