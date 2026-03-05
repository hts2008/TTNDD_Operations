'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Bell,
  CheckCheck,
  UserPlus,
  Calendar,
  Award,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'member' | 'session' | 'badge' | 'alert' | 'message';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const ICON_MAP: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  member: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-100' },
  session: { icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  badge: { icon: Award, color: 'text-amber-600', bg: 'bg-amber-100' },
  alert: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  message: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-100' },
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'member',
    title: 'Đoàn sinh mới đăng ký',
    body: 'Lê Quốc Vinh (Ngành Đồng) đã gửi đơn đăng ký. Vui lòng duyệt hồ sơ.',
    time: '10 phút trước',
    read: false,
  },
  {
    id: '2',
    type: 'session',
    title: 'Buổi sinh hoạt sắp diễn ra',
    body: '"Kỹ năng cắm trại nâng cao" sẽ diễn ra ngày 08/03/2025. Đã có 38/45 đoàn sinh xác nhận.',
    time: '1 giờ trước',
    read: false,
  },
  {
    id: '3',
    type: 'badge',
    title: 'Huy hiệu mới được cấp',
    body: 'Trần Thị Bình đã hoàn thành yêu cầu và được cấp huy hiệu "Sao Đạo Đức".',
    time: '3 giờ trước',
    read: false,
  },
  {
    id: '4',
    type: 'alert',
    title: 'Cảnh báo quỹ hoạt động',
    body: 'Quỹ hoạt động Ngành Thiếu còn dưới 500.000đ. Cần bổ sung trước kỳ sinh hoạt tới.',
    time: '5 giờ trước',
    read: true,
  },
  {
    id: '5',
    type: 'message',
    title: 'Tin nhắn từ Trưởng Ngành Thanh',
    body: 'Anh Minh nhắn: "Xin duyệt kế hoạch trại hè 2025 cho Ngành Thanh. Đã gửi file đính kèm."',
    time: '1 ngày trước',
    read: true,
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function toggleRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Bell className="h-6 w-6 text-[hsl(var(--primary))]" />
            Thông báo
            {unreadCount > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Các thông báo và cập nhật mới nhất</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" className="gap-2 self-start" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => {
          const iconConfig = ICON_MAP[notification.type] || ICON_MAP.message;
          const Icon = iconConfig.icon;

          return (
            <Card
              key={notification.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                !notification.read && 'border-l-4 border-l-[hsl(var(--primary))] bg-[hsl(var(--primary)_/_0.02)]',
              )}
              onClick={() => toggleRead(notification.id)}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconConfig.bg)}>
                  <Icon className={cn('h-5 w-5', iconConfig.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={cn('text-sm', !notification.read ? 'font-semibold text-[hsl(var(--foreground))]' : 'font-medium text-[hsl(var(--foreground))]')}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{notification.time}</span>
                      {!notification.read && <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">
                    {notification.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
