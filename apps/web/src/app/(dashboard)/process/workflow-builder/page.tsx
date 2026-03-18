'use client';

import React, { useCallback, useRef, useState, useMemo, type DragEvent } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Play,
  Save,
  Plus,
  Trash2,
  Settings,
  CheckCircle2,
  Bell,
  GitBranch,
  Clock,
  ArrowRight,
  Zap,
  History,
  ChevronLeft,
  RotateCcw,
} from 'lucide-react';

// ══════════════════════════════════════════════
// Types (mirrors backend T-1106 types)
// ══════════════════════════════════════════════

type WorkflowNodeType =
  | 'start'
  | 'end'
  | 'approval'
  | 'task'
  | 'notification'
  | 'condition'
  | 'delay';

interface NodeData extends Record<string, unknown> {
  label: string;
  type: WorkflowNodeType;
  assigneeRole?: string;
  description?: string;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
  delayMinutes?: number;
  notificationTemplate?: string;
  notificationChannel?: string;
}

// ══════════════════════════════════════════════
// Custom Nodes
// ══════════════════════════════════════════════

const NODE_STYLES: Record<
  WorkflowNodeType,
  { bg: string; border: string; icon: React.ReactNode; label: string }
> = {
  start: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/60',
    icon: <Play className="w-4 h-4 text-emerald-400" />,
    label: 'Bắt đầu',
  },
  end: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/60',
    icon: <CheckCircle2 className="w-4 h-4 text-red-400" />,
    label: 'Kết thúc',
  },
  approval: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/60',
    icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />,
    label: 'Phê duyệt',
  },
  task: {
    bg: 'bg-violet-500/20',
    border: 'border-violet-500/60',
    icon: <ArrowRight className="w-4 h-4 text-violet-400" />,
    label: 'Tác vụ',
  },
  notification: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/60',
    icon: <Bell className="w-4 h-4 text-amber-400" />,
    label: 'Thông báo',
  },
  condition: {
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/60',
    icon: <GitBranch className="w-4 h-4 text-cyan-400" />,
    label: 'Điều kiện',
  },
  delay: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/60',
    icon: <Clock className="w-4 h-4 text-orange-400" />,
    label: 'Chờ',
  },
};

function WorkflowNodeComponent({ data, selected }: NodeProps<Node<NodeData>>) {
  const nodeType = (data.type || 'task') as WorkflowNodeType;
  const style = NODE_STYLES[nodeType] ?? NODE_STYLES.task;
  const isCondition = nodeType === 'condition';
  const isStart = nodeType === 'start';
  const isEnd = nodeType === 'end';

  return (
    <div
      className={`
        relative px-4 py-3 rounded-xl border-2 min-w-[160px] max-w-[220px] shadow-lg backdrop-blur-sm
        transition-all duration-200
        ${style.bg} ${style.border}
        ${selected ? 'ring-2 ring-white/40 scale-105' : 'hover:scale-[1.02]'}
      `}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-white/50 !border-2 !border-white/80"
        />
      )}

      <div className="flex items-center gap-2 mb-1">
        <div className="p-1 rounded-md bg-black/20">{style.icon}</div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">
          {style.label}
        </span>
      </div>

      <div className="text-sm font-semibold text-white/90 truncate">
        {String(data.label || 'Untitled')}
      </div>

      {data.description && (
        <div className="text-[11px] text-white/40 mt-1 truncate">{String(data.description)}</div>
      )}

      {data.assigneeRole && (
        <div className="text-[10px] text-white/30 mt-1">👤 {String(data.assigneeRole)}</div>
      )}

      {!isEnd && !isCondition && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-white/50 !border-2 !border-white/80"
        />
      )}

      {isCondition && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-emerald-300 !left-[30%]"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !bg-red-400 !border-2 !border-red-300 !left-[70%]"
          />
          <div className="flex justify-between mt-2 text-[9px]">
            <span className="text-emerald-400">✓ True</span>
            <span className="text-red-400">✗ False</span>
          </div>
        </>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

// ══════════════════════════════════════════════
// Sidebar — Drag-n-Drop Palette
// ══════════════════════════════════════════════

const PALETTE_ITEMS: { type: WorkflowNodeType; label: string }[] = [
  { type: 'start', label: 'Bắt đầu' },
  { type: 'approval', label: 'Phê duyệt' },
  { type: 'task', label: 'Tác vụ' },
  { type: 'notification', label: 'Thông báo' },
  { type: 'condition', label: 'Điều kiện' },
  { type: 'delay', label: 'Chờ' },
  { type: 'end', label: 'Kết thúc' },
];

function Sidebar() {
  const onDragStart = (event: DragEvent, nodeType: WorkflowNodeType) => {
    event.dataTransfer.setData('application/workflow-node', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
        Kéo thả thêm bước
      </div>
      {PALETTE_ITEMS.map((item) => {
        const style = NODE_STYLES[item.type];
        return (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            className={`
              flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-grab border
              ${style.bg} ${style.border}
              hover:scale-[1.02] active:scale-95 transition-all
            `}
          >
            {style.icon}
            <span className="text-sm text-white/80">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════
// Node Config Panel
// ══════════════════════════════════════════════

function NodeConfigPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
}: {
  node: Node<NodeData>;
  onUpdate: (id: string, data: Partial<NodeData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const nodeData = node.data;
  const nodeType = (nodeData.type || 'task') as WorkflowNodeType;

  return (
    <div className="absolute right-4 top-4 w-72 bg-[hsl(var(--card))] border border-white/10 rounded-xl shadow-2xl p-4 z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white/80">⚙️ Cấu hình</h3>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xs">
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-white/50 block mb-1">Tên bước</label>
          <input
            type="text"
            value={String(nodeData.label || '')}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        <div>
          <label className="text-[11px] text-white/50 block mb-1">Mô tả</label>
          <textarea
            value={String(nodeData.description || '')}
            onChange={(e) => onUpdate(node.id, { description: e.target.value })}
            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            rows={2}
          />
        </div>

        {(nodeType === 'approval' || nodeType === 'task') && (
          <div>
            <label className="text-[11px] text-white/50 block mb-1">Vai trò phụ trách</label>
            <select
              value={String(nodeData.assigneeRole || '')}
              onChange={(e) => onUpdate(node.id, { assigneeRole: e.target.value })}
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none"
            >
              <option value="">-- Chọn vai trò --</option>
              <option value="admin">Quản trị</option>
              <option value="leader">Trưởng đơn vị</option>
              <option value="member">Đoàn sinh</option>
              <option value="volunteer">Tình nguyện viên</option>
            </select>
          </div>
        )}

        {nodeType === 'condition' && (
          <>
            <div>
              <label className="text-[11px] text-white/50 block mb-1">Trường điều kiện</label>
              <input
                type="text"
                value={String(nodeData.conditionField || '')}
                onChange={(e) => onUpdate(node.id, { conditionField: e.target.value })}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none"
                placeholder="e.g. status"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={String(nodeData.conditionOperator || '==')}
                onChange={(e) => onUpdate(node.id, { conditionOperator: e.target.value })}
                className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none"
              >
                <option value="==">==</option>
                <option value="!=">!=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value="contains">contains</option>
              </select>
              <input
                type="text"
                value={String(nodeData.conditionValue || '')}
                onChange={(e) => onUpdate(node.id, { conditionValue: e.target.value })}
                className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none"
                placeholder="Value"
              />
            </div>
          </>
        )}

        {nodeType === 'delay' && (
          <div>
            <label className="text-[11px] text-white/50 block mb-1">Thời gian chờ (phút)</label>
            <input
              type="number"
              value={Number(nodeData.delayMinutes || 0)}
              onChange={(e) => onUpdate(node.id, { delayMinutes: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none"
              min={1}
            />
          </div>
        )}

        {nodeType === 'notification' && (
          <>
            <div>
              <label className="text-[11px] text-white/50 block mb-1">Mẫu thông báo</label>
              <input
                type="text"
                value={String(nodeData.notificationTemplate || '')}
                onChange={(e) => onUpdate(node.id, { notificationTemplate: e.target.value })}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none"
                placeholder="Template name"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/50 block mb-1">Kênh gửi</label>
              <select
                value={String(nodeData.notificationChannel || 'in_app')}
                onChange={(e) => onUpdate(node.id, { notificationChannel: e.target.value })}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none"
              >
                <option value="in_app">In-app</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </>
        )}

        <div className="pt-2 border-t border-white/10">
          <button
            onClick={() => onDelete(node.id)}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xóa bước này
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// Main Builder Page
// ══════════════════════════════════════════════

const DEFAULT_NODES: Node<NodeData>[] = [
  {
    id: 'start-1',
    type: 'workflowNode',
    position: { x: 250, y: 50 },
    data: { label: 'Bắt đầu', type: 'start' },
  },
  {
    id: 'end-1',
    type: 'workflowNode',
    position: { x: 250, y: 400 },
    data: { label: 'Kết thúc', type: 'end' },
  },
];

const DEFAULT_EDGES: Edge[] = [];

export default function WorkflowBuilderPage() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [saving, setSaving] = useState(false);
  const [definitionName, setDefinitionName] = useState('Quy trình mới');

  const nodeCount = useMemo(() => nodes.length, [nodes]);
  const edgeCount = useMemo(() => edges.length, [edges]);

  // ── Connection Handler ──
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.3)' },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  // ── Drag & Drop Handler ──
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/workflow-node') as WorkflowNodeType;
      if (!nodeType || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 80,
        y: event.clientY - bounds.top - 20,
      };

      const style = NODE_STYLES[nodeType];
      const newNode: Node<NodeData> = {
        id: `${nodeType}-${Date.now()}`,
        type: 'workflowNode',
        position,
        data: {
          label: style.label,
          type: nodeType,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes],
  );

  // ── Node Selection ──
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
  }, []);

  // ── Node Update ──
  const handleNodeUpdate = useCallback(
    (id: string, data: Partial<NodeData>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)));
      setSelectedNode((prev) =>
        prev?.id === id ? { ...prev, data: { ...prev.data, ...data } } : prev,
      );
    },
    [setNodes],
  );

  // ── Node Delete ──
  const handleNodeDelete = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedNode(null);
    },
    [setNodes, setEdges],
  );

  // ── Save Handler (POST to API) ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.type,
          label: n.data.label,
          position: n.position,
          data: {
            assigneeRole: n.data.assigneeRole,
            description: n.data.description,
            conditionField: n.data.conditionField,
            conditionOperator: n.data.conditionOperator,
            conditionValue: n.data.conditionValue,
            delayMinutes: n.data.delayMinutes,
            notificationTemplate: n.data.notificationTemplate,
            notificationChannel: n.data.notificationChannel,
          },
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: typeof e.label === 'string' ? e.label : undefined,
          sourceHandle: e.sourceHandle,
        })),
      };

      // TODO: Replace with actual API call when definitionId is available
      console.log('Saving workflow graph:', JSON.stringify(payload, null, 2));

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      alert('✅ Đã lưu quy trình thành công!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('❌ Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }, [nodes, edges]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ quy trình?')) return;
    setNodes(DEFAULT_NODES);
    setEdges(DEFAULT_EDGES);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[hsl(var(--background))]">
      {/* ── Left Sidebar: Palette ── */}
      <div className="w-56 border-r border-white/10 p-4 flex flex-col gap-4 bg-[hsl(var(--card))]">
        <a
          href="/process"
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Quay lại
        </a>

        <div>
          <label className="text-[11px] text-white/40 block mb-1">Tên quy trình</label>
          <input
            type="text"
            value={definitionName}
            onChange={(e) => setDefinitionName(e.target.value)}
            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        <Sidebar />

        <div className="mt-auto space-y-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-medium transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Lưu quy trình'}
          </button>

          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Đặt lại
          </button>
        </div>
      </div>

      {/* ── Main Canvas ── */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.3)' },
          }}
          style={{ background: 'transparent' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(255,255,255,0.06)"
          />
          <Controls className="!bg-[hsl(var(--card))] !border-white/10 !rounded-xl [&_button]:!bg-white/5 [&_button]:!border-white/10 [&_button]:!text-white/60" />

          {/* ── Top Bar Stats ── */}
          <Panel position="top-center">
            <div className="flex items-center gap-4 px-5 py-2.5 bg-[hsl(var(--card))] border border-white/10 rounded-xl shadow-xl">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-white/50">{definitionName}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="text-xs text-white/40">
                {nodeCount} bước · {edgeCount} kết nối
              </div>
            </div>
          </Panel>
        </ReactFlow>

        {/* ── Config Panel ── */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onDelete={handleNodeDelete}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
