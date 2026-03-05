'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, ChevronRight, BookOpen, CheckCircle2, Clock, Lock } from 'lucide-react';

type SkillStatus = 'not_started' | 'in_progress' | 'verified' | 'awarded';

interface Skill {
  id: string;
  name: string;
  status: SkillStatus;
  description: string;
}

interface SkillGroup {
  id: string;
  name: string;
  icon: string;
  skills: Skill[];
}

const STATUS_CONFIG: Record<SkillStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; icon: typeof Lock }> = {
  not_started: { label: 'Chưa bắt đầu', variant: 'outline', icon: Lock },
  in_progress: { label: 'Đang học', variant: 'warning', icon: Clock },
  verified: { label: 'Đã xác nhận', variant: 'default', icon: CheckCircle2 },
  awarded: { label: 'Đã đạt', variant: 'success', icon: Award },
};

const CURRENT_RANK = {
  name: 'Hướng Thiện',
  level: 3,
  progress: 65,
  nextRank: 'Sơ Thiện',
  requirements: [
    'Hoàn thành 8/10 kỹ năng bắt buộc',
    'Tham gia 3 trại huấn luyện',
    'Đạt 3000 EXP',
  ],
};

const SKILL_GROUPS: SkillGroup[] = [
  {
    id: 'g1',
    name: 'Kỹ năng Hướng Đạo',
    icon: '🏕️',
    skills: [
      { id: 's1', name: 'Dựng lều trại', status: 'awarded', description: 'Biết cách dựng và tháo lều đúng kỹ thuật' },
      { id: 's2', name: 'Nút dây', status: 'verified', description: 'Thực hiện 10 loại nút dây cơ bản' },
      { id: 's3', name: 'Đọc bản đồ', status: 'in_progress', description: 'Sử dụng la bàn và bản đồ địa hình' },
      { id: 's4', name: 'Sơ cấp cứu', status: 'not_started', description: 'Xử lý vết thương, băng bó cơ bản' },
    ],
  },
  {
    id: 'g2',
    name: 'Giáo lý Cao Đài',
    icon: '📖',
    skills: [
      { id: 's5', name: 'Thánh ngôn', status: 'awarded', description: 'Thuộc và hiểu các bài Thánh ngôn' },
      { id: 's6', name: 'Nghi lễ', status: 'in_progress', description: 'Thực hành nghi lễ cúng kính' },
      { id: 's7', name: 'Kinh nhật tụng', status: 'in_progress', description: 'Đọc và hiểu kinh nhật tụng' },
      { id: 's8', name: 'Lịch sử đạo', status: 'not_started', description: 'Tìm hiểu lịch sử Đại Đạo Tam Kỳ' },
    ],
  },
  {
    id: 'g3',
    name: 'Kỹ năng sống',
    icon: '🌱',
    skills: [
      { id: 's9', name: 'Giao tiếp', status: 'awarded', description: 'Kỹ năng thuyết trình và lắng nghe' },
      { id: 's10', name: 'Lãnh đạo', status: 'verified', description: 'Dẫn dắt nhóm và tổ chức hoạt động' },
      { id: 's11', name: 'Làm việc nhóm', status: 'in_progress', description: 'Hợp tác hiệu quả trong đội nhóm' },
      { id: 's12', name: 'Tự lập', status: 'not_started', description: 'Quản lý thời gian và tự chăm sóc bản thân' },
    ],
  },
];

export default function SkillsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
        <Award className="h-8 w-8 text-indigo-500" />
        Kỹ năng & Đẳng thứ
      </h1>

      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="text-indigo-800">Tiến trình Đẳng thứ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-indigo-600 font-medium">Đẳng thứ hiện tại</p>
              <p className="text-2xl font-bold text-indigo-800">{CURRENT_RANK.name}</p>
              <p className="text-sm text-indigo-500">Bậc {CURRENT_RANK.level}</p>
            </div>
            <div>
              <p className="text-sm text-indigo-600 font-medium mb-2">Tiến trình</p>
              <div className="w-full bg-indigo-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${CURRENT_RANK.progress}%` }}
                />
              </div>
              <p className="text-xs text-indigo-600 mt-1 flex justify-between">
                <span>{CURRENT_RANK.name}</span>
                <span>{CURRENT_RANK.progress}%</span>
                <span>{CURRENT_RANK.nextRank}</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-indigo-600 font-medium mb-1">Yêu cầu lên bậc tiếp</p>
              <ul className="space-y-1">
                {CURRENT_RANK.requirements.map((req, i) => (
                  <li key={i} className="text-sm text-indigo-700 flex items-start gap-1.5">
                    <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SKILL_GROUPS.map((group) => {
          const completed = group.skills.filter((s) => s.status === 'awarded' || s.status === 'verified').length;
          return (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">{group.icon}</span>
                  {group.name}
                </CardTitle>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {completed}/{group.skills.length} hoàn thành
                </p>
                <div className="w-full bg-[hsl(var(--muted))] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${(completed / group.skills.length) * 100}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {group.skills.map((skill) => {
                    const cfg = STATUS_CONFIG[skill.status];
                    const Icon = cfg.icon;
                    return (
                      <li key={skill.id} className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Icon className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{skill.name}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{skill.description}</p>
                          </div>
                        </div>
                        <Badge variant={cfg.variant} className="shrink-0 text-[10px]">{cfg.label}</Badge>
                      </li>
                    );
                  })}
                </ul>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Xem chi tiết
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
