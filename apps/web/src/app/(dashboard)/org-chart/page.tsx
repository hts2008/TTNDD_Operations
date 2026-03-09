'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface OrgNode {
  id: string;
  name: string;
  nodeType: string;
  positionTitle?: string;
  displayOrder: number;
  isActive: boolean;
  validFrom: string;
  validTo?: string;
  headMember?: {
    id: string;
    role: string;
    scoutName?: string;
    heroName?: string;
    user: { displayName?: string; avatarUrl?: string };
  };
  children: OrgNode[];
}

function NodeCard({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const colors: Record<string, string> = {
    organization: 'border-amber-500 bg-amber-950/30',
    branch: 'border-emerald-500 bg-emerald-950/30',
    unit: 'border-blue-500 bg-blue-950/30',
    team: 'border-purple-500 bg-purple-950/30',
    position: 'border-rose-500 bg-rose-950/30',
  };
  const borderColor = colors[node.nodeType] || 'border-zinc-600 bg-zinc-800/30';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`border-2 rounded-xl px-4 py-3 min-w-[180px] cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${borderColor}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
            {node.nodeType}
          </span>
          {hasChildren && (
            <span className="text-zinc-500 text-xs">
              {expanded ? '▼' : '▶'} {node.children.length}
            </span>
          )}
        </div>
        <h3 className="font-bold text-white text-sm mt-1">{node.name}</h3>
        {node.positionTitle && <p className="text-[11px] text-zinc-400">{node.positionTitle}</p>}
        {node.headMember && (
          <div className="mt-2 flex items-center gap-2 bg-zinc-800/50 rounded-lg px-2 py-1">
            {node.headMember.user.avatarUrl ? (
              <img src={node.headMember.user.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-zinc-600 flex items-center justify-center text-[9px] text-white font-bold">
                {(node.headMember.user.displayName || node.headMember.scoutName || '?')[0]}
              </div>
            )}
            <span className="text-xs text-zinc-300 truncate">
              {node.headMember.user.displayName || node.headMember.scoutName || 'Unassigned'}
            </span>
          </div>
        )}
      </div>

      {/* Children connector */}
      {hasChildren && expanded && (
        <>
          <div className="w-px h-4 bg-zinc-600" />
          <div className="flex gap-4 flex-wrap justify-center">
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-px h-4 bg-zinc-600" />
                <NodeCard node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/hrm/org-chart')
      .then((data) => setTree(data as OrgNode[]))
      .catch((err) => setError(err.message || 'Failed to load org chart'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🏛️</span>
          Organization Chart
        </h1>
        <p className="text-zinc-400 mt-1">Sơ đồ tổ chức — Cấu trúc Hàng/Đội/Nhóm</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-950/30 border border-red-800 rounded-xl p-4 text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && tree.length === 0 && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-8 text-center">
          <p className="text-zinc-400 text-lg">No org chart nodes yet.</p>
          <p className="text-zinc-500 text-sm mt-2">
            Use the API to create the organization structure.
          </p>
        </div>
      )}

      {!loading && !error && tree.length > 0 && (
        <div className="overflow-auto bg-zinc-900/50 border border-zinc-700 rounded-2xl p-8">
          <div className="flex flex-col items-center gap-2 min-w-max">
            {tree.map((root) => (
              <NodeCard key={root.id} node={root} />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-amber-500 bg-amber-950/30" />
          organization
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-emerald-500 bg-emerald-950/30" />
          branch
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-950/30" />
          unit
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-purple-500 bg-purple-950/30" />
          team
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-rose-500 bg-rose-950/30" />
          position
        </div>
      </div>
    </div>
  );
}
