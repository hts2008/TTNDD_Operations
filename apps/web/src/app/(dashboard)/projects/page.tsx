'use client';

import { useState, useEffect, useCallback, DragEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Kanban, Plus, CalendarDays, User, AlertTriangle, CheckSquare,
  Bell, Shield, GripVertical, MessageSquare, Trash2, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ── Types ──────────────────────────────────────────
type KanbanColumn = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'critical';
type TabKey = 'kanban' | 'risks' | 'checklists' | 'alerts';

interface Task {
  id: string;
  title: string;
  assigneeIds: string[];
  priority: Priority;
  dueDate: string | null;
  status: KanbanColumn;
  description?: string;
}

interface Risk {
  id: string;
  title: string;
  description?: string;
  severity: string;
  probability: string;
  status: string;
  mitigation?: string;
}

interface ChecklistItem {
  text: string;
  checked: boolean;
}

interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  completedCount: number;
}

interface DueAlert {
  taskId: string;
  title: string;
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

// ── Config ─────────────────────────────────────────
const COLUMN_CONFIG: Record<KanbanColumn, { label: string; color: string; bg: string; border: string }> = {
  todo: { label: 'Cần làm', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
  in_progress: { label: 'Đang thực hiện', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  review: { label: 'Đang duyệt', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  done: { label: 'Hoàn thành', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  cancelled: { label: 'Đã hủy', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Thấp', className: 'bg-gray-100 text-gray-600' },
  medium: { label: 'TB', className: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'Cao', className: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Khẩn', className: 'bg-red-100 text-red-700' },
};

const SEVERITY_COLOR: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  mitigated: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-600',
  accepted: 'bg-amber-100 text-amber-700',
};

const COLUMN_ORDER: KanbanColumn[] = ['todo', 'in_progress', 'review', 'done', 'cancelled'];

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'kanban', label: 'Kanban', icon: <Kanban className="h-4 w-4" /> },
  { key: 'risks', label: 'Rủi ro', icon: <Shield className="h-4 w-4" /> },
  { key: 'checklists', label: 'Checklists', icon: <CheckSquare className="h-4 w-4" /> },
  { key: 'alerts', label: 'Cảnh báo', icon: <Bell className="h-4 w-4" /> },
];

// ── Demo Data (fallback when API is unavailable) ──
const DEMO_TASKS: Task[] = [
  { id: 't1', title: 'Lên kế hoạch Trại Hè 2026', assigneeIds: ['u1'], priority: 'high', dueDate: '2026-04-15', status: 'in_progress' },
  { id: 't2', title: 'Thiết kế huy hiệu mới', assigneeIds: ['u2'], priority: 'medium', dueDate: '2026-03-30', status: 'todo' },
  { id: 't3', title: 'Cập nhật chương trình Ngành Thiếu', assigneeIds: ['u3'], priority: 'high', dueDate: '2026-03-20', status: 'review' },
  { id: 't4', title: 'Thu phí quý 1/2026', assigneeIds: ['u4'], priority: 'critical', dueDate: '2026-03-15', status: 'in_progress' },
  { id: 't5', title: 'Tổ chức Ngày hội Gia Đình', assigneeIds: ['u5'], priority: 'medium', dueDate: '2026-03-30', status: 'todo' },
  { id: 't6', title: 'Hoàn thành báo cáo tài chính Q4', assigneeIds: ['u4'], priority: 'low', dueDate: '2026-02-28', status: 'done' },
  { id: 't7', title: 'Đăng ký trại huấn luyện cấp Tỉnh', assigneeIds: ['u1'], priority: 'medium', dueDate: '2026-03-10', status: 'done' },
  { id: 't8', title: 'Mua sắm dụng cụ cũ (đã có mới)', assigneeIds: ['u2'], priority: 'low', dueDate: '2026-02-15', status: 'cancelled' },
];

const DEMO_RISKS: Risk[] = [
  { id: 'r1', title: 'Thiếu ngân sách cho Trại Hè', severity: 'high', probability: 'medium', status: 'open', mitigation: 'Gây quỹ từ phụ huynh', description: 'Chi phí dự kiến vượt ngân sách 20%' },
  { id: 'r2', title: 'Thời tiết xấu ngày hội', severity: 'medium', probability: 'high', status: 'open', description: 'Mùa mưa có thể ảnh hưởng sự kiện ngoài trời' },
  { id: 'r3', title: 'Thiếu Huynh trưởng tình nguyện', severity: 'critical', probability: 'low', status: 'mitigated', mitigation: 'Đã liên hệ 5 HT dự phòng' },
];

const DEMO_CHECKLISTS: Checklist[] = [
  { id: 'c1', title: 'Chuẩn bị Trại Hè 2026', completedCount: 2, items: [
    { text: 'Đặt địa điểm cắm trại', checked: true },
    { text: 'Lên danh sách vật dụng', checked: true },
    { text: 'Phân công nhiệm vụ HT', checked: false },
    { text: 'Thông báo phụ huynh', checked: false },
    { text: 'Kiểm tra thiết bị y tế', checked: false },
  ]},
  { id: 'c2', title: 'Ngày hội Gia đình', completedCount: 1, items: [
    { text: 'Chuẩn bị trò chơi', checked: true },
    { text: 'Đặt nước uống, thức ăn', checked: false },
    { text: 'Trang trí sân bãi', checked: false },
  ]},
];

const DEMO_ALERTS: DueAlert[] = [
  { taskId: 't4', title: 'Thu phí quý 1/2026', dueDate: '2026-03-15', daysUntilDue: -2, isOverdue: true },
  { taskId: 't3', title: 'Cập nhật chương trình Ngành Thiếu', dueDate: '2026-03-20', daysUntilDue: 5, isOverdue: false },
  { taskId: 't2', title: 'Thiết kế huy hiệu mới', dueDate: '2026-03-30', daysUntilDue: 15, isOverdue: false },
];

// ── Kanban Board Component ─────────────────────────
function KanbanBoard({ tasks, onMoveTask }: { tasks: Task[]; onMoveTask: (taskId: string, toColumn: KanbanColumn) => void }) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, colKey: KanbanColumn) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(colKey);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>, colKey: KanbanColumn) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) onMoveTask(taskId, colKey);
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMN_ORDER.map((colKey) => {
        const cfg = COLUMN_CONFIG[colKey];
        const colTasks = tasks.filter((t) => t.status === colKey);
        const isDragOver = dragOverColumn === colKey;

        return (
          <div
            key={colKey}
            className={cn(
              'flex-shrink-0 w-72 rounded-xl border-2 transition-all duration-200',
              isDragOver ? 'border-violet-400 shadow-lg shadow-violet-100' : cfg.border,
            )}
            onDragOver={(e) => handleDragOver(e, colKey)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, colKey)}
          >
            <div className={cn('rounded-t-xl p-3', cfg.bg)}>
              <h3 className={cn('font-semibold text-sm flex items-center justify-between', cfg.color)}>
                {cfg.label}
                <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
              </h3>
            </div>

            <div className="p-2 space-y-2 min-h-[100px]">
              {colTasks.map((task) => {
                const prCfg = PRIORITY_CONFIG[task.priority];
                const isDragging = draggedTaskId === task.id;
                return (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className={cn(
                      'cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-150',
                      isDragging && 'opacity-50 rotate-2 scale-95',
                    )}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                        <p className="font-medium text-sm leading-snug flex-1">{task.title}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={cn('border-0 text-[10px]', prCfg.className)}>
                          {prCfg.label}
                        </Badge>
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-5 w-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[9px] font-bold">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="text-xs text-muted-foreground">{task.assigneeIds.length} người</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {colTasks.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                  Kéo thả vào đây
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Risks Tab ──────────────────────────────────────
function RisksTab({ risks }: { risks: Risk[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {risks.map((risk) => (
        <Card key={risk.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{risk.title}</CardTitle>
              <Badge className={cn('border-0 text-[10px]', STATUS_COLOR[risk.status] || 'bg-gray-100')}>
                {risk.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {risk.description && <p className="text-xs text-muted-foreground">{risk.description}</p>}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mức độ:</span>
              <Badge className={cn('border-0 text-[10px]', SEVERITY_COLOR[risk.severity] || 'bg-gray-100')}>
                {risk.severity}
              </Badge>
              <span className="text-xs text-muted-foreground ml-2">Xác suất:</span>
              <Badge variant="outline" className="text-[10px]">{risk.probability}</Badge>
            </div>
            {risk.mitigation && (
              <div className="bg-emerald-50 rounded p-2">
                <p className="text-xs text-emerald-700"><strong>Giảm thiểu:</strong> {risk.mitigation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {risks.length === 0 && (
        <div className="col-span-3 text-center py-16 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có rủi ro nào được ghi nhận</p>
        </div>
      )}
    </div>
  );
}

// ── Checklists Tab ─────────────────────────────────
function ChecklistsTab({ checklists }: { checklists: Checklist[] }) {
  const [localChecklists, setLocalChecklists] = useState(checklists);

  const toggleItem = (checklistId: string, itemIndex: number) => {
    setLocalChecklists((prev) =>
      prev.map((cl) => {
        if (cl.id !== checklistId) return cl;
        const newItems = [...cl.items];
        newItems[itemIndex] = { ...newItems[itemIndex]!, checked: !newItems[itemIndex]!.checked };
        return { ...cl, items: newItems, completedCount: newItems.filter((i) => i.checked).length };
      }),
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {localChecklists.map((cl) => {
        const pct = cl.items.length > 0 ? Math.round((cl.completedCount / cl.items.length) * 100) : 0;
        return (
          <Card key={cl.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{cl.title}</CardTitle>
                <Badge variant="secondary" className="text-xs">{cl.completedCount}/{cl.items.length}</Badge>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div
                  className="bg-violet-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {cl.items.map((item, idx) => (
                <label key={idx} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleItem(cl.id, idx)}
                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className={cn('text-sm transition-all', item.checked && 'line-through text-muted-foreground')}>
                    {item.text}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        );
      })}
      {localChecklists.length === 0 && (
        <div className="col-span-2 text-center py-16 text-muted-foreground">
          <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có checklist nào</p>
        </div>
      )}
    </div>
  );
}

// ── Alerts Tab ─────────────────────────────────────
function AlertsTab({ alerts }: { alerts: DueAlert[] }) {
  const overdue = alerts.filter((a) => a.isOverdue);
  const upcoming = alerts.filter((a) => !a.isOverdue);

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" />
            Quá hạn ({overdue.length})
          </h3>
          <div className="space-y-2">
            {overdue.map((a) => (
              <Card key={a.taskId} className="border-red-200 bg-red-50/50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">{a.title}</span>
                  </div>
                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                    Quá hạn {Math.abs(a.daysUntilDue)} ngày
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4" />
            Sắp đến hạn ({upcoming.length})
          </h3>
          <div className="space-y-2">
            {upcoming.map((a) => (
              <Card key={a.taskId} className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">{a.title}</span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                    Còn {a.daysUntilDue} ngày
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Không có cảnh báo nào</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────
export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('kanban');
  const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS);
  const [risks] = useState<Risk[]>(DEMO_RISKS);
  const [checklists] = useState<Checklist[]>(DEMO_CHECKLISTS);
  const [alerts] = useState<DueAlert[]>(DEMO_ALERTS);

  const handleMoveTask = useCallback((taskId: string, toColumn: KanbanColumn) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: toColumn } : t)),
    );
    // TODO: call API `PATCH /projects/:id/tasks/:taskId/move` when connected
  }, []);

  const alertCount = alerts.filter((a) => a.isOverdue).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Kanban className="h-8 w-8 text-violet-500" />
          Dự án
        </h1>
        <Button className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-1" /> Thêm công việc
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative',
              activeTab === tab.key
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'alerts' && alertCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'kanban' && <KanbanBoard tasks={tasks} onMoveTask={handleMoveTask} />}
      {activeTab === 'risks' && <RisksTab risks={risks} />}
      {activeTab === 'checklists' && <ChecklistsTab checklists={checklists} />}
      {activeTab === 'alerts' && <AlertsTab alerts={alerts} />}
    </div>
  );
}
