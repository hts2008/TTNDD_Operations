'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Workflow,
  Play,
  FileCheck,
  ChevronRight,
  GitBranch,
  BookOpen,
  Plus,
  Search,
  Eye,
  FileText,
  Tags,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  stepsCount: number;
  version: string;
  active: boolean;
}

interface WorkflowRun {
  id: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  currentStep: number;
  totalSteps: number;
  initiator: string;
  startedAt: string;
}

interface SopDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'superseded' | 'archived';
  latestVersion: number;
  versionStatus: string;
  updatedAt: string;
  createdBy: string;
}

// ── Status Configs ──

const RUN_STATUS: Record<string, { label: string; className: string }> = {
  running: { label: 'Đang chạy', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: {
    label: 'Hoàn thành',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  failed: { label: 'Thất bại', className: 'bg-red-100 text-red-700 border-red-200' },
  pending: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const SOP_STATUS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  draft: {
    label: 'Nháp',
    icon: <FileText className="h-3 w-3" />,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  published: {
    label: 'Đã ban hành',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  superseded: {
    label: 'Đã thay thế',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  archived: {
    label: 'Lưu trữ',
    icon: <XCircle className="h-3 w-3" />,
    className: 'bg-red-100 text-red-600 border-red-200',
  },
};

// ── Demo Data ──

const WORKFLOW_DEFS: WorkflowDefinition[] = [
  {
    id: 'w1',
    name: 'Đăng ký Đoàn sinh mới',
    description: 'Quy trình tiếp nhận hồ sơ, phỏng vấn, xét duyệt và phân Ngành cho Đoàn sinh mới.',
    stepsCount: 6,
    version: 'v2.1',
    active: true,
  },
  {
    id: 'w2',
    name: 'Tổ chức Trại huấn luyện',
    description:
      'Quy trình từ lập kế hoạch, xin phép, chuẩn bị vật tư, triển khai và báo cáo sau trại.',
    stepsCount: 8,
    version: 'v1.3',
    active: true,
  },
  {
    id: 'w3',
    name: 'Xét duyệt Đẳng thứ',
    description: 'Quy trình đánh giá kỹ năng, phỏng vấn Hội đồng và công nhận Đẳng thứ mới.',
    stepsCount: 5,
    version: 'v1.0',
    active: false,
  },
];

const ACTIVE_RUNS: WorkflowRun[] = [
  {
    id: 'r1',
    workflowName: 'Đăng ký Đoàn sinh mới',
    status: 'running',
    currentStep: 3,
    totalSteps: 6,
    initiator: 'Trưởng Minh',
    startedAt: '2026-03-03',
  },
  {
    id: 'r2',
    workflowName: 'Tổ chức Trại huấn luyện',
    status: 'pending',
    currentStep: 2,
    totalSteps: 8,
    initiator: 'Trưởng Hà',
    startedAt: '2026-03-01',
  },
];

const SOP_DOCS: SopDocument[] = [
  {
    id: 's1',
    title: 'Quy trình An toàn Trại',
    description:
      'Hướng dẫn an toàn cho mọi hoạt động trại của DTNDD — bao gồm kiểm tra địa điểm, sơ cứu, và liên lạc khẩn cấp.',
    category: 'An toàn',
    tags: ['trại', 'an-toàn', 'sơ-cứu'],
    status: 'published',
    latestVersion: 3,
    versionStatus: 'published',
    updatedAt: '2026-02-15',
    createdBy: 'Trưởng Minh',
  },
  {
    id: 's2',
    title: 'Tiêu chuẩn Đồng phục',
    description: 'Quy định về đồng phục Hướng Đạo sinh cho các cấp độ Ấu, Thiếu, Thanh.',
    category: 'Nội quy',
    tags: ['đồng-phục', 'nội-quy'],
    status: 'published',
    latestVersion: 2,
    versionStatus: 'published',
    updatedAt: '2026-01-20',
    createdBy: 'Trưởng Lan',
  },
  {
    id: 's3',
    title: 'Quy trình Kết nạp Đoàn viên',
    description: 'Hồ sơ, thủ tục và nghi thức cho việc kết nạp đoàn viên mới vào DTNDD.',
    category: 'Nhân sự',
    tags: ['kết-nạp', 'nhân-sự', 'hồ-sơ'],
    status: 'draft',
    latestVersion: 1,
    versionStatus: 'review',
    updatedAt: '2026-03-10',
    createdBy: 'Trưởng Hà',
  },
  {
    id: 's4',
    title: 'Hướng dẫn tổ chức Lửa Trại',
    description:
      'Kịch bản và hướng dẫn chi tiết cho buổi sinh hoạt Lửa trại — bao gồm nghi thức, trò chơi, và bài hát.',
    category: 'Hoạt động',
    tags: ['lửa-trại', 'sinh-hoạt', 'trò-chơi'],
    status: 'published',
    latestVersion: 4,
    versionStatus: 'published',
    updatedAt: '2026-02-28',
    createdBy: 'Trưởng Minh',
  },
];

// ── Tab Type ──
type TabKey = 'workflows' | 'sops';

export default function ProcessPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('sops');
  const [sopSearch, setSopSearch] = useState('');
  const [sopCategoryFilter, setSopCategoryFilter] = useState<string>('');

  const filteredSops = SOP_DOCS.filter((sop) => {
    const matchesSearch =
      !sopSearch ||
      sop.title.toLowerCase().includes(sopSearch.toLowerCase()) ||
      sop.description.toLowerCase().includes(sopSearch.toLowerCase());
    const matchesCategory = !sopCategoryFilter || sop.category === sopCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const sopCategories = [...new Set(SOP_DOCS.map((s) => s.category))];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Workflow className="h-8 w-8 text-cyan-500" />
          Quy trình & SOP
        </h1>
        {activeTab === 'sops' && (
          <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="h-4 w-4 mr-1" /> Tạo SOP mới
          </Button>
        )}
        {activeTab === 'workflows' && (
          <Link href="/process/workflow-builder">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
              <GitBranch className="h-4 w-4 mr-1" /> Workflow Builder
            </Button>
          </Link>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-[hsl(var(--muted)_/_0.5)] rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('sops')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'sops'
              ? 'bg-white shadow text-cyan-700'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
          )}
        >
          <BookOpen className="h-4 w-4" /> Thư viện SOP
        </button>
        <button
          onClick={() => setActiveTab('workflows')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'workflows'
              ? 'bg-white shadow text-cyan-700'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
          )}
        >
          <GitBranch className="h-4 w-4" /> Quy trình tự động
        </button>
      </div>

      {/* SOP Tab */}
      {activeTab === 'sops' && (
        <>
          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Tìm kiếm SOP..."
                value={sopSearch}
                onChange={(e) => setSopSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <select
              value={sopCategoryFilter}
              onChange={(e) => setSopCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Tất cả danh mục</option>
              {sopCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* SOP Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{SOP_DOCS.length}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Tổng SOP</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {SOP_DOCS.filter((s) => s.status === 'published').length}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Đã ban hành</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Send className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {SOP_DOCS.filter((s) => s.versionStatus === 'review').length}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Chờ duyệt</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {SOP_DOCS.filter((s) => s.status === 'draft').length}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Bản nháp</p>
              </div>
            </Card>
          </div>

          {/* SOP List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Thư viện SOP ({filteredSops.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredSops.map((sop) => {
                  const statusCfg = SOP_STATUS[sop.status];
                  return (
                    <div
                      key={sop.id}
                      className="flex items-start justify-between p-4 rounded-lg border hover:bg-[hsl(var(--muted)_/_0.3)] transition-colors group cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-[15px]">{sop.title}</h3>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            v{sop.latestVersion}
                          </Badge>
                          <Badge
                            className={cn(
                              'border text-[10px] flex items-center gap-1',
                              statusCfg.className,
                            )}
                          >
                            {statusCfg.icon} {statusCfg.label}
                          </Badge>
                          {sop.versionStatus === 'review' && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 border text-[10px]">
                              Phiên bản mới chờ duyệt
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 line-clamp-1">
                          {sop.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                          <span className="flex items-center gap-1">
                            <Tags className="h-3 w-3" />
                            {sop.tags.join(', ')}
                          </span>
                          <span>Danh mục: {sop.category}</span>
                          <span>
                            Cập nhật: {new Date(sop.updatedAt).toLocaleDateString('vi-VN')}
                          </span>
                          <span>Bởi: {sop.createdBy}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="h-4 w-4 mr-1" /> Xem
                      </Button>
                    </div>
                  );
                })}
                {filteredSops.length === 0 && (
                  <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Không tìm thấy SOP phù hợp</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileCheck className="h-5 w-5" />
                Định nghĩa quy trình
              </CardTitle>
              <Link href="/process/workflow-builder">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-violet-300 text-violet-600 hover:bg-violet-50"
                >
                  <GitBranch className="h-4 w-4 mr-1" /> Mở Workflow Builder
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {WORKFLOW_DEFS.map((wf) => (
                  <div
                    key={wf.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-[hsl(var(--muted)_/_0.3)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{wf.name}</h3>
                        <Badge variant="outline" className="text-[10px]">
                          {wf.version}
                        </Badge>
                        <Badge
                          className={cn(
                            'border',
                            wf.active
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200',
                          )}
                        >
                          {wf.active ? 'Hoạt động' : 'Tạm dừng'}
                        </Badge>
                      </div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                        {wf.description}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        {wf.stepsCount} bước
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 ml-4">
                      <Play className="h-4 w-4 mr-1" /> Khởi chạy
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitBranch className="h-5 w-5" />
                Quy trình đang chạy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ACTIVE_RUNS.map((run) => {
                  const statusCfg = RUN_STATUS[run.status];
                  const progress = Math.round((run.currentStep / run.totalSteps) * 100);
                  return (
                    <div key={run.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{run.workflowName}</h3>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Khởi tạo bởi {run.initiator} —{' '}
                            {new Date(run.startedAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <Badge className={cn('border', statusCfg.className)}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[hsl(var(--muted-foreground))]">
                            Bước {run.currentStep}/{run.totalSteps}
                          </span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="w-full bg-[hsl(var(--muted))] rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-cyan-500 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1 pt-2 overflow-x-auto">
                          {Array.from({ length: run.totalSteps }).map((_, i) => (
                            <div key={i} className="flex items-center">
                              <div
                                className={cn(
                                  'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                                  i < run.currentStep
                                    ? 'bg-cyan-500 text-white'
                                    : i === run.currentStep
                                      ? 'bg-cyan-100 text-cyan-700 ring-2 ring-cyan-500'
                                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
                                )}
                              >
                                {i + 1}
                              </div>
                              {i < run.totalSteps - 1 && (
                                <ChevronRight className="h-3 w-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
