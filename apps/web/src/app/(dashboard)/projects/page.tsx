'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Kanban, Plus, CalendarDays, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type KanbanColumn = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface Task {
  id: string;
  title: string;
  assignee: string;
  assigneeInitials: string;
  priority: Priority;
  dueDate: string;
  column: KanbanColumn;
}

const COLUMN_CONFIG: Record<KanbanColumn, { label: string; color: string; bg: string }> = {
  todo: { label: 'Cần làm', color: 'text-gray-700', bg: 'bg-gray-100' },
  in_progress: { label: 'Đang thực hiện', color: 'text-blue-700', bg: 'bg-blue-100' },
  review: { label: 'Đang duyệt', color: 'text-amber-700', bg: 'bg-amber-100' },
  done: { label: 'Hoàn thành', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cancelled: { label: 'Đã hủy', color: 'text-red-700', bg: 'bg-red-100' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Thấp', className: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Trung bình', className: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'Cao', className: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700' },
};

const TASKS: Task[] = [
  { id: 't1', title: 'Lên kế hoạch Trại Hè 2026', assignee: 'Trưởng Minh', assigneeInitials: 'TM', priority: 'high', dueDate: '2026-04-15', column: 'in_progress' },
  { id: 't2', title: 'Thiết kế huy hiệu mới', assignee: 'Trưởng Hà', assigneeInitials: 'TH', priority: 'medium', dueDate: '2026-03-30', column: 'todo' },
  { id: 't3', title: 'Cập nhật chương trình Ngành Thiếu', assignee: 'Trưởng Nam', assigneeInitials: 'TN', priority: 'high', dueDate: '2026-03-20', column: 'review' },
  { id: 't4', title: 'Thu phí quý 1/2026', assignee: 'Trưởng Lan', assigneeInitials: 'TL', priority: 'critical', dueDate: '2026-03-15', column: 'in_progress' },
  { id: 't5', title: 'Tổ chức Ngày hội Gia Đình', assignee: 'Trưởng Tuấn', assigneeInitials: 'TT', priority: 'medium', dueDate: '2026-03-30', column: 'todo' },
  { id: 't6', title: 'Hoàn thành báo cáo tài chính Q4', assignee: 'Trưởng Lan', assigneeInitials: 'TL', priority: 'low', dueDate: '2026-02-28', column: 'done' },
  { id: 't7', title: 'Đăng ký trại huấn luyện cấp Tỉnh', assignee: 'Trưởng Minh', assigneeInitials: 'TM', priority: 'medium', dueDate: '2026-03-10', column: 'done' },
  { id: 't8', title: 'Mua sắm dụng cụ cũ (đã có mới)', assignee: 'Trưởng Hà', assigneeInitials: 'TH', priority: 'low', dueDate: '2026-02-15', column: 'cancelled' },
];

const COLUMN_ORDER: KanbanColumn[] = ['todo', 'in_progress', 'review', 'done', 'cancelled'];

export default function ProjectsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Kanban className="h-8 w-8 text-violet-500" />
          Dự án
        </h1>
        <Button>
          <Plus className="h-4 w-4 mr-1" /> Thêm công việc
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_ORDER.map((colKey) => {
          const cfg = COLUMN_CONFIG[colKey];
          const colTasks = TASKS.filter((t) => t.column === colKey);

          return (
            <div key={colKey} className="flex-shrink-0 w-72">
              <div className={cn('rounded-lg p-3 mb-3', cfg.bg)}>
                <h3 className={cn('font-semibold text-sm flex items-center justify-between', cfg.color)}>
                  {cfg.label}
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                </h3>
              </div>

              <div className="space-y-3">
                {colTasks.map((task) => {
                  const prCfg = PRIORITY_CONFIG[task.priority];
                  return (
                    <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4 space-y-3">
                        <p className="font-medium text-sm leading-snug">{task.title}</p>
                        <div className="flex items-center justify-between">
                          <Badge className={cn('border-0 text-[10px]', prCfg.className)}>
                            {prCfg.label}
                          </Badge>
                          <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold">
                            {task.assigneeInitials}
                          </div>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">{task.assignee}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-sm text-[hsl(var(--muted-foreground))] border border-dashed rounded-lg">
                    Không có công việc
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
