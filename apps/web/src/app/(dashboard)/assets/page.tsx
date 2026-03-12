'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Package,
  QrCode,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  Wrench,
  Box,
  Tag,
} from 'lucide-react';
import { api } from '@/lib/api';

// ── Types ──
interface Asset {
  id: string;
  assetCode: string;
  name: string;
  categoryId: string;
  status: string;
  condition: string;
  quantity: number;
  availableQty: number;
  unit: string | null;
  location: string | null;
  serialNumber: string | null;
  purchasePrice: number | null;
  notes: string | null;
  category: { name: string };
}

interface InventorySummary {
  byCategory: Record<string, { total: number; available: number; onLoan: number }>;
  totals: { total: number; available: number; onLoan: number };
  assetCount: number;
}

// ── Helpers ──
const conditionBadge = (c: string) => {
  const map: Record<string, string> = {
    good: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    fair: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    poor: 'bg-red-500/15 text-red-400 border-red-500/30',
    damaged: 'bg-red-600/15 text-red-500 border-red-600/30',
    new: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };
  return map[c] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    available: 'bg-emerald-500/15 text-emerald-400',
    on_loan: 'bg-amber-500/15 text-amber-400',
    reserved: 'bg-blue-500/15 text-blue-400',
    maintenance: 'bg-purple-500/15 text-purple-400',
    retired: 'bg-zinc-500/15 text-zinc-500',
  };
  return map[s] || 'bg-zinc-500/15 text-zinc-400';
};

// ── Component ──
export default function AssetsPage() {
  const [assets, setAssets] = useState<{ data: Asset[]; meta: { total: number } } | null>(null);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'inventory' | 'categories' | 'kits'>('inventory');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, summaryRes] = await Promise.all([
        api.get<{ data: Asset[]; meta: { total: number } }>('/api/v1/assets'),
        api.get<InventorySummary>('/api/v1/assets/summary'),
      ]);
      setAssets(assetsRes);
      setSummary(summaryRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async () => {
    try {
      const data = await api.get<unknown[]>('/api/v1/assets/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'assets-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore export error */
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-zinc-400">{error}</p>
        <button
          onClick={loadData}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const totals = summary?.totals ?? { total: 0, available: 0, onLoan: 0 };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Kho vật tư & Trang bị</h1>
          <p className="text-sm text-zinc-400">Armory & Asset Management</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            <Download className="h-4 w-4" /> Xuất
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" /> Làm mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Tổng tài sản"
          value={`${summary?.assetCount ?? 0}`}
          sub={`${totals.total} đơn vị`}
          color="blue"
        />
        <StatCard
          icon={Box}
          label="Sẵn sàng"
          value={`${totals.available}`}
          sub="đơn vị"
          color="emerald"
        />
        <StatCard
          icon={Tag}
          label="Đang mượn"
          value={`${totals.onLoan}`}
          sub="đơn vị"
          color="amber"
        />
        <StatCard
          icon={Wrench}
          label="Danh mục"
          value={`${Object.keys(summary?.byCategory ?? {}).length}`}
          sub="nhóm"
          color="purple"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-1">
        {(['inventory', 'categories', 'kits'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              tab === t
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            {t === 'inventory' ? 'Kho hàng' : t === 'categories' ? 'Danh mục' : 'Kit Templates'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'inventory' && <InventoryTab assets={assets?.data ?? []} />}
      {tab === 'categories' && <CategoriesTab summary={summary} />}
      {tab === 'kits' && <KitsTab />}
    </div>
  );
}

// ── Sub-Components ──
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400',
  };
  return (
    <div
      className={`rounded-xl border border-zinc-700/50 bg-linear-to-br ${colorMap[color]} p-4`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <Icon className="h-5 w-5 opacity-60" />
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-xs opacity-60">{sub}</p>
    </div>
  );
}

function InventoryTab({ assets }: { assets: Asset[] }) {
  if (!assets.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30 py-12">
        <Package className="h-10 w-10 text-zinc-600" />
        <p className="text-sm text-zinc-500">Chưa có tài sản nào trong kho</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
      <h3 className="mb-4 text-lg font-semibold text-zinc-100">
        Danh sách tài sản ({assets.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-left text-zinc-400">
              <th className="pb-2">Mã</th>
              <th className="pb-2">Tên</th>
              <th className="pb-2">Danh mục</th>
              <th className="pb-2 text-center">SL</th>
              <th className="pb-2 text-center">Có sẵn</th>
              <th className="pb-2 text-center">Tình trạng</th>
              <th className="pb-2 text-center">Trạng thái</th>
              <th className="pb-2">Vị trí</th>
              <th className="pb-2 text-center">QR</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/20">
                <td className="py-2.5 font-mono text-xs text-blue-400">{a.assetCode}</td>
                <td className="py-2.5 text-zinc-200">{a.name}</td>
                <td className="py-2.5 text-zinc-400">{a.category?.name ?? '—'}</td>
                <td className="py-2.5 text-center text-zinc-200">{a.quantity}</td>
                <td className="py-2.5 text-center text-emerald-400">{a.availableQty}</td>
                <td className="py-2.5 text-center">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-xs ${conditionBadge(a.condition)}`}
                  >
                    {a.condition}
                  </span>
                </td>
                <td className="py-2.5 text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs ${statusBadge(a.status)}`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="py-2.5 text-zinc-400">{a.location ?? '—'}</td>
                <td className="py-2.5 text-center">
                  <QrButton assetId={a.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QrButton({ assetId }: { assetId: string }) {
  const [showQr, setShowQr] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const loadQr = async () => {
    if (qrUrl) {
      setShowQr(!showQr);
      return;
    }
    try {
      const res = await api.get<{ qrDataUrl: string }>(`/api/v1/assets/${assetId}/qr`);
      setQrUrl(res.qrDataUrl);
      setShowQr(true);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative">
      <button
        onClick={loadQr}
        className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-blue-400"
      >
        <QrCode className="h-4 w-4" />
      </button>
      {showQr && qrUrl && (
        <div className="absolute right-0 z-10 mt-1 rounded-lg border border-zinc-600 bg-zinc-800 p-2 shadow-xl">
          <img src={qrUrl} alt="QR" className="h-32 w-32" />
          <button
            onClick={() => setShowQr(false)}
            className="mt-1 w-full text-center text-xs text-zinc-400 hover:text-zinc-200"
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  );
}

function CategoriesTab({ summary }: { summary: InventorySummary | null }) {
  const categories = summary ? Object.entries(summary.byCategory) : [];
  if (!categories.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30 py-12">
        <Tag className="h-10 w-10 text-zinc-600" />
        <p className="text-sm text-zinc-500">Chưa có danh mục nào</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map(([name, data]) => (
        <div key={name} className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
          <h4 className="font-medium text-zinc-100">{name}</h4>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-lg font-bold text-blue-400">{data.total}</p>
              <p className="text-xs text-zinc-500">Tổng</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-400">{data.available}</p>
              <p className="text-xs text-zinc-500">Sẵn sàng</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-400">{data.onLoan}</p>
              <p className="text-xs text-zinc-500">Đang mượn</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function KitsTab() {
  const [kits, setKits] = useState<
    Array<{ id: string; name: string; kitType: string; items: unknown[] }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Array<{ id: string; name: string; kitType: string; items: unknown[] }>>(
        '/api/v1/assets/kits',
      )
      .then(setKits)
      .catch(() => setKits([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  if (!kits.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30 py-12">
        <Box className="h-10 w-10 text-zinc-600" />
        <p className="text-sm text-zinc-500">Chưa có kit template nào</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {kits.map((k) => (
        <div key={k.id} className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
          <h4 className="font-medium text-zinc-100">{k.name}</h4>
          <span className="mt-1 inline-block rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-400">
            {k.kitType}
          </span>
          <p className="mt-2 text-sm text-zinc-400">{k.items.length} items</p>
        </div>
      ))}
    </div>
  );
}
