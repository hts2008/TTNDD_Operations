'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Building2, ToggleLeft, ToggleRight, GitBranch, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleToggle {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const ORG_INFO = {
  name: 'DTNDD Thánh Thất Quận 1',
  code: 'TT-Q1',
  region: 'Miền Nam',
  address: '123 Đường ABC, Phường 1, Quận 1, TP.HCM',
  phone: '028 1234 5678',
  email: 'tt-q1@dtndd.org',
};

const INITIAL_MODULES: ModuleToggle[] = [
  { id: 'm1', name: 'Quản lý Đoàn sinh', description: 'Hồ sơ, điểm danh, phân Ngành', enabled: true },
  { id: 'm2', name: 'Điểm thưởng (EXP)', description: 'Tích điểm, bảng xếp hạng, huy hiệu', enabled: true },
  { id: 'm3', name: 'Kỹ năng & Đẳng thứ', description: 'Cây kỹ năng, tiến trình thăng bậc', enabled: true },
  { id: 'm4', name: 'Sự kiện & Trại', description: 'Lịch sự kiện, đăng ký, quản lý trại', enabled: true },
  { id: 'm5', name: 'Học tập (LMS)', description: 'Khóa học, bài giảng, kiểm tra', enabled: true },
  { id: 'm6', name: 'Tài chính', description: 'Thu chi, quỹ, phí sinh hoạt', enabled: true },
  { id: 'm7', name: 'Tài sản', description: 'Quản lý thiết bị, trang phục, tài liệu', enabled: false },
  { id: 'm8', name: 'Dự án', description: 'Kanban board, quản lý công việc', enabled: true },
  { id: 'm9', name: 'Tâm linh & Đánh giá', description: 'Nhật ký tâm linh, Ngũ Giới', enabled: false },
  { id: 'm10', name: 'An toàn trẻ em', description: 'Báo cáo sự cố, theo dõi an toàn', enabled: true },
];

const BRANCHES = [
  { name: 'Ngành Đồng', ageRange: '6-11 tuổi', memberCount: 25, color: 'bg-yellow-100 text-yellow-700' },
  { name: 'Ngành Thiếu', ageRange: '12-17 tuổi', memberCount: 42, color: 'bg-green-100 text-green-700' },
  { name: 'Ngành Thanh', ageRange: '18-25 tuổi', memberCount: 18, color: 'bg-blue-100 text-blue-700' },
];

export default function SettingsPage() {
  const [modules, setModules] = useState(INITIAL_MODULES);

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
    );
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Settings className="h-8 w-8 text-gray-500" />
        Cài đặt
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Thông tin tổ chức
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tên tổ chức</label>
              <Input defaultValue={ORG_INFO.name} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mã tổ chức</label>
              <Input defaultValue={ORG_INFO.code} disabled />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Miền</label>
              <Input defaultValue={ORG_INFO.region} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Điện thoại</label>
              <Input defaultValue={ORG_INFO.phone} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium">Địa chỉ</label>
              <Input defaultValue={ORG_INFO.address} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium">Email</label>
              <Input defaultValue={ORG_INFO.email} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button>Lưu thay đổi</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ToggleRight className="h-5 w-5" />
            Quản lý Module
          </CardTitle>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Bật/tắt các tính năng cho tổ chức của bạn
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-[hsl(var(--muted)_/_0.3)] transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{mod.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{mod.description}</p>
                </div>
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="shrink-0"
                >
                  {mod.enabled ? (
                    <ToggleRight className="h-8 w-8 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-gray-300" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5" />
            Quản lý Ngành
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BRANCHES.map((branch) => (
              <div key={branch.name} className="p-4 rounded-lg border text-center space-y-2">
                <Badge className={cn('border-0', branch.color)}>{branch.name}</Badge>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{branch.ageRange}</p>
                <p className="text-2xl font-bold">{branch.memberCount}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">thành viên</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Quản lý Đơn vị
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['Đội Sao Mai', 'Đội Bạch Mã', 'Đội Hồng Hạc', 'Đội Kim Ưng'].map((unit) => (
              <div key={unit} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium text-sm">{unit}</span>
                <Button variant="outline" size="sm">Chỉnh sửa</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full border-dashed">
              + Thêm đơn vị
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
