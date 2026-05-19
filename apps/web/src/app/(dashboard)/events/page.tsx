'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface EventItem {
  id: string;
  title: string;
  eventType?: string | null;
  startDate: string;
  endDate: string;
  location?: string | null;
  status: string;
  maxParticipants?: number | null;
  expReward?: number | null;
  targetBranches?: string[];
  _count?: { registrations?: number };
}

interface EventRegistration {
  id: string;
  orgMemberId: string;
  status: string;
  consentSigned?: boolean;
  consentBy?: string | null;
  checkInTime?: string | null;
  orgMember?: {
    scoutName?: string | null;
    memberCode?: string | null;
    user?: { displayName?: string | null };
  };
}

interface EventDetail extends EventItem {
  registrations: EventRegistration[];
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planning: { label: 'Planning', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  proposed: { label: 'Proposed', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  registration_open: {
    label: 'Registration open',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  go_live: { label: 'Go live', className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  in_progress: { label: 'In progress', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  reported: { label: 'Reported', className: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const EVENT_ACTIONS: Record<string, Array<{ action: string; label: string }>> = {
  planning: [{ action: 'propose', label: 'Propose' }],
  proposed: [
    { action: 'approve', label: 'Approve' },
    { action: 'reject', label: 'Reject' },
  ],
  approved: [{ action: 'open_registration', label: 'Open registration' }],
  registration_open: [
    { action: 'go_live', label: 'Go live' },
    { action: 'close_registration', label: 'Close registration' },
  ],
  go_live: [{ action: 'start', label: 'Start' }],
  in_progress: [{ action: 'complete', label: 'Complete' }],
  completed: [{ action: 'submit_report', label: 'Submit report' }],
};

function statusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      className: 'bg-gray-100 text-gray-700 border-gray-200',
    }
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function memberLabel(registration: EventRegistration) {
  return (
    registration.orgMember?.scoutName ||
    registration.orgMember?.user?.displayName ||
    registration.orgMember?.memberCode ||
    registration.orgMemberId.slice(0, 8)
  );
}

export default function EventsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const memberId = user?.memberId;

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrate, hydrated]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<EventItem[]>('/events', {
        limit: 100,
        status: statusFilter || undefined,
      });
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc events');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadEventDetail = useCallback(async (eventId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const data = await api.get<EventDetail>(`/events/${eventId}`);
      setSelectedEvent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc event detail');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;
    return events.filter((event) =>
      [event.title, event.location, event.eventType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [events, search]);

  async function createEvent() {
    if (!title.trim() || !startDate || !endDate || creating) return;
    setCreating(true);
    setError(null);
    setStatus(null);
    try {
      await api.post('/events', {
        title: title.trim(),
        startDate,
        endDate,
        location: location.trim() || undefined,
        maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
      });
      setTitle('');
      setLocation('');
      setStartDate('');
      setEndDate('');
      setMaxParticipants('');
      setShowCreate(false);
      setStatus('Da tao event.');
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tao duoc event');
    } finally {
      setCreating(false);
    }
  }

  async function transitionEvent(event: EventItem, action: string) {
    if (busyEventId) return;
    setBusyEventId(event.id);
    setError(null);
    setStatus(null);
    try {
      await api.post(`/events/${event.id}/transition`, { action });
      setStatus(`Da thuc hien ${action} cho ${event.title}.`);
      await loadEvents();
      if (selectedEvent?.id === event.id) await loadEventDetail(event.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong transition duoc event');
    } finally {
      setBusyEventId(null);
    }
  }

  async function register(event: EventItem) {
    if (!memberId || busyEventId) {
      setError('Tai khoan hien tai chua co memberId de dang ky event.');
      return;
    }
    setBusyEventId(event.id);
    setError(null);
    setStatus(null);
    try {
      await api.post(`/events/${event.id}/register`);
      setStatus(`Da dang ky ${event.title}.`);
      await loadEvents();
      await loadEventDetail(event.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong dang ky duoc event');
    } finally {
      setBusyEventId(null);
    }
  }

  async function signConsent(event: EventDetail) {
    if (!memberId || busyEventId) {
      setError('Tai khoan hien tai chua co memberId de ky consent.');
      return;
    }
    setBusyEventId(event.id);
    setError(null);
    setStatus(null);
    try {
      await api.post(`/events/${event.id}/consent`, {
        memberId,
        consentBy: user?.email ?? user?.userId ?? memberId,
      });
      setStatus('Da ky consent.');
      await loadEventDetail(event.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong ky consent duoc');
    } finally {
      setBusyEventId(null);
    }
  }

  async function checkIn(event: EventDetail, registration: EventRegistration) {
    if (busyEventId) return;
    setBusyEventId(registration.id);
    setError(null);
    setStatus(null);
    try {
      await api.post(`/events/${event.id}/check-in/${registration.orgMemberId}`);
      setStatus(`Da check-in ${memberLabel(registration)}.`);
      await loadEventDetail(event.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong check-in duoc');
    } finally {
      setBusyEventId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Calendar className="h-8 w-8 text-blue-500" />
            Su kien & Trai
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Event lifecycle, registration, consent, and check-in use backend Events API.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tim kiem event..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All status</option>
            {Object.keys(STATUS_CONFIG).map((item) => (
              <option key={item} value={item}>
                {STATUS_CONFIG[item].label}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={loadEvents} disabled={loading}>
            <RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreate((value) => !value)}>
            <Plus className="mr-1 h-4 w-4" />
            Tao event
          </Button>
        </div>
      </div>

      {(error || status) && (
        <div
          className={cn(
            'rounded-md border px-4 py-3 text-sm',
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
          )}
        >
          {error ?? status}
        </div>
      )}

      {showCreate && (
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px_140px_auto]">
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Event title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <input
              type="date"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <input
              type="date"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
            <input
              type="number"
              min="0"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Capacity"
              value={maxParticipants}
              onChange={(event) => setMaxParticipants(event.target.value)}
            />
            <Button
              disabled={!title.trim() || !startDate || !endDate || creating}
              onClick={createEvent}
            >
              {creating ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Create
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {loading ? (
            [1, 2, 3].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-lg bg-muted" />
            ))
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              Khong tim thay event nao.
            </div>
          ) : (
            filtered.map((event) => {
              const state = statusConfig(event.status);
              const registered = event._count?.registrations ?? 0;
              const capacity = event.maxParticipants ?? 0;
              const isFull = Boolean(capacity && registered >= capacity);
              const canRegister =
                ['registration_open', 'approved'].includes(event.status) && !isFull;
              const actions = EVENT_ACTIONS[event.status] ?? [];

              return (
                <Card key={event.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold">{event.title}</h3>
                          <Badge className={cn('border', state.className)}>{state.label}</Badge>
                          {event.eventType && <Badge variant="secondary">{event.eventType}</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDate(event.startDate)}
                            {event.startDate !== event.endDate &&
                              ` to ${formatDate(event.endDate)}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location ?? '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {registered}/{capacity || 'unlimited'}
                            {isFull && (
                              <Badge variant="destructive" className="ml-1 text-[10px]">
                                Full
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => loadEventDetail(event.id)}>
                          Detail
                        </Button>
                        {canRegister && (
                          <Button
                            disabled={busyEventId === event.id || !memberId}
                            onClick={() => register(event)}
                          >
                            Register
                          </Button>
                        )}
                        {actions.map((item) => (
                          <Button
                            key={item.action}
                            variant="outline"
                            disabled={busyEventId === event.id}
                            onClick={() => transitionEvent(event, item.action)}
                          >
                            {item.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Event detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Dang tai detail...
              </div>
            ) : !selectedEvent ? (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Chon Detail de xem registrations, consent, va check-in.
              </p>
            ) : (
              <>
                <div>
                  <h2 className="font-semibold">{selectedEvent.title}</h2>
                  <p className="text-sm text-muted-foreground">{selectedEvent.location ?? '-'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={!memberId || busyEventId === selectedEvent.id}
                    onClick={() => signConsent(selectedEvent)}
                  >
                    <ShieldCheck className="mr-1 h-4 w-4" />
                    Sign consent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyEventId === selectedEvent.id || !memberId}
                    onClick={() => register(selectedEvent)}
                  >
                    Register me
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedEvent.registrations.length === 0 ? (
                    <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                      Chua co registration.
                    </p>
                  ) : (
                    selectedEvent.registrations.map((registration) => (
                      <div key={registration.id} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{memberLabel(registration)}</p>
                            <p className="text-xs text-muted-foreground">
                              {registration.status} - consent{' '}
                              {registration.consentSigned ? 'signed' : 'missing'}
                            </p>
                          </div>
                          {registration.checkInTime ? (
                            <Badge className="bg-emerald-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Checked in
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyEventId === registration.id}
                              onClick={() => checkIn(selectedEvent, registration)}
                            >
                              Check-in
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
