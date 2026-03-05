'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Zap, Award, Shield } from 'lucide-react';

const MOCK_MEMBER = {
  id: '1',
  code: 'DS-001',
  name: 'Nguyễn Văn An',
  email: 'an.nguyen@email.com',
  phone: '0901 234 567',
  address: 'Q.1, TP. Hồ Chí Minh',
  branch: 'Ngành Thiếu',
  unit: 'Đội Hướng Dương',
  rank: 'Hạng Nhì',
  role: 'Đoàn sinh',
  status: 'active',
  exp: 1250,
  joinDate: '2024-03-15',
  dob: '2010-08-22',
  badges: ['Sao Đạo Đức', 'Kỹ năng Cắm trại', 'Lửa trại Cấp 1'],
  skills: [
    { name: 'Dây thắt nút', level: 3, maxLevel: 5 },
    { name: 'Cắm trại', level: 2, maxLevel: 5 },
    { name: 'Sơ cứu', level: 4, maxLevel: 5 },
    { name: 'Ẩm thực dã ngoại', level: 1, maxLevel: 5 },
  ],
  attendance: [
    { date: '2025-03-01', session: 'Sinh hoạt đầu tháng', present: true },
    { date: '2025-02-22', session: 'Kỹ năng thắt nút', present: true },
    { date: '2025-02-15', session: 'Trò chơi lớn', present: false },
    { date: '2025-02-08', session: 'Lễ khai đoàn', present: true },
  ],
};

function ProfileTab() {
  const m = MOCK_MEMBER;
  const fields = [
    { icon: Mail, label: 'Email', value: m.email },
    { icon: Phone, label: 'Điện thoại', value: m.phone },
    { icon: MapPin, label: 'Địa chỉ', value: m.address },
    { icon: Calendar, label: 'Ngày sinh', value: new Date(m.dob).toLocaleDateString('vi-VN') },
    { icon: Calendar, label: 'Ngày gia nhập', value: new Date(m.joinDate).toLocaleDateString('vi-VN') },
    { icon: Shield, label: 'Đẳng thứ', value: m.rank },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const Icon = f.icon;
        return (
          <div key={f.label} className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-3">
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

function SkillsTab() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {MOCK_MEMBER.skills.map((skill) => (
        <div key={skill.name} className="rounded-lg border border-[hsl(var(--border))] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">{skill.name}</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Lv.{skill.level}/{skill.maxLevel}</span>
          </div>
          <div className="h-2 rounded-full bg-[hsl(var(--muted))]">
            <div
              className="h-full rounded-full bg-[hsl(var(--primary))] transition-all"
              style={{ width: `${(skill.level / skill.maxLevel) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AttendanceTab() {
  return (
    <div className="space-y-2">
      {MOCK_MEMBER.attendance.map((a, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3"
        >
          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">{a.session}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {new Date(a.date).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <Badge variant={a.present ? 'success' : 'destructive'}>
            {a.present ? 'Có mặt' : 'Vắng'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function ExpTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Zap className="h-8 w-8" />
        </div>
        <div>
          <p className="text-3xl font-bold text-[hsl(var(--foreground))]">{MOCK_MEMBER.exp.toLocaleString()}</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Tổng EXP tích lũy</p>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { label: 'Điểm danh sinh hoạt (12 buổi)', value: '+600 EXP', date: 'Tháng 1–3/2025' },
          { label: 'Hoàn thành kỹ năng Sơ cứu Lv.4', value: '+200 EXP', date: '15/02/2025' },
          { label: 'Tham gia sự kiện Lửa trại Xuân', value: '+300 EXP', date: '01/02/2025' },
          { label: 'Đạt huy hiệu "Sao Đạo Đức"', value: '+150 EXP', date: '20/01/2025' },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3">
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">{item.label}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.date}</p>
            </div>
            <span className="text-sm font-semibold text-amber-600">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BadgesTab() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {MOCK_MEMBER.badges.map((badge) => (
        <div key={badge} className="flex flex-col items-center gap-2 rounded-lg border border-[hsl(var(--border))] p-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Award className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium text-[hsl(var(--foreground))]">{badge}</span>
        </div>
      ))}
    </div>
  );
}

export default function MemberDetailPage() {
  const router = useRouter();
  const m = MOCK_MEMBER;

  const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'secondary' | 'destructive' }> = {
    active: { label: 'Hoạt động', variant: 'success' },
    inactive: { label: 'Ngưng', variant: 'secondary' },
    suspended: { label: 'Đình chỉ', variant: 'destructive' },
  };

  const tabs = [
    { value: 'profile', label: 'Hồ sơ', content: <ProfileTab /> },
    { value: 'skills', label: 'Kỹ năng', content: <SkillsTab /> },
    { value: 'attendance', label: 'Điểm danh', content: <AttendanceTab /> },
    { value: 'exp', label: 'EXP', content: <ExpTab /> },
    { value: 'badges', label: 'Huy hiệu', content: <BadgesTab /> },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push('/members')}>
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xl font-bold text-[hsl(var(--primary-foreground))] shrink-0">
              {m.name.split(' ').slice(-1)[0]?.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">{m.name}</h1>
                <Badge variant={STATUS_MAP[m.status]?.variant}>{STATUS_MAP[m.status]?.label}</Badge>
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {m.code} · {m.branch} · {m.unit} · {m.role}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 border border-amber-200 shrink-0">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-lg font-bold text-amber-700">{m.exp.toLocaleString()}</span>
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
