'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Clock, User, MessageSquare, Send, Paperclip,
  CheckCircle, AlertTriangle, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ── T-0148: Ticket Detail & Timeline ──

type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; className: string }> = {
  critical: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'Cao', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Trung bình', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Thấp', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  open: { label: 'Mới mở', color: 'text-blue-600', icon: Clock },
  assigned: { label: 'Đã phân công', color: 'text-indigo-600', icon: User },
  in_progress: { label: 'Đang xử lý', color: 'text-amber-600', icon: AlertTriangle },
  resolved: { label: 'Đã giải quyết', color: 'text-green-600', icon: CheckCircle },
  closed: { label: 'Đã đóng', color: 'text-gray-500', icon: CheckCircle },
};

// Mock data — will be replaced with API calls
const MOCK_TICKET = {
  id: '1',
  ticketNumber: 'TK-00001',
  title: 'Không thể đăng nhập hệ thống',
  description: 'Đoàn sinh không thể đăng nhập bằng tài khoản đã được cung cấp. Lỗi hiển thị "Invalid credentials" dù đã nhập đúng mật khẩu.',
  category: 'Tài khoản',
  priority: 'critical' as TicketPriority,
  status: 'in_progress' as TicketStatus,
  requesterId: 'user-1',
  requesterName: 'Nguyễn Văn An',
  assigneeId: 'user-2',
  assigneeName: 'Trần Thị Bình',
  createdAt: '2026-03-04T10:30:00Z',
  dueDate: '2026-03-06',
  tags: ['đăng nhập', 'tài khoản'],
};

const MOCK_TIMELINE = [
  { id: '1', type: 'status' as const, fromStatus: null, toStatus: 'open', changedBy: 'Nguyễn Văn An', createdAt: '2026-03-04T10:30:00Z', notes: null },
  { id: '2', type: 'status' as const, fromStatus: 'open', toStatus: 'assigned', changedBy: 'Hệ thống', createdAt: '2026-03-04T10:31:00Z', notes: 'Auto-routed by rule "Route login issues"' },
  { id: '3', type: 'comment' as const, author: 'Trần Thị Bình', content: 'Đã tiếp nhận. Đang kiểm tra log hệ thống.', isInternal: false, createdAt: '2026-03-04T11:00:00Z' },
  { id: '4', type: 'status' as const, fromStatus: 'assigned', toStatus: 'in_progress', changedBy: 'Trần Thị Bình', createdAt: '2026-03-04T11:01:00Z', notes: null },
  { id: '5', type: 'comment' as const, author: 'Trần Thị Bình', content: 'Phát hiện tài khoản bị lock sau 5 lần nhập sai. Đang unlock.', isInternal: true, createdAt: '2026-03-04T14:00:00Z' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function TimelineItem({ item }: { item: typeof MOCK_TIMELINE[0] }) {
  if (item.type === 'status') {
    const statusCfg = STATUS_CONFIG[item.toStatus as TicketStatus];
    const StatusIcon = statusCfg?.icon ?? Clock;
    return (
      <div className="flex gap-3 pb-4">
        <div className="flex flex-col items-center">
          <div className={cn('rounded-full p-1.5 border', statusCfg?.color ?? 'text-gray-500')}>
            <StatusIcon className="h-3.5 w-3.5" />
          </div>
          <div className="w-px h-full bg-[hsl(var(--border))]" />
        </div>
        <div className="flex-1 pb-2">
          <p className="text-sm">
            <span className="font-medium">{item.changedBy}</span>
            {' '}chuyển trạng thái sang{' '}
            <span className={cn('font-semibold', statusCfg?.color)}>{statusCfg?.label ?? item.toStatus}</span>
          </p>
          {item.notes && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 italic">{item.notes}</p>
          )}
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{formatDate(item.createdAt)}</p>
        </div>
      </div>
    );
  }

  // Comment
  return (
    <div className="flex gap-3 pb-4">
      <div className="flex flex-col items-center">
        <div className="rounded-full p-1.5 border text-[hsl(var(--muted-foreground))]">
          <MessageSquare className="h-3.5 w-3.5" />
        </div>
        <div className="w-px h-full bg-[hsl(var(--border))]" />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{item.author}</span>
          {item.isInternal && (
            <Badge variant="outline" className="text-xs py-0">Nội bộ</Badge>
          )}
        </div>
        <p className="text-sm mt-1 bg-[hsl(var(--muted))] rounded-lg p-3">{item.content}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{formatDate(item.createdAt)}</p>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  const ticket = MOCK_TICKET;
  const timeline = MOCK_TIMELINE;
  const [comment, setComment] = useState('');
  const statusCfg = STATUS_CONFIG[ticket.status];
  const priorityCfg = PRIORITY_CONFIG[ticket.priority];

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
          </Button>
        </Link>
        <span className="font-mono text-sm text-[hsl(var(--muted-foreground))]">{ticket.ticketNumber}</span>
        <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Badge className={cn('border', priorityCfg.className)}>{priorityCfg.label}</Badge>
        <Badge variant="outline" className={statusCfg.color}>{statusCfg.label}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{ticket.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{ticket.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {ticket.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" /> Dòng thời gian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {timeline.map((item) => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>

              {/* Comment Input */}
              <div className="mt-4 border-t pt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Thêm bình luận..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" variant="ghost">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button size="sm" disabled={!comment.trim()}>
                    <Send className="h-4 w-4 mr-1" /> Gửi
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Chi tiết</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Trạng thái</span>
                <Badge variant="outline" className={statusCfg.color}>{statusCfg.label}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Ưu tiên</span>
                <Badge className={cn('border', priorityCfg.className)}>{priorityCfg.label}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Danh mục</span>
                <span className="font-medium">{ticket.category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Ngày tạo</span>
                <span>{formatDate(ticket.createdAt)}</span>
              </div>
              {ticket.dueDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">Hạn xử lý</span>
                  <span>{new Date(ticket.dueDate).toLocaleDateString('vi-VN')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Người liên quan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Người tạo</span>
                <span className="font-medium">{ticket.requesterName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Phụ trách</span>
                <span className="font-medium">{ticket.assigneeName}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Button className="w-full" variant="default" size="sm">
                <CheckCircle className="h-4 w-4 mr-1" /> Giải quyết
              </Button>
              <Button className="w-full" variant="outline" size="sm">
                <User className="h-4 w-4 mr-1" /> Phân công lại
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
