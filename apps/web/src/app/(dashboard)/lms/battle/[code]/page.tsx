'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Swords,
  Users,
  Play,
  Timer,
  Trophy,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Zap,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface BattlePlayer {
  memberId: string;
  displayName: string;
  score: number;
  answers: Array<{ questionId: string; correct: boolean; points: number }>;
}

interface BattleData {
  id: string;
  battleCode: string;
  status: 'lobby' | 'countdown' | 'active' | 'finished';
  quizTitle: string;
  players: BattlePlayer[];
  currentQuestion?: {
    id: string;
    questionText: string;
    options: Array<{ key: string; label: string }>;
    timeLimit: number;
  };
  countdown?: number;
  totalQuestions: number;
}

type AnswerResult = { correct: boolean; points: number; message: string };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Swords }> = {
  lobby: { label: 'Phòng chờ', color: 'bg-blue-100 text-blue-700', icon: Users },
  countdown: { label: 'Đếm ngược...', color: 'bg-yellow-100 text-yellow-700', icon: Timer },
  active: { label: 'Đang thi đấu', color: 'bg-red-100 text-red-700', icon: Swords },
  finished: { label: 'Kết thúc', color: 'bg-green-100 text-green-700', icon: Trophy },
};

export default function BattleArenaPage() {
  const params = useParams();
  const battleCode = params?.code as string;

  const [battle, setBattle] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch battle state
  const fetchBattle = useCallback(async () => {
    if (!battleCode) return;
    try {
      const data = await api.get<BattleData>(`/lms/battles/${battleCode}`);
      setBattle(data);
      if (data.countdown) setCountdown(data.countdown);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi kết nối';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [battleCode]);

  // Poll every 2 seconds in active states
  useEffect(() => {
    fetchBattle();
    pollRef.current = setInterval(fetchBattle, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchBattle]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => (c !== null && c > 0 ? c - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleStartBattle = async () => {
    try {
      await api.post(`/lms/battles/${battleCode}/start`);
      setCountdown(3);
      await fetchBattle();
    } catch {
      // Silently handle
    }
  };

  const handleSubmitAnswer = async (answerKey: string) => {
    if (submitting || !battle?.currentQuestion) return;
    setSelectedAnswer(answerKey);
    setSubmitting(true);
    try {
      const result = await api.post<AnswerResult>(`/lms/battles/${battleCode}/answer`, {
        questionId: battle.currentQuestion.id,
        answer: answerKey,
      });
      setAnswerResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi gửi câu trả lời';
      setAnswerResult({ correct: false, points: 0, message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishBattle = async () => {
    try {
      await api.post(`/lms/battles/${battleCode}/finish`);
      await fetchBattle();
    } catch {
      // Silently handle
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-[hsl(var(--muted-foreground))]">
        <Loader2 className="h-6 w-6 animate-spin" />
        Đang kết nối đấu trường...
      </div>
    );
  }

  if (error || !battle) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-red-500">
        <AlertCircle className="h-6 w-6" />
        {error ?? 'Không tìm thấy trận đấu'}
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[battle.status] ?? STATUS_CONFIG.lobby;
  const StatusIcon = statusCfg.icon;
  const sortedPlayers = [...battle.players].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" className="gap-1" onClick={() => window.history.back()}>
        <ArrowLeft className="h-4 w-4" /> Quay lại LMS
      </Button>

      {/* Battle Header */}
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl text-purple-900 flex items-center gap-2">
                <Swords className="h-7 w-7" /> Đấu Trường Quiz
              </CardTitle>
              <p className="text-sm text-purple-700">
                Mã: <span className="font-mono font-bold">{battle.battleCode}</span> •{' '}
                {battle.quizTitle}
              </p>
            </div>
            <Badge className={cn('shrink-0 text-sm px-3 py-1', statusCfg.color)}>
              <StatusIcon className="h-4 w-4 mr-1" />
              {statusCfg.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-purple-600">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> {battle.players.length} người chơi
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-4 w-4" /> Anti-cheat bật
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Countdown Overlay */}
      {battle.status === 'countdown' && countdown !== null && countdown > 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center animate-pulse">
            <p className="text-8xl font-black text-purple-600">{countdown}</p>
            <p className="text-lg text-purple-500 mt-2">Chuẩn bị sẵn sàng!</p>
          </div>
        </div>
      )}

      {/* Lobby: Show players + Start button */}
      {battle.status === 'lobby' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Người chơi trong phòng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {battle.players.map((p, i) => (
                <li
                  key={p.memberId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted)/0.3)]"
                >
                  <span className="text-lg font-bold text-purple-600">#{i + 1}</span>
                  <span className="font-medium">{p.displayName}</span>
                </li>
              ))}
            </ul>
            {battle.players.length >= 2 && (
              <Button
                onClick={handleStartBattle}
                className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
              >
                <Play className="h-4 w-4" /> Bắt đầu trận đấu
              </Button>
            )}
            {battle.players.length < 2 && (
              <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
                Cần ít nhất 2 người chơi để bắt đầu
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active: Show current question */}
      {battle.status === 'active' && battle.currentQuestion && (
        <Card className="border-2 border-purple-300">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-lg text-purple-900">
              {battle.currentQuestion.questionText}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {battle.currentQuestion.options.map((opt) => {
              const isSelected = selectedAnswer === opt.key;
              const isCorrect = answerResult?.correct && isSelected;
              const isWrong = answerResult && !answerResult.correct && isSelected;

              return (
                <button
                  key={opt.key}
                  onClick={() => handleSubmitAnswer(opt.key)}
                  disabled={!!selectedAnswer || submitting}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border-2 transition-all',
                    'hover:border-purple-400 hover:bg-purple-50',
                    isCorrect && 'border-green-500 bg-green-50',
                    isWrong && 'border-red-500 bg-red-50',
                    isSelected && !answerResult && 'border-purple-500 bg-purple-50',
                    !isSelected && answerResult && 'opacity-50',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="font-bold text-purple-600 w-8">{opt.key}.</span>
                    <span className="flex-1">{opt.label}</span>
                    {isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {isWrong && <XCircle className="h-5 w-5 text-red-500" />}
                    {submitting && isSelected && <Loader2 className="h-5 w-5 animate-spin" />}
                  </span>
                </button>
              );
            })}

            {answerResult && (
              <div
                className={cn(
                  'mt-4 p-3 rounded-lg text-sm font-medium',
                  answerResult.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                )}
              >
                {answerResult.correct ? '✅ Chính xác!' : '❌ Sai rồi!'} •{' '}
                <span className="font-bold">+{answerResult.points} điểm</span>
                {answerResult.message && ` — ${answerResult.message}`}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scoreboard — always visible except lobby with < 2 players */}
      {(battle.status !== 'lobby' || battle.players.length >= 2) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> Bảng xếp hạng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {sortedPlayers.map((p, rank) => (
                <li
                  key={p.memberId}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg',
                    rank === 0 &&
                      battle.status === 'finished' &&
                      'bg-yellow-50 border border-yellow-200',
                    rank !== 0 && 'bg-[hsl(var(--muted)/0.3)]',
                  )}
                >
                  <span
                    className={cn(
                      'text-xl font-black w-10 text-center',
                      rank === 0
                        ? 'text-yellow-500'
                        : rank === 1
                          ? 'text-gray-400'
                          : rank === 2
                            ? 'text-amber-600'
                            : 'text-[hsl(var(--muted-foreground))]',
                    )}
                  >
                    {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                  </span>
                  <span className="flex-1 font-medium">{p.displayName}</span>
                  <span className="flex items-center gap-1 font-bold text-purple-600">
                    <Zap className="h-4 w-4" /> {p.score}
                  </span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {p.answers.length} câu trả lời
                  </span>
                </li>
              ))}
            </ul>

            {battle.status === 'active' && (
              <Button
                onClick={handleFinishBattle}
                variant="destructive"
                className="w-full mt-4 gap-2"
              >
                <Trophy className="h-4 w-4" /> Kết thúc trận đấu
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Finished: Victory summary */}
      {battle.status === 'finished' && sortedPlayers.length > 0 && (
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="pt-6 text-center space-y-2">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-bold text-yellow-800">
              🎉 {sortedPlayers[0]?.displayName} chiến thắng!
            </h2>
            <p className="text-sm text-yellow-600">
              Tổng điểm: {sortedPlayers[0]?.score} • {sortedPlayers[0]?.answers.length} câu trả lời
            </p>
            <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
              Quay về LMS
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
