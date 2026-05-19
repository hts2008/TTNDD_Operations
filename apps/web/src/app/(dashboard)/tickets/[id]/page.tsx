'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  Send,
  User,
  XCircle,
} from 'lucide-react';

interface TicketComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  isInternal?: boolean;
}

interface TicketStatusHistory {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  changedBy?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  requesterId: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  isSensitive?: boolean;
  createdAt: string;
  updatedAt: string;
  comments?: TicketComment[];
  statusHistory?: TicketStatusHistory[];
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
  open: { icon: <Circle className="h-4 w-4" />, label: 'Open', cls: 'text-blue-600' },
  assigned: { icon: <User className="h-4 w-4" />, label: 'Assigned', cls: 'text-purple-600' },
  in_progress: {
    icon: <Clock className="h-4 w-4" />,
    label: 'In progress',
    cls: 'text-amber-600',
  },
  resolved: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Resolved',
    cls: 'text-emerald-600',
  },
  closed: { icon: <XCircle className="h-4 w-4" />, label: 'Closed', cls: 'text-gray-500' },
};

const priorityConfig: Record<string, { label: string; cls: string }> = {
  critical: { label: 'Critical', cls: 'bg-red-100 text-red-700' },
  high: { label: 'High', cls: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medium', cls: 'bg-amber-100 text-amber-700' },
  low: { label: 'Low', cls: 'bg-green-100 text-green-700' },
};

const transitionActions: Record<
  string,
  { action: string; label: string; variant?: 'default' | 'outline' }[]
> = {
  assigned: [{ action: 'start', label: 'Start work' }],
  in_progress: [{ action: 'resolve', label: 'Resolve' }],
  resolved: [
    { action: 'close', label: 'Close' },
    { action: 'reopen', label: 'Reopen', variant: 'outline' },
  ],
  closed: [{ action: 'reopen', label: 'Reopen', variant: 'outline' }],
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function shortId(value?: string | null) {
  if (!value) return '-';
  return value.length > 8 ? value.slice(0, 8) : value;
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<TicketDetail>(`/tickets/${id}`);
      setTicket(data);
    } catch (err) {
      setTicket(null);
      setError(err instanceof Error ? err.message : 'Khong tai duoc ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  async function submitComment() {
    const content = newComment.trim();
    if (!content || submittingComment) return;

    setSubmittingComment(true);
    setError(null);
    try {
      await api.post(`/tickets/${id}/comments`, { content });
      setNewComment('');
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong gui duoc binh luan');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function transitionTicket(action: string) {
    if (transitioning) return;

    setTransitioning(action);
    setError(null);
    try {
      await api.post(`/tickets/${id}/transition`, { action });
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong doi duoc trang thai');
    } finally {
      setTransitioning(null);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Dang tai ticket...</div>;
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-4 p-6 text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-500" />
          <div>
            <p className="font-semibold">Khong tai duoc ticket</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => router.push('/tickets')}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Quay lai
            </Button>
            <Button onClick={loadTicket}>Thu lai</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ticket) {
    return <div className="py-12 text-center text-muted-foreground">Khong tim thay ticket</div>;
  }

  const comments = ticket.comments ?? [];
  const history = ticket.statusHistory ?? [];
  const sc = statusConfig[ticket.status] || statusConfig.open;
  const pc = priorityConfig[ticket.priority] || priorityConfig.medium;
  const actions = transitionActions[ticket.status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => router.push('/tickets')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Quay lai
        </Button>
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {ticket.ticketNumber}
          </p>
          <h1 className="text-xl font-bold">{ticket.title}</h1>
        </div>
        <span className={`flex items-center gap-1.5 font-medium ${sc.cls}`}>
          {sc.icon} {sc.label}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mo ta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">
                {ticket.description || 'Ticket nay chua co mo ta chi tiet.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Binh luan ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  Chua co binh luan nao.
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`rounded-lg p-3 text-sm ${
                      comment.isInternal ? 'border border-amber-200 bg-amber-50' : 'bg-muted'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="font-medium">User {shortId(comment.authorId)}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt)}
                        {comment.isInternal && (
                          <span className="ml-1 text-amber-600">(internal)</span>
                        )}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <textarea
                  className="min-h-20 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Them binh luan..."
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                />
                <Button
                  size="sm"
                  className="gap-1 self-start"
                  disabled={!newComment.trim() || submittingComment}
                  onClick={submitComment}
                >
                  <Send className="h-3.5 w-3.5" />
                  {submittingComment ? 'Dang gui' : 'Gui'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thong tin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Uu tien</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pc.cls}`}>
                  {pc.label}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Danh muc</span>
                <span>{ticket.category ?? '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Nguoi tao</span>
                <span>User {shortId(ticket.requesterId)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Nguoi xu ly</span>
                <span>{ticket.assigneeId ? `User ${shortId(ticket.assigneeId)}` : '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Han xu ly</span>
                <span>
                  {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString('vi-VN') : '-'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Ngay tao</span>
                <span>{formatDate(ticket.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Cap nhat</span>
                <span>{formatDate(ticket.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          {actions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hanh dong</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {actions.map((item) => (
                  <Button
                    key={item.action}
                    variant={item.variant ?? 'default'}
                    disabled={Boolean(transitioning)}
                    onClick={() => transitionTicket(item.action)}
                  >
                    {transitioning === item.action ? 'Dang xu ly' : item.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lich su</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chua co lich su trang thai.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 text-xs">
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                      <div>
                        <span className="font-medium">User {shortId(entry.changedBy)}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          {entry.fromStatus ?? '-'} to {entry.toStatus}
                        </span>
                        {entry.notes && <div className="text-muted-foreground">{entry.notes}</div>}
                        <div className="text-muted-foreground">{formatDate(entry.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
