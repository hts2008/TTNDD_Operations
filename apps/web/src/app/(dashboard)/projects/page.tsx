'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Kanban,
  Plus,
  RefreshCw,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type KanbanColumn = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface Project {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  projectType?: string | null;
  ownerId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  _count?: { projectTasks?: number };
}

interface ProjectTask {
  id: string;
  title: string;
  description?: string | null;
  status: KanbanColumn;
  priority?: Priority | string | null;
  dueDate?: string | null;
  assigneeIds?: string[];
  storyPoints?: number | null;
  tags?: string[];
}

interface KanbanBoard {
  projectId: string;
  columns: Record<KanbanColumn, ProjectTask[]>;
}

interface DueAlert {
  taskId: string;
  title: string;
  projectTitle: string;
  dueDate?: string | null;
  status: string;
  priority?: string | null;
  isOverdue: boolean;
}

const COLUMN_CONFIG: Record<KanbanColumn, { label: string; color: string; bg: string }> = {
  todo: { label: 'Todo', color: 'text-gray-700', bg: 'bg-gray-100' },
  in_progress: { label: 'In progress', color: 'text-blue-700', bg: 'bg-blue-100' },
  review: { label: 'Review', color: 'text-amber-700', bg: 'bg-amber-100' },
  done: { label: 'Done', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
};

const TASK_ACTIONS: Record<
  KanbanColumn,
  Array<{ action: string; label: string; variant?: 'default' | 'outline' }>
> = {
  todo: [
    { action: 'start', label: 'Start' },
    { action: 'cancel', label: 'Cancel', variant: 'outline' },
  ],
  in_progress: [
    { action: 'review', label: 'Send review' },
    { action: 'cancel', label: 'Cancel', variant: 'outline' },
  ],
  review: [
    { action: 'approve', label: 'Approve' },
    { action: 'reject', label: 'Reject', variant: 'outline' },
    { action: 'cancel', label: 'Cancel', variant: 'outline' },
  ],
  done: [],
  cancelled: [],
};

const COLUMN_ORDER: KanbanColumn[] = ['todo', 'in_progress', 'review', 'done', 'cancelled'];

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function priorityConfig(priority?: string | null) {
  return PRIORITY_CONFIG[priority ?? 'medium'] ?? PRIORITY_CONFIG.medium;
}

function shortId(value?: string | null) {
  if (!value) return '-';
  return value.length > 8 ? value.slice(0, 8) : value;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [dueAlerts, setDueAlerts] = useState<DueAlert[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [transitioningTaskId, setTransitioningTaskId] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError(null);
    try {
      const data = await api.get<Project[]>('/projects', { limit: 100 });
      setProjects(data);
      setSelectedProjectId((current) => current || data[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc du an');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadBoard = useCallback(async () => {
    if (!selectedProjectId) {
      setBoard(null);
      return;
    }

    setLoadingBoard(true);
    setError(null);
    try {
      const [kanbanData, alertsData] = await Promise.all([
        api.get<KanbanBoard>(`/projects/${selectedProjectId}/kanban`),
        api.get<DueAlert[]>('/projects/tasks/due-alerts', { hours: 168 }),
      ]);
      setBoard(kanbanData);
      setDueAlerts(alertsData.filter((alert) => alert.projectTitle === selectedProject?.title));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tai duoc kanban');
    } finally {
      setLoadingBoard(false);
    }
  }, [selectedProject?.title, selectedProjectId]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  async function createTask() {
    const title = newTaskTitle.trim();
    if (!selectedProjectId || !title || creatingTask) return;

    setCreatingTask(true);
    setError(null);
    try {
      await api.post(`/projects/${selectedProjectId}/tasks`, {
        title,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || undefined,
      });
      setNewTaskTitle('');
      setNewTaskPriority('medium');
      setNewTaskDueDate('');
      setShowCreateTask(false);
      await loadBoard();
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tao duoc task');
    } finally {
      setCreatingTask(false);
    }
  }

  async function transitionTask(taskId: string, action: string) {
    if (transitioningTaskId) return;

    setTransitioningTaskId(taskId);
    setError(null);
    try {
      await api.post(`/projects/tasks/${taskId}/transition`, { action });
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong doi duoc trang thai task');
    } finally {
      setTransitioningTaskId(null);
    }
  }

  const columns = board?.columns ?? {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
    cancelled: [],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Kanban className="h-8 w-8 text-violet-500" />
            Du an
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kanban doc truc tiep tu Projects API, task transition co side effects va audit backend.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 min-w-64 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            disabled={loadingProjects || projects.length === 0}
          >
            {projects.length === 0 ? (
              <option value="">Chua co du an</option>
            ) : (
              projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))
            )}
          </select>
          <Button
            variant="outline"
            onClick={loadBoard}
            disabled={!selectedProjectId || loadingBoard}
          >
            <RefreshCw className={cn('mr-1 h-4 w-4', loadingBoard && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            disabled={!selectedProjectId}
            onClick={() => setShowCreateTask((value) => !value)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Them task
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {selectedProject && (
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Status" value={selectedProject.status} />
          <Metric label="Type" value={selectedProject.projectType ?? '-'} />
          <Metric label="Tasks" value={selectedProject._count?.projectTasks ?? 0} />
          <Metric label="Owner" value={shortId(selectedProject.ownerId)} />
        </div>
      )}

      {showCreateTask && (
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_150px_160px_auto]">
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={newTaskPriority}
              onChange={(event) => setNewTaskPriority(event.target.value as Priority)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input
              type="date"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={newTaskDueDate}
              onChange={(event) => setNewTaskDueDate(event.target.value)}
            />
            <Button disabled={!newTaskTitle.trim() || creatingTask} onClick={createTask}>
              {creatingTask ? 'Dang tao' : 'Tao task'}
            </Button>
          </CardContent>
        </Card>
      )}

      {dueAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Due alerts trong 7 ngay
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {dueAlerts.map((alert) => (
              <Badge
                key={alert.taskId}
                variant="outline"
                className="border-amber-300 bg-white text-amber-800"
              >
                {alert.title} - {alert.dueDate ? formatDate(alert.dueDate) : '-'}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {loadingProjects || loadingBoard ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMN_ORDER.map((column) => (
            <div key={column} className="h-96 w-72 shrink-0 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Chua co project trong backend. Hay tao project tu plan da approved hoac Project API.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMN_ORDER.map((colKey) => {
            const cfg = COLUMN_CONFIG[colKey];
            const colTasks = columns[colKey] ?? [];

            return (
              <div key={colKey} className="w-80 shrink-0">
                <div className={cn('mb-3 rounded-lg p-3', cfg.bg)}>
                  <h3
                    className={cn(
                      'flex items-center justify-between text-sm font-semibold',
                      cfg.color,
                    )}
                  >
                    {cfg.label}
                    <Badge variant="secondary" className="text-xs">
                      {colTasks.length}
                    </Badge>
                  </h3>
                </div>

                <div className="space-y-3">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      transitioning={transitioningTaskId === task.id}
                      onTransition={transitionTask}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                      Khong co task
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function TaskCard({
  task,
  transitioning,
  onTransition,
}: {
  task: ProjectTask;
  transitioning: boolean;
  onTransition: (taskId: string, action: string) => void;
}) {
  const prCfg = priorityConfig(task.priority);
  const actions = TASK_ACTIONS[task.status] ?? [];

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          {task.status === 'done' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
        </div>
        {task.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
        )}
        <div className="flex items-center justify-between gap-3">
          <Badge className={cn('border-0 text-[10px]', prCfg.className)}>{prCfg.label}</Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {formatDate(task.dueDate)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          {task.assigneeIds?.length ? task.assigneeIds.map(shortId).join(', ') : 'Unassigned'}
          {task.storyPoints ? <Badge variant="secondary">{task.storyPoints} SP</Badge> : null}
        </div>
        {task.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {actions.map((item) => (
              <Button
                key={item.action}
                size="sm"
                variant={item.variant ?? 'default'}
                disabled={transitioning}
                onClick={() => onTransition(task.id, item.action)}
              >
                {transitioning ? 'Dang xu ly' : item.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
