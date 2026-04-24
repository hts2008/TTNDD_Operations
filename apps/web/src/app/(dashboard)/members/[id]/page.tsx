'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Zap,
  Award,
  Shield,
  Loader2,
  AlertCircle,
  Clock,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface MemberDetail {
  id: string;
  memberCode: string | null;
  scoutName: string | null;
  heroName: string | null;
  status: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    email: string | null;
    avatarUrl: string | null;
    phone: string | null;
  };
  branch: { id: string; name: string; code: string } | null;
  unit: { id: string; name: string } | null;
  profile: {
    fullName: string;
    birthDate: string | null;
    gender: string | null;
    address: string | null;
    personalPhone: string | null;
    personalEmail: string | null;
    emergencyContact: string | null;
    healthNotes: string | null;
  } | null;
  guardianLinks: {
    id: string;
    fullName: string;
    relation: string;
    phone: string | null;
    consentSigned: boolean;
    isPrimary: boolean;
  }[];
}

interface CharacterSheet {
  member: MemberDetail;
  rewards: {
    totalExp: number;
    availableExp: number;
    badges: { id: string; name: string; imageUrl: string; badgeType: string; earnedAt: string }[];
  };
  ranks: { id: string; status: string; completedAt: string | null }[];
  attendance: Record<string, number>;
  compliance: { compliant: boolean; violations: string[] };
  allowedActions: string[];
}

const STATUS_MAP: Record<
  string,
  { label: string; variant: 'success' | 'secondary' | 'destructive' | 'warning' }
> = {
  active: { label: 'Hoạt động', variant: 'success' },
  pending: { label: 'Chờ duyệt', variant: 'warning' },
  inactive: { label: 'Ngưng', variant: 'secondary' },
  suspended: { label: 'Đình chỉ', variant: 'destructive' },
  transferred: { label: 'Chuyển đoàn', variant: 'secondary' },
  left: { label: 'Rời đoàn', variant: 'secondary' },
};

function ProfileTab({ data }: { data: CharacterSheet }) {
  const p = data.member.profile;
  if (!p) return <p className="text-sm text-[hsl(var(--muted-foreground))]">Chưa có hồ sơ</p>;

  const fields = [
    { icon: Mail, label: 'Email', value: p.personalEmail || data.member.user.email || '—' },
    { icon: Phone, label: 'Điện thoại', value: p.personalPhone || data.member.user.phone || '—' },
    { icon: MapPin, label: 'Địa chỉ', value: p.address || '—' },
    {
      icon: Calendar,
      label: 'Ngày sinh',
      value: p.birthDate ? new Date(p.birthDate).toLocaleDateString('vi-VN') : '—',
    },
    {
      icon: Calendar,
      label: 'Ngày gia nhập',
      value: new Date(data.member.createdAt).toLocaleDateString('vi-VN'),
    },
    { icon: Shield, label: 'Liên hệ khẩn', value: p.emergencyContact || '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.label}
              className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
                <Icon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{f.label}</p>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">{f.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guardian section */}
      {data.member.guardianLinks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Phụ huynh / Giám hộ
          </h3>
          <div className="space-y-2">
            {data.member.guardianLinks.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {g.fullName}{' '}
                    {g.isPrimary && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        Chính
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {g.relation} • {g.phone || 'Chưa có SĐT'}
                  </p>
                </div>
                <Badge variant={g.consentSigned ? 'success' : 'destructive'}>
                  {g.consentSigned ? 'Đã ký cam kết' : 'Chưa ký'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health notes */}
      {p.healthNotes && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs font-medium text-amber-700">Ghi chú sức khỏe</p>
          <p className="text-sm text-amber-600 mt-1">{p.healthNotes}</p>
        </div>
      )}
    </div>
  );
}

function RewardsTab({ data }: { data: CharacterSheet }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Zap className="h-8 w-8" />
        </div>
        <div>
          <p className="text-3xl font-bold text-[hsl(var(--foreground))]">
            {data.rewards.totalExp.toLocaleString()}
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Tổng EXP • Khả dụng: {data.rewards.availableExp.toLocaleString()}
          </p>
        </div>
      </div>
      {data.rewards.badges.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {data.rewards.badges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center gap-2 rounded-lg border border-[hsl(var(--border))] p-4 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Award className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                {badge.name}
              </span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {new Date(badge.earnedAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-8">
          Chưa có huy hiệu nào
        </p>
      )}
    </div>
  );
}

function AttendanceTab({ data }: { data: CharacterSheet }) {
  const att = data.attendance;
  const total = Object.values(att).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Có mặt',
            count: att['present'] || 0,
            icon: CheckCircle,
            color: 'text-green-600',
          },
          { label: 'Vắng', count: att['absent'] || 0, icon: XCircle, color: 'text-red-500' },
          { label: 'Có phép', count: att['excused'] || 0, icon: Clock, color: 'text-amber-500' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-4"
          >
            <item.icon className={`h-6 w-6 ${item.color}`} />
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{item.count}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
          Tỉ lệ tham gia: {Math.round(((att['present'] || 0) / total) * 100)}%
        </p>
      )}
      {total === 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-8">
          Chưa có dữ liệu điểm danh
        </p>
      )}
    </div>
  );
}

function ComplianceTab({ data }: { data: CharacterSheet }) {
  return (
    <div className="space-y-4">
      <div
        className={`flex items-center gap-3 rounded-lg p-4 ${data.compliance.compliant ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
      >
        {data.compliance.compliant ? (
          <CheckCircle className="h-6 w-6 text-green-600" />
        ) : (
          <AlertCircle className="h-6 w-6 text-red-600" />
        )}
        <div>
          <p
            className={`text-sm font-medium ${data.compliance.compliant ? 'text-green-700' : 'text-red-700'}`}
          >
            {data.compliance.compliant ? 'Đạt tuân thủ' : 'Chưa đạt tuân thủ'}
          </p>
          {!data.compliance.compliant && (
            <p className="text-xs text-red-600">
              {data.compliance.violations.length} vấn đề cần giải quyết
            </p>
          )}
        </div>
      </div>
      {data.compliance.violations.length > 0 && (
        <div className="space-y-2">
          {data.compliance.violations.map((v, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50/50 p-3"
            >
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<CharacterSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/hrm/members/${id}/character-sheet`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center mx-auto max-w-md">
        <AlertCircle className="h-10 w-10 text-[hsl(var(--destructive))] mb-3" />
        <p className="text-sm font-medium text-[hsl(var(--destructive))]">
          {error || 'Không tìm thấy'}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/members')}>
          Quay lại
        </Button>
      </Card>
    );
  }

  const m = data.member;
  const s = STATUS_MAP[m.status];

  const tabs = [
    { value: 'profile', label: 'Hồ sơ', content: <ProfileTab data={data} /> },
    {
      value: 'rewards',
      label: `EXP & Huy hiệu (${data.rewards.totalExp})`,
      content: <RewardsTab data={data} />,
    },
    { value: 'attendance', label: 'Điểm danh', content: <AttendanceTab data={data} /> },
    {
      value: 'compliance',
      label: data.compliance.compliant ? '✅ Tuân thủ' : '⚠️ Tuân thủ',
      content: <ComplianceTab data={data} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push('/members')}>
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Button>

      {/* Compliance banner */}
      {!data.compliance.compliant && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">
              {data.compliance.violations.length} vấn đề tuân thủ cần giải quyết
            </p>
            <p className="text-xs text-red-600">{data.compliance.violations[0]}</p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xl font-bold text-[hsl(var(--primary-foreground))] shrink-0">
              {(m.profile?.fullName || m.user.displayName || '?')
                .split(' ')
                .slice(-1)[0]
                ?.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">
                  {m.profile?.fullName || m.user.displayName}
                </h1>
                {s && (
                  <Badge variant={s.variant as 'success' | 'secondary' | 'destructive'}>
                    {s.label}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {m.memberCode || '—'} · {m.branch?.name || '—'} · {m.unit?.name || '—'} · {m.role}
              </p>
              {m.scoutName && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Tên hướng đạo: {m.scoutName} {m.heroName && `• Anh hùng: ${m.heroName}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 border border-amber-200 shrink-0">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-lg font-bold text-amber-700">
                {data.rewards.totalExp.toLocaleString()}
              </span>
              <span className="text-xs text-amber-600">EXP</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Tabs tabs={tabs} defaultValue="profile" />
        </CardContent>
      </Card>
    </div>
  );
}
