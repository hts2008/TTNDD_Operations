'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Clock,
  User,
  MessageSquare,
  FileText,
  AlertTriangle,
  Shield,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import Link from 'next/link';

/* ── Types ── */
interface TicketDetail {
  id: string;
  ticketNumber: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  assigneeId: string | null;
  requesterId: string;
  dueDate: string | null;
  resolvedAt: string | null;
  tags: string[];
  isSensitive: boolean;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  comments: CommentItem[];
  statusHistory: StatusHistoryItem[];
}

interface CommentItem {
  id: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  attachments: unknown;
  createdAt: string;
}

interface StatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  notes: string | null;
  createdAt: string;
}

interface AttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string;
  createdAt: string;
}

interface AuditTrailResponse {
  ticketId: string;
  timeline: { type: string; timestamp: string; data: Record<string, unknown> }[];
}

/* ── Config ── */
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'success' | 'warning' | 'outline';
    color: string;
  }
> = {
  open: { label: 'Mới mở', variant: 'default', color: 'bg-blue-500' },
  assigned: { label: 'Đã giao', variant: 'outline', color: 'bg-indigo-500' },
  in_progress: { label: 'Đang xử lý', variant: 'warning', color: 'bg-amber-500' },
  resolved: { label: 'Đã giải quyết', variant: 'success', color: 'bg-green-500' },
  closed: { label: 'Đã đóng', variant: 'secondary', color: 'bg-gray-500' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'Cao', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Trung bình', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Thấp', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

/**
 * SM-5 transitions — what actions are available from current status
 */
const TRANSITIONS: Record<
  string,
  {
    action: string;
    label: string;
    variant: 'default' | 'secondary' | 'success' | 'outline' | 'warning';
  }[]
> = {
  open: [
    { action: 'assign', label: 'Giao việc', variant: 'default' },
    { action: 'close', label: 'Đóng', variant: 'secondary' },
  ],
  assigned: [
    { action: 'start', label: 'Bắt đầu xử lý', variant: 'default' },
    { action: 'reassign', label: 'Giao lại', variant: 'outline' },
    { action: 'close', label: 'Đóng', variant: 'secondary' },
  ],
  in_progress: [
    { action: 'resolve', label: 'Giải quyết', variant: 'success' },
    { action: 'reassign', label: 'Giao lại', variant: 'outline' },
  ],
  resolved: [
    { action: 'close', label: 'Đóng hoàn tất', variant: 'success' },
    { action: 'reopen', label: 'Mở lại', variant: 'warning' },
  ],
  closed: [{ action: 'reopen', label: 'Mở lại', variant: 'warning' }],
};

/* ── Demo data ── */
const DEMO_TICKET: TicketDetail = {
  id: '1',
  ticketNumber: 'TK-00001',
  title: 'Không thể đăng nhập hệ thống',
  description:
    'Đoàn sinh báo lỗi 403 khi cố đăng nhập vào trang quản lý. Đã thử reset lại mật khẩu nhưng vẫn không được.',
  category: 'Tài khoản',
  priority: 'critical',
  status: 'in_progress',
  assigneeId: 'admin-1',
  requesterId: 'user-1',
  dueDate: '2026-03-15T00:00:00Z',
  resolvedAt: null,
  tags: ['login', 'urgent'],
  isSensitive: false,
  isAnonymous: false,
  createdAt: '2026-03-04T00:00:00Z',
  updatedAt: '2026-03-10T00:00:00Z',
  comments: [
    {
      id: 'c1',
      authorId: 'user-1',
      content: 'Tôi nhận lỗi 403 khi truy cập /dashboard',
      isInternal: false,
      attachments: [],
      createdAt: '2026-03-04T10:00:00Z',
    },
    {
      id: 'c2',
      authorId: 'admin-1',
      content: 'Đang kiểm tra RLS policies. Có thể do org_id chưa đúng.',
      isInternal: true,
      attachments: [],
      createdAt: '2026-03-05T09:00:00Z',
    },
    {
      id: 'c3',
      authorId: 'admin-1',
      content: 'Đã fix RLS, bạn thử đăng nhập lại nhé.',
      isInternal: false,
      attachments: [],
      createdAt: '2026-03-06T14:00:00Z',
    },
  ],
  statusHistory: [
    {
      id: 'h1',
      fromStatus: null,
      toStatus: 'open',
      changedBy: 'user-1',
      notes: null,
      createdAt: '2026-03-04T00:00:00Z',
    },
    {
      id: 'h2',
      fromStatus: 'open',
      toStatus: 'assigned',
      changedBy: 'system',
      notes: 'Auto-routed by rule "Tài khoản → Admin"',
      createdAt: '2026-03-04T00:01:00Z',
    },
    {
      id: 'h3',
      fromStatus: 'assigned',
      toStatus: 'in_progress',
      changedBy: 'admin-1',
      notes: null,
      createdAt: '2026-03-05T09:00:00Z',
    },
  ],
};

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'attachments' | 'history'>('comments');

  const loadTicket = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<TicketDetail>(`/api/tickets/${ticketId}`);
      setTicket(res);
    } catch {
      setTicket(DEMO_TICKET);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const loadAttachments = useCallback(async () => {
    try {
      const res = await api.get<AttachmentItem[]>(`/api/tickets/${ticketId}/attachments`);
      setAttachments(res);
    } catch {
      setAttachments([]);
    }
  }, [ticketId]);

  const loadAuditTrail = useCallback(async () => {
    try {
      const res = await api.get<AuditTrailResponse>(`/api/tickets/${ticketId}/audit-trail`);
      setAuditTrail(res);
    } catch {
      setAuditTrail(null);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
    loadAttachments();
    loadAuditTrail();
  }, [loadTicket, loadAttachments, loadAuditTrail]);

  const handleTransition = async (action: string) => {
    try {
      await api.post(`/api/tickets/${ticketId}/transition`, { action });
      loadTicket();
    } catch {
      /* noop */
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await api.post(`/api/tickets/${ticketId}/comments`, { content: newComment, isInternal });
      setNewComment('');
      loadTicket();
    } catch {
      /* noop */
    }
    setPosting(false);
  };

  if (loading)
    return <div className="p-6 text-center text-[hsl(var(--muted-foreground))]">Đang tải...</div>;
  if (!ticket) return <div className="p-6 text-center">Không tìm thấy yêu cầu</div>;

  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const actions = TRANSITIONS[ticket.status] || [];

  const tabs = [
    {
      id: 'comments' as const,
      label: `Bình luận (${ticket.comments.length})`,
      icon: MessageSquare,
    },
    { id: 'attachments' as const, label: `Tệp đính kèm (${attachments.length})`, icon: Paperclip },
    { id: 'history' as const, label: 'Lịch sử', icon: History },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Back & Header */}
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-orange-600">
              {ticket.ticketNumber}
            </span>
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            <Badge className={cn('border', priorityCfg.className)}>{priorityCfg.label}</Badge>
            {ticket.isSensitive && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                <Shield className="h-3 w-3 mr-1" /> Nhạy cảm
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold mt-1">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {ticket.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mô tả</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-[hsl(var(--border))]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
                )}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-3">
              {ticket.comments.map((c) => (
                <Card key={c.id} className={cn(c.isInternal && 'border-amber-200 bg-amber-50/50')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm font-medium">{c.authorId}</span>
                      {c.isInternal && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">Nội bộ</Badge>
                      )}
                      <span className="text-xs text-[hsl(var(--muted-foreground))] ml-auto">
                        {new Date(c.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                  </CardContent>
                </Card>
              ))}

              {/* Add comment */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded"
                      />
                      Ghi chú nội bộ
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Viết bình luận..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || posting}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === 'attachments' && (
            <div className="space-y-2">
              {attachments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-[hsl(var(--muted-foreground))]">
                    <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Chưa có tệp đính kèm
                  </CardContent>
                </Card>
              ) : (
                attachments.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium">{a.fileName}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">
                            {a.fileSize ? `${(a.fileSize / 1024).toFixed(1)} KB` : ''} ·{' '}
                            {new Date(a.createdAt).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      </div>
                      <a href={a.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          Tải xuống
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <Card>
              <CardContent className="p-4">
                {auditTrail?.timeline.length ? (
                  <div className="space-y-3">
                    {auditTrail.timeline.map((entry, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full mt-1.5',
                            entry.type === 'status_change'
                              ? 'bg-blue-500'
                              : entry.type === 'comment'
                                ? 'bg-green-500'
                                : 'bg-purple-500',
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {entry.type === 'status_change' &&
                              `${(entry.data.fromStatus as string) || '—'} → ${entry.data.toStatus as string}`}
                            {entry.type === 'comment' &&
                              `Bình luận bởi ${String(entry.data.authorId)}`}
                            {entry.type === 'attachment' && `Tệp: ${String(entry.data.fileName)}`}
                          </div>
                          {typeof entry.data.notes === 'string' ? (
                            <div className="text-[hsl(var(--muted-foreground))]">
                              {entry.data.notes}
                            </div>
                          ) : null}
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">
                            {new Date(entry.timestamp).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ticket.statusHistory.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                        <div className="flex-1">
                          <div className="font-medium">
                            {h.fromStatus || '—'} → {h.toStatus}
                          </div>
                          {h.notes && (
                            <div className="text-[hsl(var(--muted-foreground))]">{h.notes}</div>
                          )}
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">
                            {new Date(h.createdAt).toLocaleString('vi-VN')} · {h.changedBy}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hành động</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {actions.map((a) => (
                <Button
                  key={a.action}
                  variant={
                    a.variant === 'success'
                      ? 'default'
                      : a.variant === 'warning'
                        ? 'outline'
                        : a.variant
                  }
                  className={cn(
                    'w-full justify-start',
                    a.variant === 'success' && 'bg-green-600 hover:bg-green-700 text-white',
                    a.variant === 'warning' && 'border-amber-300 text-amber-700 hover:bg-amber-50',
                  )}
                  onClick={() => handleTransition(a.action)}
                >
                  {a.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Người yêu cầu</span>
                <span className="font-medium">{ticket.requesterId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Người xử lý</span>
                <span className="font-medium">{ticket.assigneeId || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Danh mục</span>
                <span>{ticket.category || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Ngày tạo</span>
                <span>{new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              {ticket.dueDate && (
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">Hạn xử lý</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(ticket.dueDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">Ngày giải quyết</span>
                  <span>{new Date(ticket.resolvedAt).toLocaleDateString('vi-VN')}</span>
                </div>
              )}
              {ticket.tags.length > 0 && (
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] block mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {ticket.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SLA Warning */}
          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
            <Card className="border-amber-200">
              <CardContent className="p-3 flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <span>SLA đang được theo dõi</span>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
