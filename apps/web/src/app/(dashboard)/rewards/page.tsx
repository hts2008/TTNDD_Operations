'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Gift,
  Loader2,
  Medal,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface ExpSummary {
  orgMemberId: string;
  totalExp: number;
  availableExp: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier4Count: number;
  penaltyCount: number;
}

interface LeaderboardRow {
  id: string;
  orgMemberId: string;
  totalExp: number;
  availableExp: number;
  orgMember?: {
    scoutName?: string | null;
    heroName?: string | null;
    memberCode?: string | null;
    user?: { displayName?: string | null; avatarUrl?: string | null };
    branch?: { name?: string | null; code?: string | null };
  };
}

interface RewardItem {
  id: string;
  name: string;
  description?: string | null;
  costExp: number;
  category?: string | null;
  imageUrl?: string | null;
  quantityAvailable: number;
  validUntil?: string | null;
}

interface Redemption {
  id: string;
  rewardId: string;
  expSpent: number;
  status: string;
  redeemedAt: string;
  reward?: RewardItem;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function displayName(row: LeaderboardRow) {
  return (
    row.orgMember?.scoutName ||
    row.orgMember?.heroName ||
    row.orgMember?.user?.displayName ||
    row.orgMember?.memberCode ||
    row.orgMemberId.slice(0, 8)
  );
}

function derivedLevel(totalExp: number) {
  return Math.floor(totalExp / 500) + 1;
}

function currentLevelProgress(totalExp: number) {
  const current = totalExp % 500;
  return { current, next: 500, percent: Math.round((current / 500) * 100) };
}

export default function RewardsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const memberId = user?.memberId;

  const [summary, setSummary] = useState<ExpSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [shopItems, setShopItems] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrate, hydrated]);

  const loadRewards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, leaderboardData, itemsData, redemptionData] = await Promise.all([
        memberId ? api.get<ExpSummary>(`/rewards/exp/summary/${memberId}`) : Promise.resolve(null),
        api.get<LeaderboardRow[]>('/rewards/leaderboard', { scope: 'org', limit: 50 }),
        api.get<RewardItem[]>('/rewards/shop/items'),
        memberId ? api.get<Redemption[]>('/rewards/shop/my-redemptions') : Promise.resolve([]),
      ]);
      setSummary(summaryData);
      setLeaderboard(leaderboardData);
      setShopItems(itemsData);
      setRedemptions(redemptionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc rewards data');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void loadRewards();
  }, [loadRewards]);

  const filteredLeaderboard = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leaderboard;
    return leaderboard.filter((row) => displayName(row).toLowerCase().includes(query));
  }, [leaderboard, search]);

  const myLevel = derivedLevel(summary?.totalExp ?? 0);
  const progress = currentLevelProgress(summary?.totalExp ?? 0);

  async function redeem(item: RewardItem) {
    if (!memberId || redeemingId) {
      setError('Tai khoan hien tai chua co memberId de doi thuong.');
      return;
    }
    setRedeemingId(item.id);
    setError(null);
    setStatus(null);
    try {
      await api.post('/rewards/shop/redeem', { rewardId: item.id });
      setStatus(`Da tao redemption cho "${item.name}".`);
      await loadRewards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong doi duoc phan thuong');
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Trophy className="h-8 w-8 text-amber-500" />
            Diem thuong & bang xep hang
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            EXP summary, leaderboard, reward shop, and redemptions are loaded from Rewards API.
          </p>
        </div>
        <Button variant="outline" onClick={loadRewards} disabled={loading}>
          <RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
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

      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Star className="h-6 w-6" />
            EXP cua toi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-24 animate-pulse rounded-lg bg-amber-100" />
          ) : !memberId ? (
            <p className="rounded-md bg-white/70 p-4 text-sm text-amber-700">
              Tai khoan hien tai chua co memberId, khong the hien thi EXP ca nhan.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-4">
              <Metric label="Total EXP" value={formatNumber(summary?.totalExp ?? 0)} />
              <Metric label="Available EXP" value={formatNumber(summary?.availableExp ?? 0)} />
              <Metric label="Level" value={`Lv.${myLevel}`} />
              <div>
                <p className="mb-2 text-sm font-medium text-amber-600">Level progress</p>
                <div className="h-4 w-full overflow-hidden rounded-full bg-amber-200">
                  <div
                    className="h-4 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-amber-600">
                  {progress.current} / {progress.next} EXP ({progress.percent}%)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Bang xep hang
              </CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tim thanh vien..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : filteredLeaderboard.length === 0 ? (
              <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                Chua co EXP leaderboard.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredLeaderboard.map((row, index) => (
                  <div key={row.id} className="flex items-center gap-4 rounded-lg border p-3">
                    <span
                      className={cn(
                        'w-10 font-bold',
                        index < 3 ? 'text-amber-600' : 'text-muted-foreground',
                      )}
                    >
                      {index < 3 ? <Medal className="inline h-5 w-5" /> : null} {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{displayName(row)}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.orgMember?.branch?.name ?? 'No branch'}
                      </p>
                    </div>
                    <span className="font-semibold text-amber-600">
                      {formatNumber(row.totalExp)} EXP
                    </span>
                    <Badge variant="secondary">Lv.{derivedLevel(row.totalExp)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-5 w-5" />
              Reward shop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shopItems.length === 0 ? (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Chua co reward item active.
              </p>
            ) : (
              shopItems.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.description || item.category || 'Reward item'}
                      </p>
                    </div>
                    <Badge>{formatNumber(item.costExp)} EXP</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Stock: {item.quantityAvailable === -1 ? 'unlimited' : item.quantityAvailable}
                    </span>
                    <Button
                      size="sm"
                      disabled={
                        !memberId ||
                        redeemingId === item.id ||
                        Boolean(summary && summary.availableExp < item.costExp)
                      }
                      onClick={() => redeem(item)}
                    >
                      {redeemingId === item.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Gift className="mr-1 h-4 w-4" />
                      )}
                      Redeem
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My redemptions</CardTitle>
        </CardHeader>
        <CardContent>
          {redemptions.length === 0 ? (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Chua co redemption nao.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {redemptions.map((redemption) => (
                <div key={redemption.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">
                      {redemption.reward?.name ?? redemption.rewardId.slice(0, 8)}
                    </p>
                    <Badge variant="outline">{redemption.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatNumber(redemption.expSpent)} EXP -{' '}
                    {new Date(redemption.redeemedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-medium text-amber-600">{label}</p>
      <p className="text-3xl font-bold text-amber-800">{value}</p>
    </div>
  );
}
