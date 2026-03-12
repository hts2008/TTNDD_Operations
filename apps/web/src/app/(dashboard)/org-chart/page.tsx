'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface OrgNode {
  id: string;
  name: string;
  nodeType: string;
  positionTitle?: string;
  displayOrder: number;
  isActive: boolean;
  validFrom: string;
  validTo?: string;
  parentNodeId?: string;
  headMember?: {
    id: string;
    role: string;
    scoutName?: string;
    heroName?: string;
    user: { displayName?: string; avatarUrl?: string };
  };
  children: OrgNode[];
}

type NodeType = 'organization' | 'branch' | 'unit' | 'team' | 'position';

interface NodeFormData {
  name: string;
  nodeType: NodeType;
  parentNodeId?: string;
  positionTitle?: string;
  displayOrder?: number;
}

interface UnitMember {
  id: string;
  memberId: string;
  roleInUnit?: string;
  member?: { user?: { displayName?: string; avatarUrl?: string }; scoutName?: string };
}

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
}

interface ScopeInfo {
  userId: string;
  roles: string[];
  permissions: string[];
  scopeUnits: string[];
}

type TabKey = 'tree' | 'members' | 'availability' | 'scope';

const NODE_TYPES: { value: NodeType; label: string; emoji: string; color: string }[] = [
  { value: 'organization', label: 'Tổ chức', emoji: '🏛️', color: 'amber' },
  { value: 'branch', label: 'Chi nhánh', emoji: '🌿', color: 'emerald' },
  { value: 'unit', label: 'Đơn vị', emoji: '🛡️', color: 'blue' },
  { value: 'team', label: 'Đội/Nhóm', emoji: '👥', color: 'purple' },
  { value: 'position', label: 'Chức vụ', emoji: '🎖️', color: 'rose' },
];

const TYPE_COLORS: Record<string, string> = {
  organization: 'border-amber-500 bg-amber-950/30 hover:bg-amber-950/50',
  branch: 'border-emerald-500 bg-emerald-950/30 hover:bg-emerald-950/50',
  unit: 'border-blue-500 bg-blue-950/30 hover:bg-blue-950/50',
  team: 'border-purple-500 bg-purple-950/30 hover:bg-purple-950/50',
  position: 'border-rose-500 bg-rose-950/30 hover:bg-rose-950/50',
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  organization: 'bg-amber-500/20 text-amber-300',
  branch: 'bg-emerald-500/20 text-emerald-300',
  unit: 'bg-blue-500/20 text-blue-300',
  team: 'bg-purple-500/20 text-purple-300',
  position: 'bg-rose-500/20 text-rose-300',
};

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'tree', label: 'Sơ đồ', emoji: '🌳' },
  { key: 'members', label: 'Thành viên', emoji: '👥' },
  { key: 'availability', label: 'Lịch TNV', emoji: '📅' },
  { key: 'scope', label: 'Phân quyền', emoji: '🔐' },
];

// ═══════════════════════════════════════════════════════════
// Flatten tree for parent selector dropdown
// ═══════════════════════════════════════════════════════════

function flattenTree(nodes: OrgNode[], depth = 0): { node: OrgNode; depth: number }[] {
  const result: { node: OrgNode; depth: number }[] = [];
  for (const n of nodes) {
    result.push({ node: n, depth });
    if (n.children?.length) {
      result.push(...flattenTree(n.children, depth + 1));
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
// Node Card Component (recursive tree renderer)
// ═══════════════════════════════════════════════════════════

function NodeCard({
  node,
  depth = 0,
  onEdit,
  onDelete,
  onAddChild,
  onReparent,
  onViewMembers,
}: {
  node: OrgNode;
  depth?: number;
  onEdit: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onAddChild: (parentId: string) => void;
  onReparent: (node: OrgNode) => void;
  onViewMembers: (node: OrgNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const borderColor = TYPE_COLORS[node.nodeType] || 'border-zinc-600 bg-zinc-800/30';
  const typeInfo = NODE_TYPES.find((t) => t.value === node.nodeType);
  const isUnit = node.nodeType === 'unit' || node.nodeType === 'team';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`group relative border-2 rounded-xl px-4 py-3 min-w-[200px] max-w-[280px] transition-all duration-200 ${borderColor}`}
      >
        {/* Action buttons (visible on hover) */}
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
            className="w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white text-xs shadow-lg"
            title="Thêm node con"
          >
            +
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReparent(node);
            }}
            className="w-6 h-6 rounded-full bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center text-white text-xs shadow-lg"
            title="Di chuyển node (T-0052)"
          >
            ↗
          </button>
          {isUnit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewMembers(node);
              }}
              className="w-6 h-6 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white text-xs shadow-lg"
              title="Xem thành viên (T-0053)"
            >
              👥
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(node);
            }}
            className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white text-xs shadow-lg"
            title="Sửa"
          >
            ✎
          </button>
          {!hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node);
              }}
              className="w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white text-xs shadow-lg"
              title="Xóa"
            >
              ✕
            </button>
          )}
        </div>

        {/* Header: type badge + expand toggle */}
        <div
          className="flex items-center justify-between gap-2 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <span
            className={`text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded ${TYPE_BADGE_COLORS[node.nodeType] || 'bg-zinc-700 text-zinc-400'}`}
          >
            {typeInfo?.emoji} {node.nodeType}
          </span>
          {hasChildren && (
            <span className="text-zinc-500 text-xs">
              {expanded ? '▼' : '▶'} {node.children.length}
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-bold text-white text-sm mt-1.5 leading-tight">{node.name}</h3>
        {node.positionTitle && (
          <p className="text-[11px] text-zinc-400 mt-0.5">{node.positionTitle}</p>
        )}

        {/* Head Member avatar */}
        {node.headMember && (
          <div className="mt-2 flex items-center gap-2 bg-zinc-800/60 rounded-lg px-2 py-1.5">
            {node.headMember.user.avatarUrl ? (
              <img
                src={node.headMember.user.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full ring-1 ring-zinc-600"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-[10px] text-white font-bold ring-1 ring-zinc-600">
                {(node.headMember.user.displayName || node.headMember.scoutName || '?')[0]}
              </div>
            )}
            <span className="text-xs text-zinc-300 truncate">
              {node.headMember.user.displayName || node.headMember.scoutName || 'Chưa phân công'}
            </span>
          </div>
        )}
      </div>

      {/* Children connector lines */}
      {hasChildren && expanded && (
        <>
          <div className="w-px h-5 bg-zinc-600/60" />
          <div className="relative flex gap-6 flex-wrap justify-center">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-zinc-600/60"
                style={{ width: 'calc(100% - 4rem)' }}
              />
            )}
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-px h-5 bg-zinc-600/60" />
                <NodeCard
                  node={child}
                  depth={depth + 1}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                  onReparent={onReparent}
                  onViewMembers={onViewMembers}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Slide-Over Form (Create / Edit Node)
// ═══════════════════════════════════════════════════════════

function NodeFormPanel({
  mode,
  initial,
  flatNodes,
  onSubmit,
  onClose,
  submitting,
}: {
  mode: 'create' | 'edit';
  initial: NodeFormData & { id?: string };
  flatNodes: { node: OrgNode; depth: number }[];
  onSubmit: (data: NodeFormData) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<NodeFormData>({
    name: initial.name,
    nodeType: initial.nodeType,
    parentNodeId: initial.parentNodeId,
    positionTitle: initial.positionTitle,
    displayOrder: initial.displayOrder ?? 0,
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-700 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {mode === 'create' ? '➕ Tạo Node Mới' : '✏️ Sửa Node'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tên node *</label>
            <input
              type="text"
              id="node-name-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              placeholder="VD: Chi đoàn Ánh Sáng"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Loại node *</label>
            <div className="grid grid-cols-2 gap-2">
              {NODE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, nodeType: t.value })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    form.nodeType === t.value
                      ? `border-${t.color}-500 bg-${t.color}-950/40 text-${t.color}-300 ring-1 ring-${t.color}-500`
                      : 'border-zinc-600 bg-zinc-800 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Node cha</label>
            <select
              id="parent-node-select"
              value={form.parentNodeId || ''}
              onChange={(e) => setForm({ ...form, parentNodeId: e.target.value || undefined })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="">— Gốc (root) —</option>
              {flatNodes
                .filter((f) => f.node.id !== initial.id)
                .map((f) => (
                  <option key={f.node.id} value={f.node.id}>
                    {'  '.repeat(f.depth)}
                    {NODE_TYPES.find((t) => t.value === f.node.nodeType)?.emoji || '•'}{' '}
                    {f.node.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Chức danh</label>
            <input
              type="text"
              value={form.positionTitle || ''}
              onChange={(e) => setForm({ ...form, positionTitle: e.target.value || undefined })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              placeholder="VD: Trưởng đoàn, Phó đội..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Thứ tự hiển thị
            </label>
            <input
              type="number"
              value={form.displayOrder ?? 0}
              onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>
        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur border-t border-zinc-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Hủy
          </button>
          <button
            id="node-form-submit"
            onClick={() => onSubmit(form)}
            disabled={!form.name || submitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '⏳ Đang lưu...' : mode === 'create' ? '✅ Tạo' : '💾 Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Reparent Dialog (T-0052)
// ═══════════════════════════════════════════════════════════

function ReparentDialog({
  node,
  flatNodes,
  onConfirm,
  onClose,
  submitting,
}: {
  node: OrgNode;
  flatNodes: { node: OrgNode; depth: number }[];
  onConfirm: (newParentId: string | null) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [newParentId, setNewParentId] = useState<string>(node.parentNodeId || '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-2">↗️ Di chuyển Node</h3>
        <p className="text-zinc-400 text-sm mb-1">
          Node: <span className="text-white font-semibold">{node.name}</span>
        </p>
        <p className="text-zinc-500 text-xs mb-4">Chọn node cha mới (cycle-safe)</p>
        <select
          value={newParentId}
          onChange={(e) => setNewParentId(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none mb-5"
        >
          <option value="">— Gốc (root) —</option>
          {flatNodes
            .filter((f) => f.node.id !== node.id)
            .map((f) => (
              <option key={f.node.id} value={f.node.id}>
                {'  '.repeat(f.depth)}
                {NODE_TYPES.find((t) => t.value === f.node.nodeType)?.emoji || '•'} {f.node.name}
              </option>
            ))}
        </select>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onConfirm(newParentId || null)}
            disabled={submitting}
            className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium disabled:opacity-50 transition-colors"
          >
            {submitting ? '⏳...' : '↗️ Di chuyển'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Delete Confirmation Dialog
// ═══════════════════════════════════════════════════════════

function DeleteDialog({
  node,
  onConfirm,
  onCancel,
  deleting,
}: {
  node: OrgNode;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-2">🗑️ Xóa Node</h3>
        <p className="text-zinc-400 mb-1">Bạn có chắc muốn xóa node:</p>
        <p className="text-white font-semibold mb-4">
          &quot;{node.name}&quot; ({node.nodeType})
        </p>
        <p className="text-xs text-zinc-500 mb-5">⚠️ Chỉ có thể xóa node lá (không có node con).</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50 transition-colors"
          >
            {deleting ? '⏳ Đang xóa...' : '🗑️ Xóa'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Unit Members Panel (T-0053)
// ═══════════════════════════════════════════════════════════

function UnitMembersPanel({
  node,
  onClose,
  showToast,
}: {
  node: OrgNode;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [members, setMembers] = useState<UnitMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [roleInUnit, setRoleInUnit] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<UnitMember[]>(`/hrm/units/${node.id}/members`);
      setMembers(data);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [node.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleAssign = async () => {
    if (!memberId) return;
    try {
      setAssigning(true);
      await api.post(`/hrm/units/${node.id}/assign`, {
        memberId,
        roleInUnit: roleInUnit || undefined,
      });
      showToast('✅ Đã phân công thành viên', 'success');
      setMemberId('');
      setRoleInUnit('');
      await loadMembers();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi'}`, 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (mid: string) => {
    try {
      await api.post(`/hrm/units/${node.id}/remove`, { memberId: mid });
      showToast('🗑️ Đã gỡ thành viên', 'success');
      await loadMembers();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi'}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-900 border-l border-zinc-700 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">👥 Thành viên: {node.name}</h2>
            <p className="text-xs text-zinc-400">{node.nodeType} — T-0053</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">
            ✕
          </button>
        </div>
        {/* Assign form */}
        <div className="p-4 border-b border-zinc-700/50 bg-zinc-800/30">
          <p className="text-xs text-zinc-400 mb-2 font-medium uppercase tracking-wider">
            Phân công thành viên mới
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="Member ID"
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-violet-500 outline-none"
            />
            <input
              type="text"
              value={roleInUnit}
              onChange={(e) => setRoleInUnit(e.target.value)}
              placeholder="Vai trò (tùy chọn)"
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-violet-500 outline-none"
            />
            <button
              onClick={handleAssign}
              disabled={!memberId || assigning}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {assigning ? '⏳' : '➕'}
            </button>
          </div>
        </div>
        {/* Members list */}
        <div className="p-4 space-y-2">
          {loading && <p className="text-zinc-400 text-sm text-center py-8">Đang tải...</p>}
          {!loading && members.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">
              Chưa có thành viên nào trong đơn vị này
            </p>
          )}
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center text-white text-xs font-bold">
                {(m.member?.user?.displayName || m.member?.scoutName || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {m.member?.user?.displayName || m.member?.scoutName || m.memberId}
                </p>
                {m.roleInUnit && <p className="text-xs text-zinc-400">{m.roleInUnit}</p>}
              </div>
              <button
                onClick={() => handleRemove(m.memberId)}
                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-950/30 transition-colors"
              >
                Gỡ
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Volunteer Availability Tab (T-0054)
// ═══════════════════════════════════════════════════════════

function AvailabilityTab({
  showToast,
}: {
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: '',
    startTime: '08:00',
    endTime: '17:00',
    status: 'available',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadSlots = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<AvailabilitySlot[]>('/hrm/availability');
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleCreate = async () => {
    if (!form.date) return;
    try {
      setSaving(true);
      await api.post('/hrm/availability', form);
      showToast('✅ Đã thêm lịch khả dụng', 'success');
      setShowForm(false);
      setForm({ date: '', startTime: '08:00', endTime: '17:00', status: 'available', notes: '' });
      await loadSlots();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slotId: string) => {
    try {
      await api.delete(`/hrm/availability/${slotId}`);
      showToast('🗑️ Đã xóa slot', 'success');
      await loadSlots();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi'}`, 'error');
    }
  };

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    busy: 'bg-red-500/20 text-red-300 border-red-500/30',
    tentative: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          📅 Lịch Tình Nguyện Viên
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          {showForm ? '✕ Đóng' : '➕ Thêm slot'}
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Ngày *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Trạng thái</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
              >
                <option value="available">Khả dụng</option>
                <option value="busy">Bận</option>
                <option value="tentative">Chưa chắc</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Bắt đầu</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Kết thúc</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Ghi chú (tùy chọn)"
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-emerald-500 outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={!form.date || saving}
            className="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? '⏳ Đang lưu...' : '✅ Thêm Slot'}
          </button>
        </div>
      )}

      {loading && <p className="text-zinc-400 text-sm text-center py-8">Đang tải lịch...</p>}
      {!loading && slots.length === 0 && (
        <div className="bg-zinc-800/30 border border-zinc-700 border-dashed rounded-xl p-8 text-center">
          <p className="text-zinc-400">
            Chưa có lịch khả dụng nào. Nhấn &quot;Thêm slot&quot; để bắt đầu.
          </p>
        </div>
      )}
      {!loading && slots.length > 0 && (
        <div className="space-y-2">
          {slots.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3"
            >
              <div className="text-2xl">📅</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">
                  {new Date(s.date).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
                <p className="text-xs text-zinc-400">
                  {s.startTime} — {s.endTime} {s.notes && `· ${s.notes}`}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-lg border ${statusColors[s.status] || 'bg-zinc-700 text-zinc-300'}`}
              >
                {s.status}
              </span>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-950/30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Role-Scope Display (T-0055)
// ═══════════════════════════════════════════════════════════

function ScopeTab() {
  const [scope, setScope] = useState<ScopeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<ScopeInfo>('/hrm/scope-check');
        setScope(data);
      } catch {
        setScope(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return <p className="text-zinc-400 text-sm text-center py-8">Đang kiểm tra phân quyền...</p>;
  if (!scope)
    return <p className="text-zinc-500 text-center py-8">Không thể tải thông tin phân quyền</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        🔐 Phân Quyền Hiện Tại (T-0055)
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
          <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-3">Vai trò</h3>
          <div className="flex flex-wrap gap-2">
            {scope.roles.length > 0 ? (
              scope.roles.map((r) => (
                <span
                  key={r}
                  className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-1 rounded-lg"
                >
                  {r}
                </span>
              ))
            ) : (
              <span className="text-zinc-500 text-sm">Không có</span>
            )}
          </div>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
          <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-3">
            Quyền hạn
          </h3>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {scope.permissions.length > 0 ? (
              scope.permissions.map((p) => (
                <span
                  key={p}
                  className="bg-emerald-500/15 text-emerald-300 text-[11px] px-2 py-0.5 rounded"
                >
                  {p}
                </span>
              ))
            ) : (
              <span className="text-zinc-500 text-sm">Không có</span>
            )}
          </div>
        </div>
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
          <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-3">
            Phạm vi Đơn vị
          </h3>
          <div className="flex flex-wrap gap-2">
            {scope.scopeUnits.length > 0 ? (
              scope.scopeUnits.map((u) => (
                <span
                  key={u}
                  className="bg-violet-500/20 text-violet-300 text-xs px-2.5 py-1 rounded-lg"
                >
                  {u}
                </span>
              ))
            ) : (
              <span className="text-zinc-500 text-sm">Toàn bộ tổ chức</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Org Chart Page
// ═══════════════════════════════════════════════════════════

export default function OrgChartPage() {
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('tree');

  // Form states
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [formInitial, setFormInitial] = useState<NodeFormData & { id?: string }>({
    name: '',
    nodeType: 'unit',
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete / Reparent / Members dialogs
  const [deleteTarget, setDeleteTarget] = useState<OrgNode | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reparentTarget, setReparentTarget] = useState<OrgNode | null>(null);
  const [reparenting, setReparenting] = useState(false);
  const [membersTarget, setMembersTarget] = useState<OrgNode | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadTree = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<OrgNode[]>('/hrm/org-chart');
      setTree(data);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load org chart');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const flatNodes = flattenTree(tree);

  // ── Handlers ─────────────────────────────────

  const handleAddRoot = () => {
    setFormInitial({ name: '', nodeType: 'organization', parentNodeId: undefined });
    setFormMode('create');
  };
  const handleAddChild = (parentId: string) => {
    setFormInitial({ name: '', nodeType: 'unit', parentNodeId: parentId });
    setFormMode('create');
  };
  const handleEdit = (node: OrgNode) => {
    setFormInitial({
      id: node.id,
      name: node.name,
      nodeType: node.nodeType as NodeType,
      parentNodeId: node.parentNodeId,
      positionTitle: node.positionTitle,
      displayOrder: node.displayOrder,
    });
    setFormMode('edit');
  };

  const handleFormSubmit = async (data: NodeFormData) => {
    try {
      setSubmitting(true);
      if (formMode === 'create') {
        await api.post('/hrm/org-chart/nodes', data);
        showToast(`✅ Tạo node "${data.name}" thành công`);
      } else if (formMode === 'edit' && formInitial.id) {
        await api.put(`/hrm/org-chart/nodes/${formInitial.id}`, data);
        showToast(`✅ Cập nhật "${data.name}" thành công`);
      }
      setFormMode(null);
      await loadTree();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi khi lưu'}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/hrm/org-chart/nodes/${deleteTarget.id}`);
      showToast(`🗑️ Đã xóa "${deleteTarget.name}"`);
      setDeleteTarget(null);
      await loadTree();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Lỗi khi xóa'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // T-0052: Reparent handler
  const handleReparentConfirm = async (newParentId: string | null) => {
    if (!reparentTarget) return;
    try {
      setReparenting(true);
      await api.post(`/hrm/org-chart/nodes/${reparentTarget.id}/reparent`, {
        newParentId,
        displayOrder: reparentTarget.displayOrder,
      });
      showToast(`↗️ Đã di chuyển "${reparentTarget.name}"`);
      setReparentTarget(null);
      await loadTree();
    } catch (err: unknown) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Cycle detected hoặc lỗi'}`, 'error');
    } finally {
      setReparenting(false);
    }
  };

  // ── Stats & Filter ─────────────────────────────────
  const totalNodes = flatNodes.length;
  const typeCounts = flatNodes.reduce(
    (acc, { node }) => {
      acc[node.nodeType] = (acc[node.nodeType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const filterTree = (nodes: OrgNode[], query: string): OrgNode[] => {
    if (!query) return nodes;
    const q = query.toLowerCase();
    return nodes.reduce<OrgNode[]>((acc, node) => {
      const filteredChildren = filterTree(node.children || [], query);
      const matches =
        node.name.toLowerCase().includes(q) ||
        node.nodeType.toLowerCase().includes(q) ||
        node.positionTitle?.toLowerCase().includes(q);
      if (matches || filteredChildren.length > 0) acc.push({ ...node, children: filteredChildren });
      return acc;
    }, []);
  };

  const displayTree = filterTree(tree, searchQuery);

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🏛️</span> Sơ Đồ Tổ Chức
          </h1>
          <p className="text-zinc-400 mt-1">Quản lý cấu trúc Đoàn — Hàng / Đội / Nhóm / Chức vụ</p>
        </div>
        {activeTab === 'tree' && (
          <button
            id="add-root-node-btn"
            onClick={handleAddRoot}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center gap-2 transition-colors shadow-lg shadow-amber-900/30"
          >
            <span className="text-lg">➕</span> Thêm Node
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 bg-zinc-800/60 border border-zinc-700 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-amber-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: TREE ═══ */}
      {activeTab === 'tree' && (
        <>
          {/* Stats bar */}
          {totalNodes > 0 && (
            <div className="mb-6 flex flex-wrap gap-3">
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="text-zinc-400 text-sm">Tổng:</span>
                <span className="text-white font-bold">{totalNodes}</span>
              </div>
              {NODE_TYPES.map((t) =>
                typeCounts[t.value] ? (
                  <div
                    key={t.value}
                    className={`rounded-xl px-3 py-2 flex items-center gap-1.5 text-sm ${TYPE_BADGE_COLORS[t.value]} border border-transparent`}
                  >
                    {t.emoji} {typeCounts[t.value]}
                  </div>
                ) : null,
              )}
            </div>
          )}

          {/* Search */}
          {totalNodes > 0 && (
            <div className="mb-6">
              <input
                type="text"
                id="org-chart-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Tìm kiếm node theo tên, loại..."
                className="w-full max-w-md bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto" />
                <p className="text-zinc-400 mt-3">Đang tải sơ đồ tổ chức...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-950/30 border border-red-800 rounded-xl p-4 text-red-300 flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-medium">Lỗi tải dữ liệu</p>
                <p className="text-sm text-red-400 mt-1">{error}</p>
                <button
                  onClick={loadTree}
                  className="mt-2 text-sm text-red-300 underline hover:text-red-200"
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}

          {!loading && !error && tree.length === 0 && (
            <div className="bg-zinc-800/30 border border-zinc-700 border-dashed rounded-2xl p-12 text-center">
              <div className="text-5xl mb-4">🏛️</div>
              <p className="text-zinc-300 text-lg font-medium">Chưa có sơ đồ tổ chức</p>
              <p className="text-zinc-500 text-sm mt-2 mb-6">
                Bắt đầu bằng cách tạo node gốc (Tổ chức) cho đoàn.
              </p>
              <button
                onClick={handleAddRoot}
                className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
              >
                ➕ Tạo Node Đầu Tiên
              </button>
            </div>
          )}

          {!loading && !error && displayTree.length > 0 && (
            <div className="overflow-auto bg-zinc-900/40 border border-zinc-700/50 rounded-2xl p-8">
              <div className="flex flex-col items-center gap-3 min-w-max">
                {displayTree.map((root) => (
                  <NodeCard
                    key={root.id}
                    node={root}
                    onEdit={handleEdit}
                    onDelete={setDeleteTarget}
                    onAddChild={handleAddChild}
                    onReparent={setReparentTarget}
                    onViewMembers={setMembersTarget}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && !error && searchQuery && displayTree.length === 0 && tree.length > 0 && (
            <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-8 text-center">
              <p className="text-zinc-400">
                Không tìm thấy node nào phù hợp với &quot;{searchQuery}&quot;
              </p>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-400">
            {NODE_TYPES.map((t) => (
              <div key={t.value} className="flex items-center gap-1.5">
                <div
                  className={`w-3 h-3 rounded border-2 border-${t.color}-500 bg-${t.color}-950/30`}
                />
                {t.emoji} {t.label}
              </div>
            ))}
            <div className="text-zinc-600 ml-2">|</div>
            <div className="text-zinc-500">
              Hover → ➕ thêm con, ↗ di chuyển, 👥 thành viên, ✎ sửa, ✕ xóa
            </div>
          </div>
        </>
      )}

      {/* ═══ TAB: MEMBERS (T-0053 quick view) ═══ */}
      {activeTab === 'members' && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            👥 Thành Viên theo Đơn Vị
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Chọn đơn vị/đội từ sơ đồ để xem thành viên. Hoặc hover vào node và nhấn 👥.
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {flatNodes
              .filter(({ node }) => node.nodeType === 'unit' || node.nodeType === 'team')
              .map(({ node }) => (
                <button
                  key={node.id}
                  onClick={() => setMembersTarget(node)}
                  className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-left hover:border-violet-500/50 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${TYPE_BADGE_COLORS[node.nodeType]}`}
                    >
                      {NODE_TYPES.find((t) => t.value === node.nodeType)?.emoji} {node.nodeType}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                    {node.name}
                  </h3>
                  {node.positionTitle && (
                    <p className="text-xs text-zinc-400">{node.positionTitle}</p>
                  )}
                </button>
              ))}
            {flatNodes.filter(({ node }) => node.nodeType === 'unit' || node.nodeType === 'team')
              .length === 0 && (
              <p className="text-zinc-500 col-span-full text-center py-8">
                Chưa có đơn vị/đội nào trong sơ đồ
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB: AVAILABILITY (T-0054) ═══ */}
      {activeTab === 'availability' && <AvailabilityTab showToast={showToast} />}

      {/* ═══ TAB: SCOPE (T-0055) ═══ */}
      {activeTab === 'scope' && <ScopeTab />}

      {/* ── Modals ──────────────────────────────── */}
      {formMode && (
        <NodeFormPanel
          mode={formMode}
          initial={formInitial}
          flatNodes={flatNodes}
          onSubmit={handleFormSubmit}
          onClose={() => setFormMode(null)}
          submitting={submitting}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          node={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
      {reparentTarget && (
        <ReparentDialog
          node={reparentTarget}
          flatNodes={flatNodes}
          onConfirm={handleReparentConfirm}
          onClose={() => setReparentTarget(null)}
          submitting={reparenting}
        />
      )}
      {membersTarget && (
        <UnitMembersPanel
          node={membersTarget}
          onClose={() => setMembersTarget(null)}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 border border-emerald-700 text-emerald-200'
              : 'bg-red-900/90 border border-red-700 text-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
