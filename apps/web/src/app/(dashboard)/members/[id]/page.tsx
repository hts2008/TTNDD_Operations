'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Users,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';

/* ── Types ─────────────────────────────────────────────── */

interface MemberProfile {
  id: string;
  memberCode: string;
  status: string;
  role: string;
  profile: {
    fullName: string;
    nickName: string | null;
    birthDate: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    backgroundCheckExpiry: string | null;
    youthProtectionDate: string | null;
    medicalFormDate: string | null;
    consentFormSigned: boolean;
  } | null;
  branch: { name: string } | null;
  unit: { name: string } | null;
  guardianLinks: Guardian[];
}

interface Guardian {
  id: string;
  fullName: string;
  relation: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  consentSigned: boolean;
}

interface ComplianceResult {
  compliant: boolean;
  violations: string[];
}

/* ── Fallback mock (for dev when API not running) ─────── */

const MOCK_MEMBER: MemberProfile = {
  id: '1',
  memberCode: 'DS-001',
  status: 'active',
  role: 'member',
  profile: {
    fullName: 'Nguyễn Văn An',
    nickName: 'An',
    birthDate: '2010-08-22',
    email: 'an.nguyen@email.com',
    phone: '0901 234 567',
    address: 'Q.1, TP. Hồ Chí Minh',
    backgroundCheckExpiry: null,
    youthProtectionDate: null,
    medicalFormDate: null,
    consentFormSigned: false,
  },
  branch: { name: 'Ngành Thiếu' },
  unit: { name: 'Đội Hướng Dương' },
  guardianLinks: [
    {
      id: 'g1',
      fullName: 'Nguyễn Văn B',
      relation: 'father',
      phone: '0901 111 222',
      email: 'b@email.com',
      isPrimary: true,
      consentSigned: true,
    },
  ],
};

/* ── Status helpers ─────────────────────────────────────── */

const STATUS_MAP: Record<
  string,
  { label: string; variant: 'success' | 'secondary' | 'destructive' }
> = {
  active: { label: 'Hoạt động', variant: 'success' },
  inactive: { label: 'Ngưng', variant: 'secondary' },
  suspended: { label: 'Đình chỉ', variant: 'destructive' },
};

/* ── Tab Components ────────────────────────────────────── */

function ProfileTab({ m }: { m: MemberProfile }) {
  const fields = [
    { icon: Mail, label: 'Email', value: m.profile?.email ?? '—' },
    { icon: Phone, label: 'Điện thoại', value: m.profile?.phone ?? '—' },
    { icon: MapPin, label: 'Địa chỉ', value: m.profile?.address ?? '—' },
    {
      icon: Calendar,
      label: 'Ngày sinh',
      value: m.profile?.birthDate ? new Date(m.profile.birthDate).toLocaleDateString('vi-VN') : '—',
    },
    { icon: Shield, label: 'Vai trò', value: m.role },
  ];

  return (
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
  );
}

function GuardianTab({ guardians }: { guardians: Guardian[] }) {
  if (guardians.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-[hsl(var(--muted-foreground))] mb-3" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Chưa có thông tin phụ huynh / người bảo hộ
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {guardians.map((g) => (
        <div
          key={g.id}
          className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))]">
              {g.fullName.split(' ').slice(-1)[0]?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">{g.fullName}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">
                {g.relation} {g.phone ? `· ${g.phone}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {g.consentSigned ? (
              <Badge variant="success" className="gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" /> Đã ký
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 text-xs">
                <XCircle className="h-3 w-3" /> Chưa ký
              </Badge>
            )}
            {g.isPrimary && (
              <Badge variant="default" className="text-xs">
                Chính
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ComplianceTab({ memberId }: { memberId: string }) {
  const [compliance, setCompliance] = useState<ComplianceResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ComplianceResult>(`/hrm/members/${memberId}/compliance`)
      .then(setCompliance)
      .catch(() =>
        setCompliance({ compliant: false, violations: ['Không thể kiểm tra (API lỗi)'] }),
      )
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading)
    return (
      <div className="animate-pulse text-sm text-[hsl(var(--muted-foreground))] py-8 text-center">
        Đang kiểm tra...
      </div>
    );

  if (!compliance) return null;

  return (
    <div className="space-y-3">
      {compliance.compliant ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-700">Đạt yêu cầu tuân thủ đầy đủ</p>
            <p className="text-xs text-green-600 mt-0.5">Tất cả hồ sơ đã hoàn tất</p>
          </div>
        </div>
      ) : (
        compliance.violations.map((v, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
          >
            <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{v}</p>
          </div>
        ))
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────── */

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<MemberProfile>(MOCK_MEMBER);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<MemberProfile>(`/hrm/members/${memberId}`)
      .then((data) => {
        setMember(data);
        setLoaded(true);
      })
      .catch(() => {
        setError(true);
        setLoaded(true);
      });
  }, [memberId]);

  const m = member;
  const s = STATUS_MAP[m.status];

  const tabs = [
    { value: 'profile', label: 'Hồ sơ', content: <ProfileTab m={m} /> },
    {
      value: 'guardians',
      label: `Phụ huynh (${m.guardianLinks.length})`,
      content: <GuardianTab guardians={m.guardianLinks} />,
    },
    { value: 'compliance', label: 'Tuân thủ', content: <ComplianceTab memberId={memberId} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push('/members')}>
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => router.push(`/members/${memberId}/character-sheet`)}
        >
          <Sparkles className="h-4 w-4" />
          Bảng nhân vật
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-400">
              <XCircle className="h-6 w-6 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Không tìm thấy thành viên</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                  Dữ liệu hiển thị bên dưới là mẫu. Kiểm tra lại ID hoặc kết nối API.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Thử lại
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hero Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xl font-bold text-[hsl(var(--primary-foreground))] shrink-0">
              {m.profile?.fullName?.split(' ').slice(-1)[0]?.charAt(0) ?? '?'}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">
                  {m.profile?.fullName ?? m.memberCode}
                </h1>
                {s && <Badge variant={s.variant}>{s.label}</Badge>}
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {m.memberCode} · {m.branch?.name ?? '—'} · {m.unit?.name ?? '—'} · {m.role}
              </p>
            </div>
            {!loaded && (
              <span className="text-xs text-[hsl(var(--muted-foreground))] animate-pulse">
                Đang tải...
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs tabs={tabs} defaultValue="profile" />
        </CardContent>
      </Card>
    </div>
  );
}
