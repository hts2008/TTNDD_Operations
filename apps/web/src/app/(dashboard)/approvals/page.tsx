'use client';

import { useState } from 'react';

// ── Types ──
interface ApprovalStep {
  name: string;
  type: 'sequential' | 'parallel' | 'conditional';
  signerRole?: string;
  signerUserId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'skipped';
  decidedBy?: string;
  decidedAt?: string;
  notes?: string;
}

interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  currentStep: number;
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  definition: { name: string };
  stepResults: ApprovalStep[];
}

// ── Mock Data ──
const MOCK_REQUESTS: ApprovalRequest[] = [
  {
    id: '1', entityType: 'budget', entityId: 'b-001', status: 'in_progress', currentStep: 1,
    requestedBy: 'Nguyễn Văn A', requestedAt: '2025-03-10T08:00:00Z', definition: { name: 'Duyệt ngân sách trại hè' },
    stepResults: [
      { name: 'Trưởng Đơn Vị', type: 'sequential', status: 'approved', decidedBy: 'Trần B', decidedAt: '2025-03-10T10:00:00Z' },
      { name: 'Ban Quản Trị', type: 'sequential', status: 'pending' },
      { name: 'Hiệu Trưởng', type: 'sequential', status: 'pending' },
    ],
  },
  {
    id: '2', entityType: 'event', entityId: 'e-012', status: 'approved', currentStep: 2,
    requestedBy: 'Lê Thị C', requestedAt: '2025-03-08T14:30:00Z', completedAt: '2025-03-09T16:00:00Z',
    definition: { name: 'Duyệt kế hoạch sự kiện' },
    stepResults: [
      { name: 'Trưởng Ban Hoạt Động', type: 'sequential', status: 'approved', decidedBy: 'Phạm D', decidedAt: '2025-03-08T16:00:00Z' },
      { name: 'Ban Cố Vấn', type: 'parallel', status: 'approved', decidedBy: 'Hội đồng', decidedAt: '2025-03-09T10:00:00Z' },
      { name: 'BGĐ', type: 'sequential', status: 'approved', decidedBy: 'Trần E', decidedAt: '2025-03-09T16:00:00Z' },
    ],
  },
  {
    id: '3', entityType: 'ticket', entityId: 't-045', status: 'rejected', currentStep: 1,
    requestedBy: 'Hoàng F', requestedAt: '2025-03-07T09:00:00Z', completedAt: '2025-03-07T14:00:00Z',
    definition: { name: 'Duyệt yêu cầu mua sắm' },
    stepResults: [
      { name: 'Kế toán trưởng', type: 'sequential', status: 'approved', decidedBy: 'Mai G', decidedAt: '2025-03-07T11:00:00Z' },
      { name: 'Giám đốc', type: 'sequential', status: 'rejected', decidedBy: 'Nguyễn H', decidedAt: '2025-03-07T14:00:00Z', notes: 'Vượt ngân sách quý' },
    ],
  },
  {
    id: '4', entityType: 'plan', entityId: 'p-003', status: 'pending', currentStep: 0,
    requestedBy: 'Đỗ I', requestedAt: '2025-03-11T07:00:00Z', definition: { name: 'Duyệt kế hoạch huấn luyện' },
    stepResults: [
      { name: 'Phó Trưởng Đoàn', type: 'sequential', status: 'pending' },
      { name: 'Trưởng Đoàn', type: 'sequential', status: 'pending' },
    ],
  },
];

// ── Status Helpers ──
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ xử lý', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  in_progress: { label: 'Đang xử lý', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  approved: { label: 'Đã duyệt', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  rejected: { label: 'Từ chối', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  cancelled: { label: 'Đã hủy', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800' },
};

const entityLabels: Record<string, string> = {
  budget: '💰 Ngân sách', event: '📅 Sự kiện', ticket: '🎫 Yêu cầu', plan: '📋 Kế hoạch',
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.color} ${config.bg}`}>
      {config.label}
    </span>
  );
}

// ── Step Progress Widget (T-0155 core component) ──
function ApprovalStepProgress({ steps, currentStep }: { steps: ApprovalStep[]; currentStep: number }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, idx) => {
        const isActive = idx === currentStep && step.status === 'pending';
        const stepIcon = step.status === 'approved' ? '✅' :
          step.status === 'rejected' ? '❌' :
          step.status === 'skipped' ? '⏭️' :
          isActive ? '🔄' : '⏳';

        return (
          <div key={idx} className="flex items-center gap-1">
            <div className={`relative group flex flex-col items-center`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm 
                ${step.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                  step.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' :
                  isActive ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400' :
                  'bg-gray-100 dark:bg-gray-800'}`}>
                {stepIcon}
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-10 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                <p className="font-semibold">{step.name}</p>
                {step.decidedBy && <p>Bởi: {step.decidedBy}</p>}
                {step.notes && <p className="text-amber-300">📝 {step.notes}</p>}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-6 h-0.5 ${
                step.status === 'approved' ? 'bg-emerald-400' :
                step.status === 'rejected' ? 'bg-red-400' :
                'bg-gray-300 dark:bg-gray-600'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Approval Action Panel (T-0155 interactive widget) ──
function ApprovalActions({ request, onDecide }: {
  request: ApprovalRequest;
  onDecide: (requestId: string, decision: 'approved' | 'rejected', notes?: string) => void;
}) {
  const [notes, setNotes] = useState('');
  const [showReject, setShowReject] = useState(false);

  if (request.status !== 'in_progress' && request.status !== 'pending') {
    return null;
  }

  const currentStepName = request.stepResults[request.currentStep]?.name ?? 'Bước hiện tại';

  return (
    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
      <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
        📋 Đang chờ: <strong>{currentStepName}</strong>
      </p>
      {showReject ? (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Lý do từ chối..."
            className="w-full text-sm p-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onDecide(request.id, 'rejected', notes); setShowReject(false); }}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
            >
              Xác nhận từ chối
            </button>
            <button
              onClick={() => setShowReject(false)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => onDecide(request.id, 'approved')}
            className="px-4 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 transition-colors font-medium"
          >
            ✅ Phê duyệt
          </button>
          <button
            onClick={() => setShowReject(true)}
            className="px-4 py-1.5 bg-red-50 text-red-700 text-sm rounded-md hover:bg-red-100 transition-colors border border-red-200 font-medium"
          >
            ❌ Từ chối
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──
export default function ApprovalsPage() {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? MOCK_REQUESTS : MOCK_REQUESTS.filter(r => r.status === filter);

  const stats = {
    total: MOCK_REQUESTS.length,
    pending: MOCK_REQUESTS.filter(r => r.status === 'pending' || r.status === 'in_progress').length,
    approved: MOCK_REQUESTS.filter(r => r.status === 'approved').length,
    rejected: MOCK_REQUESTS.filter(r => r.status === 'rejected').length,
  };

  const handleDecide = (requestId: string, decision: 'approved' | 'rejected', notes?: string) => {
    console.log(`Decision: ${decision} for ${requestId}`, notes ? `Notes: ${notes}` : '');
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Phê duyệt</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và xử lý các yêu cầu phê duyệt</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium">
          + Tạo mẫu phê duyệt
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Tổng yêu cầu', value: stats.total, icon: '📊', color: 'bg-white dark:bg-gray-800' },
          { label: 'Chờ xử lý', value: stats.pending, icon: '⏳', color: 'bg-amber-50 dark:bg-amber-900/10' },
          { label: 'Đã duyệt', value: stats.approved, icon: '✅', color: 'bg-emerald-50 dark:bg-emerald-900/10' },
          { label: 'Từ chối', value: stats.rejected, icon: '❌', color: 'bg-red-50 dark:bg-red-900/10' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4 border border-gray-200 dark:border-gray-700`}>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span>{stat.icon}</span>
              <span>{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {['all', 'pending', 'in_progress', 'approved', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === f
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {f === 'all' ? 'Tất cả' : statusConfig[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Request Cards */}
      <div className="space-y-4">
        {filtered.map((req) => (
          <div key={req.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{req.definition.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span>{entityLabels[req.entityType] ?? req.entityType}</span>
                  <span>•</span>
                  <span>Bởi: {req.requestedBy}</span>
                  <span>•</span>
                  <span>{new Date(req.requestedAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
              <StatusBadge status={req.status} />
            </div>

            {/* Step Progress Widget */}
            <div className="mb-2">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Tiến trình phê duyệt</p>
              <ApprovalStepProgress steps={req.stepResults} currentStep={req.currentStep} />
            </div>

            {/* Step details */}
            <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">
              {req.stepResults.map((step, idx) => (
                <span key={idx} className={`px-2 py-1 rounded ${
                  step.status === 'approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20' :
                  step.status === 'rejected' ? 'bg-red-50 text-red-700 dark:bg-red-900/20' :
                  'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {step.name}: {step.status === 'approved' ? '✅' : step.status === 'rejected' ? '❌' : '⏳'}
                  {step.decidedBy && ` (${step.decidedBy})`}
                </span>
              ))}
            </div>

            {/* Action Panel */}
            <ApprovalActions request={req} onDecide={handleDecide} />
          </div>
        ))}
      </div>
    </div>
  );
}
