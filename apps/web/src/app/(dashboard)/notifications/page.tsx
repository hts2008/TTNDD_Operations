'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  CheckCheck,
  Loader2,
  MessageSquare,
  RefreshCw,
  Settings,
  UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationPreference {
  id: string;
  channel: string;
  eventType: string;
  enabled: boolean;
}

const ICON_MAP: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  member: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-100' },
  session: { icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  badge: { icon: Award, color: 'text-amber-600', bg: 'bg-amber-100' },
  alert: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  message: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ticket: { icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-100' },
  system: { icon: Bell, color: 'text-gray-700', bg: 'bg-gray-100' },
};

function iconFor(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('member')) return ICON_MAP.member;
  if (normalized.includes('session') || normalized.includes('event')) return ICON_MAP.session;
  if (normalized.includes('badge') || normalized.includes('reward')) return ICON_MAP.badge;
  if (
    normalized.includes('alert') ||
    normalized.includes('incident') ||
    normalized.includes('safety')
  )
    return ICON_MAP.alert;
  if (normalized.includes('ticket') || normalized.includes('approval')) return ICON_MAP.ticket;
  return ICON_MAP.message;
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [updatingPreferenceId, setUpdatingPreferenceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [notificationData, countData, preferenceData] = await Promise.all([
        api.get<NotificationItem[]>('/notifications', { limit: 50, unreadOnly }),
        api.get<{ count: number }>('/notifications/unread-count'),
        api.get<NotificationPreference[]>('/notifications/preferences').catch(() => []),
      ]);
      setNotifications(notificationData);
      setUnreadCount(countData.count);
      setPreferences(preferenceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc thong bao');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const groupedPreferences = useMemo(() => {
    const byEvent = new Map<string, NotificationPreference[]>();
    preferences.forEach((preference) => {
      const list = byEvent.get(preference.eventType) ?? [];
      list.push(preference);
      byEvent.set(preference.eventType, list);
    });
    return Array.from(byEvent.entries()).slice(0, 8);
  }, [preferences]);

  async function markRead(notification: NotificationItem) {
    if (notification.isRead || markingId) return;
    setMarkingId(notification.id);
    setError(null);
    try {
      await api.patch(`/notifications/${notification.id}/read`, {});
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong danh dau da doc duoc');
    } finally {
      setMarkingId(null);
    }
  }

  async function markAllRead() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setError(null);
    try {
      const result = await api.patch<{ markedCount: number }>('/notifications/read-all', {});
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
      if (result.markedCount > 0) await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong danh dau tat ca duoc');
    } finally {
      setMarkingAll(false);
    }
  }

  async function togglePreference(preference: NotificationPreference) {
    if (updatingPreferenceId) return;
    setUpdatingPreferenceId(preference.id);
    setError(null);
    try {
      const updated = await api.patch<NotificationPreference>('/notifications/preferences', {
        channel: preference.channel,
        eventType: preference.eventType,
        enabled: !preference.enabled,
      });
      setPreferences((prev) => prev.map((item) => (item.id === preference.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong cap nhat preference duoc');
    } finally {
      setUpdatingPreferenceId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bell className="h-6 w-6 text-primary" />
            Thong bao
            {unreadCount > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Inbox doc tu Notifications API, mark-read va preferences duoc luu backend.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            onClick={() => setUnreadOnly((value) => !value)}
          >
            Unread only
          </Button>
          <Button variant="outline" onClick={loadNotifications} disabled={loading}>
            <RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={markAllRead}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Mark all read
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-2">
          {loading ? (
            [1, 2, 3, 4].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))
          ) : notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
              Khong co thong bao phu hop.
            </div>
          ) : (
            notifications.map((notification) => {
              const iconConfig = iconFor(notification.type);
              const Icon = iconConfig.icon;

              return (
                <Card
                  key={notification.id}
                  className={cn(
                    'transition-all hover:shadow-md',
                    !notification.isRead && 'border-l-4 border-l-primary bg-primary/5',
                  )}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                        iconConfig.bg,
                      )}
                    >
                      <Icon className={cn('h-5 w-5', iconConfig.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3
                            className={cn(
                              'text-sm',
                              !notification.isRead ? 'font-semibold' : 'font-medium',
                            )}
                          >
                            {notification.title}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {notification.type}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {notification.channel}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {notification.body}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {!notification.isRead && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={markingId === notification.id}
                            onClick={() => markRead(notification)}
                          >
                            {markingId === notification.id ? 'Dang luu' : 'Mark read'}
                          </Button>
                        )}
                        {notification.actionUrl && (
                          <a href={notification.actionUrl}>
                            <Button size="sm">Open</Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Preferences</h2>
            </div>
            {groupedPreferences.length === 0 ? (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Chua co preference override. Backend se dung mac dinh enabled cho cac event.
              </p>
            ) : (
              groupedPreferences.map(([eventType, items]) => (
                <div key={eventType} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{eventType}</p>
                  <div className="mt-2 space-y-2">
                    {items.map((preference) => (
                      <label
                        key={preference.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-muted-foreground">{preference.channel}</span>
                        <input
                          type="checkbox"
                          checked={preference.enabled}
                          disabled={updatingPreferenceId === preference.id}
                          onChange={() => togglePreference(preference)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
