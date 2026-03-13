'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  Heart,
  BookHeart,
  ShieldCheck,
  CalendarDays,
  Lock,
  Star,
  Users,
  MessageCircle,
  Plus,
  Loader2,
  ClipboardList,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface SpiritualLog {
  id: string;
  logDate: string;
  logType?: string;
  durationMinutes?: number;
  notes?: string;
  thanhNgonRef?: string;
  emotionBefore?: number;
  emotionAfter?: number;
  createdAt?: string;
}

interface NguGioiAssessment {
  id: string;
  weekStart: string;
  batSatSinh?: number;
  batDuDao?: number;
  batTaDam?: number;
  batTuuNhuc?: number;
  batVongNgu?: number;
  reflection?: string;
  updatedAt?: string;
}

interface Evaluation {
  id: string;
  orgMemberId: string;
  evaluatorId: string;
  evaluationType?: string;
  evaluationDate: string;
  scoreDaoDuc?: number;
  scoreKyNang?: number;
  scoreTheChat?: number;
  scoreLanhDao?: number;
  scorePhungSu?: number;
  strengths?: string;
  areasToImprove?: string;
  recommendations?: string;
  member?: { user?: { displayName?: string }; scoutName?: string };
}

interface MentoringRelationship {
  id: string;
  mentorId: string;
  menteeId: string;
  startDate?: string;
  status?: string;
  mentor?: { user?: { displayName?: string }; scoutName?: string };
  mentee?: { user?: { displayName?: string }; scoutName?: string };
}

interface MentoringLog {
  id: string;
  sessionDate: string;
  topic?: string;
  outcome?: string;
  followUp?: string;
}

type TabKey = 'journal' | 'ngu-gioi' | 'evaluations' | 'mentoring';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'journal', label: 'Nhật ký', icon: <BookHeart className="h-4 w-4" /> },
  { key: 'ngu-gioi', label: 'Ngũ Giới', icon: <ShieldCheck className="h-4 w-4" /> },
  { key: 'evaluations', label: 'Đánh giá', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'mentoring', label: 'Cố vấn', icon: <Users className="h-4 w-4" /> },
];

const EMOTION_MAP: Record<number, string> = {
  1: '😢 Rất buồn',
  2: '😟 Lo lắng',
  3: '😐 Bình thường',
  4: '😊 Vui vẻ',
  5: '✨ Hứng khởi',
};

const GIOI_LABELS = [
  { key: 'batSatSinh', name: 'Nhất giới: Không sát sanh', desc: 'Tôn trọng sự sống' },
  { key: 'batDuDao', name: 'Nhị giới: Không trộm cắp', desc: 'Ngay thẳng, chính trực' },
  { key: 'batTaDam', name: 'Tam giới: Không tà dâm', desc: 'Giữ gìn phẩm hạnh' },
  { key: 'batTuuNhuc', name: 'Tứ giới: Không rượu thịt', desc: 'Giữ tâm trí trong sáng' },
  { key: 'batVongNgu', name: 'Ngũ giới: Không vọng ngữ', desc: 'Nói lời chân thật' },
];

// ═══════════════════════════════════════════════════════════
// Star Rating Component
// ═══════════════════════════════════════════════════════════

function StarRating({
  rating,
  max = 5,
  interactive = false,
  onChange,
}: {
  rating: number;
  max?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-5 w-5 transition-colors',
            i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300',
            interactive && 'cursor-pointer hover:text-yellow-300',
          )}
          onClick={() => interactive && onChange?.(i + 1)}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Spiritual Journal Tab
// ═══════════════════════════════════════════════════════════

function JournalTab({
  showToast,
}: {
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [logs, setLogs] = useState<SpiritualLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    logDate: new Date().toISOString().slice(0, 10),
    logType: 'Thiền định',
    durationMinutes: 15,
    notes: '',
    thanhNgonRef: '',
    emotionBefore: 3,
    emotionAfter: 4,
  });

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<SpiritualLog[]>('/enrichment/spiritual-logs/my');
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleCreate = async () => {
    try {
      setSaving(true);
      await api.post('/enrichment/spiritual-logs', form);
      showToast('✅ Đã ghi nhật ký tâm linh', 'success');
      setShowForm(false);
      setForm({ ...form, notes: '', thanhNgonRef: '' });
      await loadLogs();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="text-[hsl(var(--muted-foreground))] text-center py-12">
        Đang tải nhật ký...
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookHeart className="h-5 w-5 text-rose-500" />
            Nhật ký tâm linh
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{logs.length} ghi chú</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            '✕ Đóng'
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Thêm ghi chú
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                  Ngày *
                </label>
                <Input
                  type="date"
                  value={form.logDate}
                  onChange={(e) => setForm({ ...form, logDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                  Loại
                </label>
                <select
                  value={form.logType}
                  onChange={(e) => setForm({ ...form, logType: e.target.value })}
                  className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm focus:border-[hsl(var(--primary))] outline-none"
                >
                  <option value="Thiền định">🧘 Thiền định</option>
                  <option value="Cầu nguyện">🙏 Cầu nguyện</option>
                  <option value="Đọc kinh">📖 Đọc kinh</option>
                  <option value="Phụng sự">❤️ Phụng sự</option>
                  <option value="Khác">📝 Khác</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                  Cảm xúc trước
                </label>
                <StarRating
                  rating={form.emotionBefore}
                  interactive
                  onChange={(v) => setForm({ ...form, emotionBefore: v })}
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  {EMOTION_MAP[form.emotionBefore]}
                </p>
              </div>
              <div>
                <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                  Cảm xúc sau
                </label>
                <StarRating
                  rating={form.emotionAfter}
                  interactive
                  onChange={(v) => setForm({ ...form, emotionAfter: v })}
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  {EMOTION_MAP[form.emotionAfter]}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                Thánh Ngôn tham khảo
              </label>
              <Input
                value={form.thanhNgonRef}
                onChange={(e) => setForm({ ...form, thanhNgonRef: e.target.value })}
                placeholder="VD: Thánh Ngôn Hiệp Tuyển, Quyển 1"
              />
            </div>
            <div>
              <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                Ghi chú
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Chia sẻ trải nghiệm tâm linh..."
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm min-h-[80px] focus:border-[hsl(var(--primary))] outline-none resize-none"
              />
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                '✅ Lưu ghi chú'
              )}
            </Button>
          </div>
        </Card>
      )}

      {logs.length === 0 ? (
        <Card className="p-8 text-center text-[hsl(var(--muted-foreground))]">
          <BookHeart className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có ghi chú tâm linh nào</p>
          <p className="text-sm mt-1">
            Bắt đầu hành trình tâm linh bằng cách thêm ghi chú đầu tiên
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)_/_0.3)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{entry.logType || 'Khác'}</Badge>
                    <span className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(entry.logDate).toLocaleDateString('vi-VN')}
                    </span>
                    {entry.durationMinutes && (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {entry.durationMinutes} phút
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{entry.notes || '—'}</p>
                  {entry.thanhNgonRef && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] italic">
                      📖 {entry.thanhNgonRef}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right space-y-1">
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Trước</div>
                  <div className="text-sm">{EMOTION_MAP[entry.emotionBefore ?? 3] || '—'}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Sau</div>
                  <div className="text-sm">{EMOTION_MAP[entry.emotionAfter ?? 3] || '—'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Ngũ Giới Tab
// ═══════════════════════════════════════════════════════════

function NguGioiTab({
  showToast,
}: {
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [assessments, setAssessments] = useState<NguGioiAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    weekStart: getMonday(),
    batSatSinh: 5,
    batDuDao: 5,
    batTaDam: 5,
    batTuuNhuc: 5,
    batVongNgu: 5,
    reflection: '',
  });

  function getMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().slice(0, 10);
  }

  const loadAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<NguGioiAssessment[]>('/enrichment/ngu-gioi/my');
      setAssessments(Array.isArray(data) ? data : []);
    } catch {
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/enrichment/ngu-gioi', form);
      showToast('✅ Đã lưu đánh giá Ngũ Giới', 'success');
      await loadAssessments();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="text-[hsl(var(--muted-foreground))] text-center py-12">Đang tải...</div>;

  return (
    <div className="space-y-6">
      {/* Current Week Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            Ngũ Giới tự đánh giá
          </CardTitle>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Tuần bắt đầu: {new Date(form.weekStart).toLocaleDateString('vi-VN')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {GIOI_LABELS.map((gioi) => (
              <div
                key={gioi.key}
                className="flex items-center justify-between p-4 rounded-lg border border-[hsl(var(--border))]"
              >
                <div>
                  <p className="font-medium text-sm">{gioi.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{gioi.desc}</p>
                </div>
                <StarRating
                  rating={(form as unknown as Record<string, number>)[gioi.key] ?? 5}
                  interactive
                  onChange={(v) => setForm({ ...form, [gioi.key]: v })}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">
                Suy ngẫm tuần này
              </label>
              <textarea
                value={form.reflection}
                onChange={(e) => setForm({ ...form, reflection: e.target.value })}
                placeholder="Chia sẻ suy ngẫm về việc thực hành Ngũ Giới..."
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm min-h-[80px] focus:border-[hsl(var(--primary))] outline-none resize-none"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                '💾 Lưu đánh giá'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {assessments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              📊 Lịch sử đánh giá ({assessments.length} tuần)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assessments.map((a) => {
                const avg =
                  ((a.batSatSinh ?? 0) +
                    (a.batDuDao ?? 0) +
                    (a.batTaDam ?? 0) +
                    (a.batTuuNhuc ?? 0) +
                    (a.batVongNgu ?? 0)) /
                  5;
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--border))]"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Tuần {new Date(a.weekStart).toLocaleDateString('vi-VN')}
                      </p>
                      {a.reflection && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate max-w-[300px]">
                          {a.reflection}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={Math.round(avg)} />
                      <span className="text-sm font-bold text-amber-500">{avg.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Evaluations Tab (Leader View)
// ═══════════════════════════════════════════════════════════

function EvaluationsTab({
  showToast,
}: {
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [memberId, setMemberId] = useState('');
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    orgMemberId: '',
    branchId: '',
    evaluationDate: new Date().toISOString().slice(0, 10),
    scoreDaoDuc: 3,
    scoreKyNang: 3,
    scoreTheChat: 3,
    scoreLanhDao: 3,
    scorePhungSu: 3,
    strengths: '',
    areasToImprove: '',
    recommendations: '',
  });

  const loadEvals = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const data = await api.get<Evaluation[]>(`/enrichment/evaluations/${memberId}`);
      setEvals(Array.isArray(data) ? data : []);
    } catch {
      setEvals([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  const handleCreate = async () => {
    if (!form.orgMemberId || !form.branchId) return;
    try {
      setSaving(true);
      await api.post('/enrichment/evaluations', form);
      showToast('✅ Đã tạo đánh giá', 'success');
      setShowForm(false);
      setMemberId(form.orgMemberId);
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadEvals();
  }, [loadEvals]);

  const SCORE_LABELS = [
    { key: 'scoreDaoDuc', label: 'Đạo Đức' },
    { key: 'scoreKyNang', label: 'Kỹ Năng' },
    { key: 'scoreTheChat', label: 'Thể Chất' },
    { key: 'scoreLanhDao', label: 'Lãnh Đạo' },
    { key: 'scorePhungSu', label: 'Phụng Sự' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-violet-500" />
          Đánh giá 5 chiều
        </h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            '✕ Đóng'
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Tạo đánh giá
            </>
          )}
        </Button>
      </div>

      {/* Search by member */}
      <div className="flex gap-2">
        <Input
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          placeholder="Nhập Member ID để xem đánh giá..."
        />
        <Button variant="outline" onClick={loadEvals} disabled={!memberId || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔍'}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                  Member ID *
                </label>
                <Input
                  value={form.orgMemberId}
                  onChange={(e) => setForm({ ...form, orgMemberId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                  Branch ID *
                </label>
                <Input
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                />
              </div>
            </div>
            {SCORE_LABELS.map((s) => (
              <div key={s.key} className="flex items-center justify-between">
                <span className="text-sm">{s.label}</span>
                <StarRating
                  rating={(form as unknown as Record<string, number>)[s.key] ?? 3}
                  interactive
                  onChange={(v) => setForm({ ...form, [s.key]: v })}
                />
              </div>
            ))}
            <Input
              value={form.strengths}
              onChange={(e) => setForm({ ...form, strengths: e.target.value })}
              placeholder="Điểm mạnh..."
            />
            <Input
              value={form.areasToImprove}
              onChange={(e) => setForm({ ...form, areasToImprove: e.target.value })}
              placeholder="Cần cải thiện..."
            />
            <Button
              onClick={handleCreate}
              disabled={saving || !form.orgMemberId || !form.branchId}
              className="w-full"
            >
              {saving ? '⏳...' : '✅ Tạo đánh giá'}
            </Button>
          </div>
        </Card>
      )}

      {/* Results */}
      {evals.length > 0 && (
        <div className="space-y-3">
          {evals.map((ev) => {
            const scores = [
              ev.scoreDaoDuc,
              ev.scoreKyNang,
              ev.scoreTheChat,
              ev.scoreLanhDao,
              ev.scorePhungSu,
            ].filter((s): s is number => s != null);
            const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            return (
              <Card key={ev.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">{ev.evaluationType || 'Định kỳ'}</Badge>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {new Date(ev.evaluationDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {SCORE_LABELS.map((s) => (
                    <div key={s.key}>
                      <p className="text-[hsl(var(--muted-foreground))]">{s.label}</p>
                      <p className="text-lg font-bold">
                        {(ev as unknown as Record<string, number>)[s.key] ?? '—'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right">
                  <span className="text-sm font-bold text-amber-500">TB: {avg.toFixed(1)}/5</span>
                </div>
                {ev.strengths && <p className="text-xs mt-2 text-emerald-600">💪 {ev.strengths}</p>}
                {ev.areasToImprove && (
                  <p className="text-xs text-amber-600">📈 {ev.areasToImprove}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {memberId && !loading && evals.length === 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-8">
          Chưa có đánh giá nào cho thành viên này
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Mentoring Tab
// ═══════════════════════════════════════════════════════════

function MentoringTab({
  showToast,
}: {
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [mentees, setMentees] = useState<MentoringRelationship[]>([]);
  const [mentors, setMentors] = useState<MentoringRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRel, setSelectedRel] = useState<string | null>(null);
  const [logs, setLogs] = useState<MentoringLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logForm, setLogForm] = useState({
    sessionDate: new Date().toISOString().slice(0, 10),
    topic: '',
    outcome: '',
    followUp: '',
  });
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [menteeData, mentorData] = await Promise.all([
          api.get<MentoringRelationship[]>('/enrichment/mentoring/as-mentor'),
          api.get<MentoringRelationship[]>('/enrichment/mentoring/as-mentee'),
        ]);
        setMentees(Array.isArray(menteeData) ? menteeData : []);
        setMentors(Array.isArray(mentorData) ? mentorData : []);
      } catch {
        setMentees([]);
        setMentors([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadLogs = useCallback(async (relId: string) => {
    try {
      setLogsLoading(true);
      setSelectedRel(relId);
      const data = await api.get<MentoringLog[]>(`/enrichment/mentoring/${relId}/logs`);
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const handleCreateLog = async () => {
    if (!selectedRel || !logForm.topic) return;
    try {
      setSavingLog(true);
      await api.post(`/enrichment/mentoring/${selectedRel}/logs`, logForm);
      showToast('✅ Đã ghi nhận buổi cố vấn', 'success');
      setLogForm({ ...logForm, topic: '', outcome: '', followUp: '' });
      await loadLogs(selectedRel);
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi'}`, 'error');
    } finally {
      setSavingLog(false);
    }
  };

  if (loading)
    return <div className="text-[hsl(var(--muted-foreground))] text-center py-12">Đang tải...</div>;

  const getName = (rel: MentoringRelationship, role: 'mentor' | 'mentee') => {
    const person = rel[role];
    return person?.user?.displayName || person?.scoutName || rel[`${role}Id`] || '—';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Users className="h-5 w-5 text-cyan-500" />
        Cố vấn & Hướng dẫn
      </h2>

      {/* As Mentor */}
      {mentees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🎯 Tôi là Cố vấn ({mentees.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mentees.map((r) => (
              <button
                key={r.id}
                onClick={() => loadLogs(r.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                  selectedRel === r.id
                    ? 'border-cyan-500 bg-cyan-50/10'
                    : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)_/_0.3)]',
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-500 font-bold text-sm">
                  {getName(r, 'mentee')[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{getName(r, 'mentee')}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Từ: {r.startDate ? new Date(r.startDate).toLocaleDateString('vi-VN') : '—'}
                  </p>
                </div>
                <MessageCircle className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* As Mentee */}
      {mentors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🙏 Cố vấn của tôi ({mentors.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mentors.map((r) => (
              <button
                key={r.id}
                onClick={() => loadLogs(r.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                  selectedRel === r.id
                    ? 'border-violet-500 bg-violet-50/10'
                    : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)_/_0.3)]',
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-violet-500 font-bold text-sm">
                  {getName(r, 'mentor')[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{getName(r, 'mentor')}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Từ: {r.startDate ? new Date(r.startDate).toLocaleDateString('vi-VN') : '—'}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {mentees.length === 0 && mentors.length === 0 && (
        <Card className="p-8 text-center text-[hsl(var(--muted-foreground))]">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có mối quan hệ cố vấn nào</p>
          <p className="text-sm mt-1">Liên hệ quản trị viên để được phân công</p>
        </Card>
      )}

      {/* Session Logs */}
      {selectedRel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📋 Nhật ký buổi cố vấn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Log Form */}
            <div className="p-3 rounded-lg border border-dashed border-[hsl(var(--border))] space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={logForm.sessionDate}
                  onChange={(e) => setLogForm({ ...logForm, sessionDate: e.target.value })}
                />
                <Input
                  value={logForm.topic}
                  onChange={(e) => setLogForm({ ...logForm, topic: e.target.value })}
                  placeholder="Chủ đề *"
                />
              </div>
              <Input
                value={logForm.outcome}
                onChange={(e) => setLogForm({ ...logForm, outcome: e.target.value })}
                placeholder="Kết quả"
              />
              <Input
                value={logForm.followUp}
                onChange={(e) => setLogForm({ ...logForm, followUp: e.target.value })}
                placeholder="Theo dõi tiếp"
              />
              <Button
                size="sm"
                onClick={handleCreateLog}
                disabled={savingLog || !logForm.topic}
                className="w-full"
              >
                {savingLog ? '⏳...' : '➕ Ghi nhận buổi cố vấn'}
              </Button>
            </div>

            {logsLoading && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                Đang tải...
              </p>
            )}
            {!logsLoading && logs.length === 0 && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                Chưa có nhật ký nào
              </p>
            )}
            {logs.map((log) => (
              <div key={log.id} className="p-3 rounded-lg border border-[hsl(var(--border))]">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {new Date(log.sessionDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {log.topic && <p className="text-sm font-medium">{log.topic}</p>}
                {log.outcome && <p className="text-xs text-emerald-600 mt-1">✅ {log.outcome}</p>}
                {log.followUp && <p className="text-xs text-blue-600">📌 {log.followUp}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Enrichment Page
// ═══════════════════════════════════════════════════════════

export default function EnrichmentPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('journal');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Heart className="h-7 w-7 text-rose-500" />
          Tâm linh & Đánh giá
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Enrichment 8D — Nhật ký tâm linh, Ngũ Giới, Đánh giá 5 chiều, Cố vấn
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
        <Lock className="h-4 w-4 shrink-0" />
        <span>Dữ liệu nhật ký và Ngũ Giới chỉ bạn mới xem được. Được bảo mật tuyệt đối.</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[hsl(var(--muted)_/_0.3)] border border-[hsl(var(--border))] rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)_/_0.5)]',
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'journal' && <JournalTab showToast={showToast} />}
      {activeTab === 'ngu-gioi' && <NguGioiTab showToast={showToast} />}
      {activeTab === 'evaluations' && <EvaluationsTab showToast={showToast} />}
      {activeTab === 'mentoring' && <MentoringTab showToast={showToast} />}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 border border-emerald-700 text-emerald-200'
              : 'bg-red-900/90 border border-red-700 text-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
