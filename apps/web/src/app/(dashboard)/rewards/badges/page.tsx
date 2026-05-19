'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, CalendarDays, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface BadgeDefinition {
  id: string;
  badgeCode: string;
  name: string;
  description?: string | null;
  badgeType?: string | null;
  imageUrl?: string | null;
  rarity: string;
  triggerEvent?: string | null;
  expReward: number;
  isAutoAward: boolean;
}

interface MemberBadge {
  id: string;
  orgMemberId: string;
  badgeId: string;
  earnedAt: string;
  notes?: string | null;
  badge: BadgeDefinition;
}

const RARITY_CLASS: Record<string, string> = {
  common: 'bg-gray-100 text-gray-700 border-gray-200',
  uncommon: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rare: 'bg-blue-100 text-blue-700 border-blue-200',
  epic: 'bg-purple-100 text-purple-700 border-purple-200',
  legendary: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function BadgesPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const memberId = user?.memberId;

  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [memberBadges, setMemberBadges] = useState<MemberBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrate, hydrated]);

  const loadBadges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [definitionData, memberBadgeData] = await Promise.all([
        api.get<BadgeDefinition[]>('/rewards/badges/definitions'),
        memberId
          ? api.get<MemberBadge[]>(`/rewards/badges/member/${memberId}`)
          : Promise.resolve([]),
      ]);
      setDefinitions(definitionData);
      setMemberBadges(memberBadgeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc badges');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void loadBadges();
  }, [loadBadges]);

  const earnedByBadgeId = useMemo(() => {
    return new Map(memberBadges.map((item) => [item.badgeId, item]));
  }, [memberBadges]);

  const earnedCount = memberBadges.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Award className="h-8 w-8 text-yellow-500" />
            Bo suu tap huy hieu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Badge definitions va member badge state doc tu Rewards API.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            {earnedCount}/{definitions.length} earned
          </Badge>
          <Button variant="outline" onClick={loadBadges} disabled={loading}>
            <RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!memberId && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Tai khoan hien tai chua co memberId, chi hien thi catalog badge definitions.
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <div key={item} className="h-64 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : definitions.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Chua co badge definition trong backend.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {definitions.map((definition) => {
            const earned = earnedByBadgeId.get(definition.id);
            return (
              <Card
                key={definition.id}
                className={cn(
                  'text-center transition-all hover:shadow-md',
                  !earned && 'opacity-65',
                )}
              >
                <CardContent className="space-y-3 p-6">
                  <div
                    className={cn(
                      'mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full',
                      earned ? 'bg-gradient-to-br from-yellow-100 to-amber-100' : 'bg-gray-100',
                    )}
                  >
                    {definition.imageUrl ? (
                      <img
                        src={definition.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Award
                        className={cn('h-10 w-10', earned ? 'text-amber-500' : 'text-gray-400')}
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{definition.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{definition.badgeCode}</p>
                  </div>
                  <p className="line-clamp-3 min-h-12 text-sm text-muted-foreground">
                    {definition.description || 'Badge definition chua co mo ta.'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'border text-[10px]',
                        RARITY_CLASS[definition.rarity] ?? RARITY_CLASS.common,
                      )}
                    >
                      {definition.rarity}
                    </Badge>
                    {definition.expReward > 0 && (
                      <Badge variant="secondary">+{definition.expReward} EXP</Badge>
                    )}
                  </div>
                  {earned ? (
                    <div className="flex items-center justify-center gap-1 text-xs text-emerald-600">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Earned {new Date(earned.earnedAt).toLocaleDateString('vi-VN')}
                    </div>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">
                      {definition.triggerEvent
                        ? `Trigger: ${definition.triggerEvent}`
                        : 'Not earned yet'}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Dang tai badges...
        </div>
      )}
    </div>
  );
}
