'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Search,
  Download,
  Upload,
  UserPlus,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  Tent,
  Package,
  CheckCircle2,
} from 'lucide-react';

// ══════════════════════════════════════════════
// T-1114: Template Gallery Admin UI
// ══════════════════════════════════════════════

interface TemplateNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

interface WorkflowTemplate {
  slug: string;
  name: string;
  description: string;
  category: string;
  nodesJson: TemplateNode[];
  edgesJson: TemplateEdge[];
  isBuiltIn: boolean;
}

const CATEGORIES = [
  { value: 'all', label: 'Tất cả', icon: Package },
  { value: 'onboarding', label: 'Tiếp nhận', icon: UserPlus },
  { value: 'finance', label: 'Tài chính', icon: DollarSign },
  { value: 'safety', label: 'An toàn', icon: ShieldCheck },
  { value: 'operations', label: 'Vận hành', icon: Tent },
];

const CATEGORY_COLORS: Record<string, string> = {
  onboarding: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  finance: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  safety: 'bg-red-500/15 text-red-400 border-red-500/30',
  operations: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  communication: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

const NODE_TYPE_COLORS: Record<string, string> = {
  start: 'bg-emerald-500',
  end: 'bg-slate-500',
  task: 'bg-blue-500',
  approval: 'bg-amber-500',
  notification: 'bg-violet-500',
  condition: 'bg-orange-500',
  delay: 'bg-cyan-500',
};

// Built-in template data (mirrors seed from template.service.ts)
const BUILT_IN_TEMPLATES: WorkflowTemplate[] = [
  {
    slug: 'onboarding-member',
    name: 'Tiếp nhận đoàn sinh mới',
    description: 'Quy trình tiếp nhận, xét duyệt và chào mừng đoàn sinh mới',
    category: 'onboarding',
    isBuiltIn: true,
    nodesJson: [
      { id: 's1', type: 'start', label: 'Bắt đầu', position: { x: 0, y: 0 }, data: {} },
      { id: 't1', type: 'task', label: 'Điền đơn', position: { x: 0, y: 1 }, data: {} },
      { id: 'a1', type: 'approval', label: 'Duyệt', position: { x: 0, y: 2 }, data: {} },
      { id: 'n1', type: 'notification', label: 'Chào mừng', position: { x: 0, y: 3 }, data: {} },
      { id: 'e1', type: 'end', label: 'Hoàn tất', position: { x: 0, y: 4 }, data: {} },
    ],
    edgesJson: [
      { id: 'e1', source: 's1', target: 't1' },
      { id: 'e2', source: 't1', target: 'a1' },
      { id: 'e3', source: 'a1', target: 'n1' },
      { id: 'e4', source: 'n1', target: 'e1' },
    ],
  },
  {
    slug: 'fee-reminder',
    name: 'Nhắc đóng phí sinh hoạt',
    description: 'Tự động nhắc phụ huynh đóng phí, leo thang nếu chưa thanh toán',
    category: 'finance',
    isBuiltIn: true,
    nodesJson: [
      { id: 's1', type: 'start', label: 'Bắt đầu', position: { x: 0, y: 0 }, data: {} },
      { id: 'd1', type: 'delay', label: 'Chờ 7 ngày', position: { x: 0, y: 1 }, data: {} },
      { id: 'n1', type: 'notification', label: 'Nhắc nhở', position: { x: 0, y: 2 }, data: {} },
      { id: 'c1', type: 'condition', label: 'Đã thanh toán?', position: { x: 0, y: 3 }, data: {} },
      { id: 'e1', type: 'end', label: 'Xong', position: { x: -1, y: 4 }, data: {} },
      { id: 'n2', type: 'notification', label: 'Leo thang', position: { x: 1, y: 4 }, data: {} },
      { id: 'e2', type: 'end', label: 'Kết thúc', position: { x: 1, y: 5 }, data: {} },
    ],
    edgesJson: [
      { id: 'e1', source: 's1', target: 'd1' },
      { id: 'e2', source: 'd1', target: 'n1' },
      { id: 'e3', source: 'n1', target: 'c1' },
      { id: 'e4', source: 'c1', target: 'e1', sourceHandle: 'true' },
      { id: 'e5', source: 'c1', target: 'n2', sourceHandle: 'false' },
      { id: 'e6', source: 'n2', target: 'e2' },
    ],
  },
  {
    slug: 'consent-reminder',
    name: 'Nhắc đồng thuận phụ huynh',
    description: 'Gửi yêu cầu đồng thuận và theo dõi phản hồi',
    category: 'safety',
    isBuiltIn: true,
    nodesJson: [
      { id: 's1', type: 'start', label: 'Bắt đầu', position: { x: 0, y: 0 }, data: {} },
      { id: 'n1', type: 'notification', label: 'Gửi yêu cầu', position: { x: 0, y: 1 }, data: {} },
      { id: 'd1', type: 'delay', label: 'Chờ 3 ngày', position: { x: 0, y: 2 }, data: {} },
      { id: 'c1', type: 'condition', label: 'Đã phản hồi?', position: { x: 0, y: 3 }, data: {} },
      { id: 'e1', type: 'end', label: 'Xong', position: { x: -1, y: 4 }, data: {} },
      { id: 'n2', type: 'notification', label: 'Nhắc lại', position: { x: 1, y: 4 }, data: {} },
      { id: 'e2', type: 'end', label: 'Kết thúc', position: { x: 1, y: 5 }, data: {} },
    ],
    edgesJson: [
      { id: 'e1', source: 's1', target: 'n1' },
      { id: 'e2', source: 'n1', target: 'd1' },
      { id: 'e3', source: 'd1', target: 'c1' },
      { id: 'e4', source: 'c1', target: 'e1', sourceHandle: 'true' },
      { id: 'e5', source: 'c1', target: 'n2', sourceHandle: 'false' },
      { id: 'e6', source: 'n2', target: 'e2' },
    ],
  },
  {
    slug: 'incident-escalation',
    name: 'Xử lý sự cố an toàn',
    description: 'Quy trình báo cáo, điều tra và xử lý sự cố an toàn',
    category: 'safety',
    isBuiltIn: true,
    nodesJson: [
      { id: 's1', type: 'start', label: 'Bắt đầu', position: { x: 0, y: 0 }, data: {} },
      { id: 't1', type: 'task', label: 'Báo cáo', position: { x: 0, y: 1 }, data: {} },
      { id: 'n1', type: 'notification', label: 'Thông báo', position: { x: 0, y: 2 }, data: {} },
      { id: 'a1', type: 'approval', label: 'Điều tra', position: { x: 0, y: 3 }, data: {} },
      { id: 't2', type: 'task', label: 'Khắc phục', position: { x: 0, y: 4 }, data: {} },
      { id: 'e1', type: 'end', label: 'Hoàn tất', position: { x: 0, y: 5 }, data: {} },
    ],
    edgesJson: [
      { id: 'e1', source: 's1', target: 't1' },
      { id: 'e2', source: 't1', target: 'n1' },
      { id: 'e3', source: 'n1', target: 'a1' },
      { id: 'e4', source: 'a1', target: 't2' },
      { id: 'e5', source: 't2', target: 'e1' },
    ],
  },
  {
    slug: 'camp-checklist',
    name: 'Checklist tổ chức trại',
    description: 'Chuẩn bị trang bị, kiểm tra, vận chuyển và xác nhận địa điểm',
    category: 'operations',
    isBuiltIn: true,
    nodesJson: [
      { id: 's1', type: 'start', label: 'Bắt đầu', position: { x: 0, y: 0 }, data: {} },
      { id: 't1', type: 'task', label: 'Chuẩn bị', position: { x: 0, y: 1 }, data: {} },
      { id: 'a1', type: 'approval', label: 'Kiểm tra', position: { x: 0, y: 2 }, data: {} },
      { id: 't2', type: 'task', label: 'Vận chuyển', position: { x: 0, y: 3 }, data: {} },
      { id: 'a2', type: 'approval', label: 'Xác nhận', position: { x: 0, y: 4 }, data: {} },
      { id: 'e1', type: 'end', label: 'Sẵn sàng', position: { x: 0, y: 5 }, data: {} },
    ],
    edgesJson: [
      { id: 'e1', source: 's1', target: 't1' },
      { id: 'e2', source: 't1', target: 'a1' },
      { id: 'e3', source: 'a1', target: 't2' },
      { id: 'e4', source: 't2', target: 'a2' },
      { id: 'e5', source: 'a2', target: 'e1' },
    ],
  },
];

function MiniFlowPreview({ nodes }: { nodes: TemplateNode[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {nodes.map((node) => (
        <div key={node.id} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${NODE_TYPE_COLORS[node.type] || 'bg-gray-500'}`} />
          <span className="text-[10px] text-muted-foreground">{node.label}</span>
          {node.id !== nodes[nodes.length - 1]?.id && (
            <span className="text-muted-foreground/40 text-[10px]">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [installedSlugs, setInstalledSlugs] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return BUILT_IN_TEMPLATES.filter((t) => {
      const matchCategory = activeCategory === 'all' || t.category === activeCategory;
      const matchSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleInstall = (slug: string) => {
    setInstalledSlugs((prev) => [...prev, slug]);
    // In real implementation, this would call POST /process/templates/:slug/install
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/process">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Thư viện mẫu quy trình
            </h1>
            <p className="text-sm text-muted-foreground">Chọn mẫu có sẵn hoặc nhập từ file JSON</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-cyan-400/30 text-cyan-400">
            <Upload className="h-4 w-4 mr-1" /> Nhập JSON
          </Button>
          <Button variant="outline" size="sm" className="border-emerald-400/30 text-emerald-400">
            <Download className="h-4 w-4 mr-1" /> Xuất JSON
          </Button>
        </div>
      </div>

      {/* Search + Category Tabs */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm mẫu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.value}
                variant={activeCategory === cat.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveCategory(cat.value)}
                className={activeCategory === cat.value ? 'bg-violet-600 text-white' : ''}
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                {cat.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((template) => {
          const isInstalled = installedSlugs.includes(template.slug);
          const CatIcon = CATEGORIES.find((c) => c.value === template.category)?.icon || Package;
          return (
            <Card
              key={template.slug}
              className="bg-white/[0.03] border-white/10 hover:border-violet-500/30 transition-all duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${CATEGORY_COLORS[template.category] || 'bg-gray-500/15 text-gray-400'}`}
                    >
                      <CatIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
                      <Badge
                        variant="outline"
                        className={`text-[10px] mt-1 ${CATEGORY_COLORS[template.category] || ''}`}
                      >
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                  {template.isBuiltIn && (
                    <Badge variant="secondary" className="text-[10px] bg-white/5">
                      Có sẵn
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {template.description}
                </p>

                {/* Mini flow preview */}
                <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                  <MiniFlowPreview nodes={template.nodesJson} />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{template.nodesJson.length} bước</span>
                  <span>•</span>
                  <span>{template.edgesJson.length} kết nối</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {isInstalled ? (
                    <Button
                      size="sm"
                      disabled
                      className="flex-1 bg-emerald-600/20 text-emerald-400 cursor-default"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Đã cài đặt
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleInstall(template.slug)}
                      className="flex-1 bg-violet-600 hover:bg-violet-700"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> Cài đặt
                    </Button>
                  )}
                  <Link href="/process/workflow-builder">
                    <Button variant="outline" size="sm" className="border-white/10">
                      Xem
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-muted-foreground">Không tìm thấy mẫu</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Thử thay đổi bộ lọc hoặc nhập mẫu từ JSON
          </p>
        </div>
      )}
    </div>
  );
}
