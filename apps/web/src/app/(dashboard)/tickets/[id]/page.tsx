'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Clock,
  User,
  MessageSquare,
  Paperclip,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Circle,
} from 'lucide-react';

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assignee?: string;
  reporter: string;
  createdAt: string;
  updatedAt: string;
  comments: {
    id: string;
    author: string;
    content: string;
    createdAt: string;
    isInternal?: boolean;
  }[];
  history: {
    id: string;
    action: string;
    actor: string;
    timestamp: string;
    from?: string;
    to?: string;
  }[];
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
  open: { icon: <Circle className="h-4 w-4" />, label: 'Mở', cls: 'text-blue-600' },
  assigned: { icon: <User className="h-4 w-4" />, label: 'Đã giao', cls: 'text-purple-600' },
  in_progress: { icon: <Clock className="h-4 w-4" />, label: 'Đang xử lý', cls: 'text-amber-600' },
  resolved: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Đã giải quyết',
    cls: 'text-emerald-600',
  },
  closed: { icon: <XCircle className="h-4 w-4" />, label: 'Đã đóng', cls: 'text-gray-500' },
};

const priorityConfig: Record<string, { label: string; cls: string }> = {
  critical: { label: 'Khẩn cấp', cls: 'bg-red-100 text-red-700' },
  high: { label: 'Cao', cls: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Trung bình', cls: 'bg-amber-100 text-amber-700' },
  low: { label: 'Thấp', cls: 'bg-green-100 text-green-700' },
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadTicket();
  }, [id]);

  async function loadTicket() {
    try {
      const data = await api.get<TicketDetail>(`/tickets/${id}`);
      setTicket(data);
    } catch {
      setTicket({
        id,
        title: `Ticket #${id}`,
        description: 'Mô tả chi tiết của ticket',
        status: 'open',
        priority: 'medium',
        category: 'general',
        reporter: 'Nguyễn Văn A',
        assignee: 'Trần Thị B',
        createdAt: '2026-03-18T10:00:00',
        updatedAt: '2026-03-18T14:30:00',
        comments: [
          {
            id: 'c1',
            author: 'Nguyễn Văn A',
            content: 'Tôi gặp vấn đề này khi sinh hoạt tuần trước.',
            createdAt: '2026-03-18T10:05:00',
          },
          {
            id: 'c2',
            author: 'Trần Thị B',
            content: 'Đã nhận ticket, sẽ xử lý trong ngày.',
            createdAt: '2026-03-18T11:00:00',
            isInternal: true,
          },
        ],
        history: [
          { id: 'h1', action: 'created', actor: 'Nguyễn Văn A', timestamp: '2026-03-18T10:00:00' },
          {
            id: 'h2',
            action: 'status_changed',
            actor: 'Hệ thống',
            timestamp: '2026-03-18T10:01:00',
            from: 'open',
            to: 'assigned',
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Đang tải...</div>;
  if (!ticket)
    return <div className="text-center py-12 text-muted-foreground">Không tìm thấy ticket</div>;

  const sc = statusConfig[ticket.status] || statusConfig.open;
  const pc = priorityConfig[ticket.priority] || priorityConfig.medium;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/tickets')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Quay lại
        </Button>
        <h1 className="text-xl font-bold flex-1">{ticket.title}</h1>
        <span className={`flex items-center gap-1.5 font-medium ${sc.cls}`}>
          {sc.icon} {sc.label}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mô tả</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{ticket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Bình luận ({ticket.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg p-3 text-sm ${c.isInternal ? 'bg-amber-50 border border-amber-200' : 'bg-muted'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{c.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString('vi-VN')}
                      {c.isInternal && <span className="ml-1 text-amber-600">(Nội bộ)</span>}
                    </span>
                  </div>
                  <p>{c.content}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Thêm bình luận..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button size="sm" className="gap-1">
                  <Send className="h-3.5 w-3.5" />
                  Gửi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mức ưu tiên</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pc.cls}`}>
                  {pc.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Người báo cáo</span>
                <span>{ticket.reporter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Người xử lý</span>
                <span>{ticket.assignee ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày tạo</span>
                <span>{new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cập nhật</span>
                <span>{new Date(ticket.updatedAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch sử</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ticket.history.map((h) => (
                  <div key={h.id} className="flex items-start gap-2 text-xs">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                    <div>
                      <span className="font-medium">{h.actor}</span>
                      <span className="text-muted-foreground"> — {h.action}</span>
                      {h.from && (
                        <span className="text-muted-foreground">
                          {' '}
                          ({h.from} → {h.to})
                        </span>
                      )}
                      <div className="text-muted-foreground">
                        {new Date(h.timestamp).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
