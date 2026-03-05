'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Workflow, Play, FileCheck, ChevronRight, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  running: { label: 'Đang chạy', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Hoàn thành', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  failed: { label: 'Thất bại', className: 'bg-red-100 text-red-700 border-red-200' },
  pending: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700 border-amber-200' },
};

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
    description: 'Quy trình từ lập kế hoạch, xin phép, chuẩn bị vật tư, triển khai và báo cáo sau trại.',
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

export default function ProcessPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Workflow className="h-8 w-8 text-cyan-500" />
        Quy trình
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCheck className="h-5 w-5" />
            Định nghĩa quy trình
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {WORKFLOW_DEFS.map((wf) => (
              <div key={wf.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-[hsl(var(--muted)_/_0.3)] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{wf.name}</h3>
                    <Badge variant="outline" className="text-[10px]">{wf.version}</Badge>
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
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{wf.description}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{wf.stepsCount} bước</p>
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
              const statusCfg = STATUS_CONFIG[run.status];
              const progress = Math.round((run.currentStep / run.totalSteps) * 100);
              return (
                <div key={run.id} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{run.workflowName}</h3>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Khởi tạo bởi {run.initiator} — {new Date(run.startedAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <Badge className={cn('border', statusCfg.className)}>{statusCfg.label}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[hsl(var(--muted-foreground))]">Bước {run.currentStep}/{run.totalSteps}</span>
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
    </div>
  );
}
