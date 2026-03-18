'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { CheckCircle2, XCircle, Clock, ArrowRight, FilePlus, Filter } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  type: string;
  title: string;
  requester: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  description?: string;
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('pending');
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const data = await api.get<ApprovalRequest[]>('/approvals/requests');
      setRequests(data);
    } catch {
      setRequests([
        {
          id: '1',
          type: 'leave',
          title: 'Xin nghỉ phép - Nguyễn Văn A',
          requester: 'Nguyễn Văn A',
          status: 'pending',
          createdAt: '2026-03-18',
          description: 'Xin nghỉ phép 2 ngày để tham gia hoạt động gia đình',
        },
        {
          id: '2',
          type: 'budget',
          title: 'Kinh phí trại hè 2026',
          requester: 'Trần Thị B',
          status: 'pending',
          createdAt: '2026-03-17',
          description: 'Đề xuất kinh phí ₫5.000.000 cho trại hè tháng 6',
        },
        {
          id: '3',
          type: 'camp_consent',
          title: 'Phê duyệt trại Camp Alpha',
          requester: 'Lê Văn C',
          status: 'approved',
          createdAt: '2026-03-15',
        },
        {
          id: '4',
          type: 'expense',
          title: 'Chi tiêu văn phòng phẩm',
          requester: 'Phạm Thị D',
          status: 'rejected',
          createdAt: '2026-03-14',
          description: 'Mua dụng cụ sinh hoạt ₫1.200.000',
        },
        {
          id: '5',
          type: 'escalation',
          title: 'Chuyển escalation sự cố #42',
          requester: 'Hệ thống',
          status: 'pending',
          createdAt: '2026-03-18',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    try {
      await api.post(`/approvals/requests/${id}/${action}`, {});
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r,
        ),
      );
    } catch {
      // handle error
    }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
      pending: {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: 'Chờ duyệt',
        cls: 'bg-amber-100 text-amber-700',
      },
      approved: {
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        label: 'Đã duyệt',
        cls: 'bg-emerald-100 text-emerald-700',
      },
      rejected: {
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: 'Từ chối',
        cls: 'bg-red-100 text-red-700',
      },
      cancelled: {
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: 'Đã hủy',
        cls: 'bg-gray-100 text-gray-600',
      },
    };
    const v = map[s] || map.pending;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${v.cls}`}
      >
        {v.icon}
        {v.label}
      </span>
    );
  };

  const filtered = requests.filter((r) => tab === 'all' || r.status === tab);

  const tabs = [
    {
      key: 'pending',
      label: 'Chờ duyệt',
      count: requests.filter((r) => r.status === 'pending').length,
    },
    {
      key: 'approved',
      label: 'Đã duyệt',
      count: requests.filter((r) => r.status === 'approved').length,
    },
    {
      key: 'rejected',
      label: 'Từ chối',
      count: requests.filter((r) => r.status === 'rejected').length,
    },
    { key: 'all', label: 'Tất cả', count: requests.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phê duyệt</h1>
          <p className="text-muted-foreground">Quản lý các yêu cầu phê duyệt trong tổ chức</p>
        </div>
        <Button className="gap-2">
          <FilePlus className="h-4 w-4" />
          Tạo yêu cầu
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Không có yêu cầu nào</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{r.title}</h3>
                    {statusBadge(r.status)}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Người yêu cầu: {r.requester}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  {r.description && (
                    <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                  )}
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleAction(r.id, 'reject')}
                    >
                      Từ chối
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAction(r.id, 'approve')}
                    >
                      Phê duyệt
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
