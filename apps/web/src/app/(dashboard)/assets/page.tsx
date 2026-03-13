'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package, MapPin, HandMetal, AlertTriangle, ClipboardList, Download,
  Shirt, Settings2, Boxes, Tags, ChevronRight, CalendarClock,
  CheckCircle2, XCircle, RotateCcw, ArrowDownUp, Wrench, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──

type AssetStatus = 'available' | 'in_use' | 'maintenance' | 'retired' | 'disposed';
type LoanStatus = 'pending' | 'approved' | 'checked_out' | 'returned' | 'rejected' | 'lost';
type TabKey = 'inventory' | 'loans' | 'uniform' | 'maintenance' | 'kits' | 'categories';

interface Asset {
  id: string; name: string; assetCode: string; status: string; condition: string;
  quantity: number; availableQty: number; location?: string; unit?: string;
  category?: { name: string; icon?: string };
  _count?: { loans: number };
}

interface Loan {
  id: string; status: LoanStatus; borrowerId: string; purpose?: string;
  requestedAt: string; expectedReturn: string; actualReturn?: string;
  guardianAcceptanceStatus?: string;
  asset?: { id: string; name: string; assetCode: string; category?: { name: string } };
}

interface UniformIssue {
  id: string; memberId: string; uniformType: string; size: string;
  quantity: number; status: string; issuedDate: string; returnDate?: string;
}

interface MaintenanceItem {
  id: string; maintenanceType: string; frequency: string;
  nextDue: string; status: string; lastPerformed?: string;
  asset?: { id: string; name: string; assetCode: string };
}

interface StockAlert {
  id: string; name: string; assetCode: string; availableQty: number;
  totalQty: number; severity: 'critical' | 'high' | 'low';
}

interface KitTemplate {
  id: string; name: string; description?: string; itemCount?: number;
  items?: { id: string; itemName: string; quantity: number; isOptional: boolean }[];
}

interface Category {
  id: string; name: string; icon?: string; _count?: { assets: number };
}

// ── Config ──

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: { label: 'Sẵn có', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  in_use: { label: 'Đang mượn', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  maintenance: { label: 'Bảo trì', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  retired: { label: 'Thanh lý', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  disposed: { label: 'Đã xử lý', className: 'bg-red-100 text-red-600 border-red-200' },
};

const LOAN_STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  pending: { label: 'Chờ duyệt', icon: CalendarClock, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  approved: { label: 'Đã duyệt', icon: CheckCircle2, className: 'bg-blue-100 text-blue-700 border-blue-200' },
  checked_out: { label: 'Đã cho mượn', icon: ArrowDownUp, className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  returned: { label: 'Đã trả', icon: RotateCcw, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Từ chối', icon: XCircle, className: 'bg-red-100 text-red-700 border-red-200' },
  lost: { label: 'Mất', icon: AlertTriangle, className: 'bg-red-100 text-red-700 border-red-200' },
};

const TABS: { key: TabKey; label: string; icon: typeof Package }[] = [
  { key: 'inventory', label: 'Kho tài sản', icon: Package },
  { key: 'loans', label: 'Mượn/Trả', icon: HandMetal },
  { key: 'uniform', label: 'Đồng phục', icon: Shirt },
  { key: 'maintenance', label: 'Bảo trì', icon: Wrench },
  { key: 'kits', label: 'Bộ kit', icon: Boxes },
  { key: 'categories', label: 'Danh mục', icon: Tags },
];

// ── Helper Hooks ──

function useApiData<T>(endpoint: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${endpoint}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently handle — data stays null
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, loading, refetch: fetchData };
}

// ── Stock Alert Banner ──

function StockAlertBanner({ alerts }: { alerts: StockAlert[] }) {
  if (!alerts.length) return null;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">
          {alerts.length} tài sản cảnh báo tồn kho thấp
          {criticalCount > 0 && (
            <span className="text-red-600 ml-1">({criticalCount} hết hàng)</span>
          )}
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {alerts.slice(0, 5).map((a) => (
            <Badge
              key={a.id}
              className={cn(
                'text-xs border',
                a.severity === 'critical'
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : 'bg-amber-100 text-amber-700 border-amber-200'
              )}
            >
              {a.assetCode}: {a.availableQty}/{a.totalQty}
            </Badge>
          ))}
          {alerts.length > 5 && (
            <span className="text-xs text-amber-600">+{alerts.length - 5} thêm...</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Inventory ──

function InventoryTab({ assets, loading }: { assets: Asset[]; loading: boolean }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? assets : assets.filter((a) => a.status === filter);

  if (loading) return <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {['all', 'available', 'in_use', 'maintenance', 'retired'].map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-full transition-colors border',
              filter === key
                ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]',
            )}
          >
            {key === 'all' ? 'Tất cả' : (STATUS_CONFIG[key]?.label ?? key)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((asset) => {
          const stCfg = STATUS_CONFIG[asset.status] ?? STATUS_CONFIG.available;
          const canBorrow = asset.status === 'available' && asset.availableQty > 0;

          return (
            <Card key={asset.id} className="hover:shadow-md transition-shadow group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{asset.category?.icon ?? '📦'}</span>
                    <div>
                      <CardTitle className="text-base group-hover:text-[hsl(var(--primary))] transition-colors">{asset.name}</CardTitle>
                      <p className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{asset.assetCode}</p>
                    </div>
                  </div>
                  <Badge className={cn('border shrink-0', stCfg.className)}>{stCfg.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">Số lượng</span>
                  <span className="font-medium">
                    <span className={cn(asset.availableQty === 0 ? 'text-red-500' : 'text-emerald-600')}>
                      {asset.availableQty}
                    </span>
                    /{asset.quantity}
                  </span>
                </div>
                {asset.location && (
                  <div className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))]">
                    <MapPin className="h-3.5 w-3.5" /> {asset.location}
                  </div>
                )}
                {canBorrow && (
                  <Button size="sm" className="w-full">
                    <HandMetal className="h-4 w-4 mr-1" /> Mượn tài sản
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-[hsl(var(--muted-foreground))]">
            Không có tài sản nào
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Loans ──

function LoansTab({ loans, loading }: { loans: Loan[]; loading: boolean }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const filtered = statusFilter === 'all' ? loans : loans.filter((l) => l.status === statusFilter);

  if (loading) return <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {['all', 'pending', 'approved', 'checked_out', 'returned'].map((key) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-full transition-colors border',
              statusFilter === key
                ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]',
            )}
          >
            {key === 'all' ? 'Tất cả' : (LOAN_STATUS_CONFIG[key]?.label ?? key)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((loan) => {
          const cfg = LOAN_STATUS_CONFIG[loan.status] ?? LOAN_STATUS_CONFIG.pending;
          const StatusIcon = cfg.icon;
          const isOverdue = loan.status === 'checked_out' && new Date(loan.expectedReturn) < new Date();

          return (
            <Card key={loan.id} className={cn('hover:shadow-sm transition-shadow', isOverdue && 'border-red-300')}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <StatusIcon className={cn('h-5 w-5 shrink-0', isOverdue ? 'text-red-500' : 'text-[hsl(var(--muted-foreground))]')} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{loan.asset?.name ?? 'Loading...'}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {loan.asset?.assetCode} • {loan.purpose ?? 'Không ghi lý do'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isOverdue && <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">Quá hạn</Badge>}
                  {loan.guardianAcceptanceStatus === 'pending' && (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 border text-xs">Chờ PH</Badge>
                  )}
                  <Badge className={cn('border text-xs', cfg.className)}>{cfg.label}</Badge>
                  <div className="text-right text-xs text-[hsl(var(--muted-foreground))]">
                    <p>Hạn trả: {new Date(loan.expectedReturn).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Không có phiếu mượn nào</div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Uniform ──

function UniformTab({ uniforms, loading }: { uniforms: UniformIssue[]; loading: boolean }) {
  if (loading) return <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Đang tải...</div>;

  return (
    <div className="space-y-3">
      {uniforms.map((u) => (
        <Card key={u.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Shirt className="h-5 w-5 text-sky-500" />
              <div>
                <p className="font-medium text-sm">{u.uniformType} — Size {u.size}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  SL: {u.quantity} • Cấp: {new Date(u.issuedDate).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn(
                'border text-xs',
                u.status === 'issued'
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : u.status === 'returned'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200',
              )}>
                {u.status === 'issued' ? 'Đang cấp' : u.status === 'returned' ? 'Đã thu hồi' : u.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
      {uniforms.length === 0 && (
        <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Chưa có dữ liệu đồng phục</div>
      )}
    </div>
  );
}

// ── Tab: Maintenance ──

function MaintenanceTab({ items, loading }: { items: MaintenanceItem[]; loading: boolean }) {
  if (loading) return <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Đang tải...</div>;

  return (
    <div className="space-y-3">
      {items.map((m) => {
        const isDue = new Date(m.nextDue) <= new Date();

        return (
          <Card key={m.id} className={cn('hover:shadow-sm transition-shadow', isDue && 'border-amber-300')}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Settings2 className={cn('h-5 w-5', isDue ? 'text-amber-500' : 'text-[hsl(var(--muted-foreground))]')} />
                <div>
                  <p className="font-medium text-sm">{m.asset?.name ?? 'N/A'} — {m.maintenanceType}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {m.asset?.assetCode} • Tần suất: {m.frequency}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isDue && <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">Đến hạn</Badge>}
                <div className="text-right text-xs text-[hsl(var(--muted-foreground))]">
                  <p>Tiếp theo: {new Date(m.nextDue).toLocaleDateString('vi-VN')}</p>
                  {m.lastPerformed && (
                    <p>Lần cuối: {new Date(m.lastPerformed).toLocaleDateString('vi-VN')}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" className="text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Hoàn thành
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {items.length === 0 && (
        <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Chưa có lịch bảo trì</div>
      )}
    </div>
  );
}

// ── Tab: Kits ──

function KitsTab({ kits, loading }: { kits: KitTemplate[]; loading: boolean }) {
  if (loading) return <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Đang tải...</div>;

  if (kits.length === 0) {
    return (
      <div className="text-center py-12">
        <Boxes className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
        <h3 className="text-lg font-medium mb-1">Chưa có bộ kit nào</h3>
        <p className="text-[hsl(var(--muted-foreground))]">Tạo template kit cho trại, sinh hoạt</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {kits.map((kit) => (
        <Card key={kit.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-sky-500" />
                <CardTitle className="text-base">{kit.name}</CardTitle>
              </div>
              <Badge className="bg-sky-100 text-sky-700 border-sky-200 border text-xs">
                {kit.items?.length ?? kit.itemCount ?? 0} món
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {kit.description && (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{kit.description}</p>
            )}
            {kit.items && kit.items.length > 0 && (
              <div className="space-y-1">
                {kit.items.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className={cn(item.isOptional && 'text-[hsl(var(--muted-foreground))]')}>
                      {item.isOptional ? '○' : '●'} {item.itemName}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">×{item.quantity}</span>
                  </div>
                ))}
                {kit.items.length > 4 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">+{kit.items.length - 4} món khác...</p>
                )}
              </div>
            )}
            <Button size="sm" variant="outline" className="w-full mt-2">
              <ClipboardList className="h-4 w-4 mr-1" /> Tạo checklist
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Tab: Categories ──

function CategoriesTab({ categories, loading }: { categories: Category[]; loading: boolean }) {
  if (loading) return <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Đang tải...</div>;

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <Tags className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
        <h3 className="text-lg font-medium mb-1">Chưa có danh mục</h3>
        <p className="text-[hsl(var(--muted-foreground))]">Phân loại tài sản theo nhóm</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((cat) => (
        <Card key={cat.id} className="hover:shadow-md transition-shadow group cursor-pointer">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cat.icon ?? '📁'}</span>
              <div>
                <p className="font-medium group-hover:text-[hsl(var(--primary))] transition-colors">{cat.name}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {cat._count?.assets ?? 0} tài sản
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Page ──

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('inventory');

  const { data: assetsResp, loading: assetsLoading } = useApiData<{ data: Asset[] }>('assets');
  const { data: loansResp, loading: loansLoading } = useApiData<{ data: Loan[] }>('assets/loans');
  const { data: alertsResp } = useApiData<{ alerts: StockAlert[] }>('assets/stock-alerts?threshold=5');
  const { data: uniformsResp, loading: uniformsLoading } = useApiData<UniformIssue[]>('assets/uniform');
  const { data: maintenanceResp, loading: maintenanceLoading } = useApiData<MaintenanceItem[]>('assets/maintenance');
  const { data: kitsResp, loading: kitsLoading } = useApiData<KitTemplate[]>('assets/kits');
  const { data: categoriesResp, loading: categoriesLoading } = useApiData<Category[]>('assets/categories');

  const assets = assetsResp?.data ?? [];
  const loans = loansResp?.data ?? [];
  const alerts = alertsResp?.alerts ?? [];
  const uniforms = Array.isArray(uniformsResp) ? uniformsResp : [];
  const maintenance = Array.isArray(maintenanceResp) ? maintenanceResp : [];
  const kits = Array.isArray(kitsResp) ? kitsResp : [];
  const categories = Array.isArray(categoriesResp) ? categoriesResp : [];

  const handleCsvExport = async (type: 'assets' | 'loans') => {
    try {
      const endpoint = type === 'assets' ? 'assets/export/csv' : 'assets/loans/export/csv';
      const res = await fetch(`/api/${endpoint}`, { credentials: 'include' });
      if (!res.ok) return;
      const { csv, filename } = await res.json();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silently ignore */ }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Package className="h-8 w-8 text-sky-500" />
          Tài sản
        </h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleCsvExport('assets')}>
            <Download className="h-4 w-4 mr-1" /> Xuất CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleCsvExport('loans')}>
            <Download className="h-4 w-4 mr-1" /> Xuất Phiếu mượn
          </Button>
        </div>
      </div>

      {/* Stock Alert Banner */}
      <StockAlertBanner alerts={alerts} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[hsl(var(--border))] overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap',
                activeTab === tab.key
                  ? 'text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--primary))]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'inventory' && <InventoryTab assets={assets} loading={assetsLoading} />}
      {activeTab === 'loans' && <LoansTab loans={loans} loading={loansLoading} />}
      {activeTab === 'uniform' && <UniformTab uniforms={uniforms} loading={uniformsLoading} />}
      {activeTab === 'maintenance' && <MaintenanceTab items={maintenance} loading={maintenanceLoading} />}
      {activeTab === 'kits' && <KitsTab kits={kits} loading={kitsLoading} />}
      {activeTab === 'categories' && <CategoriesTab categories={categories} loading={categoriesLoading} />}
    </div>
  );
}
