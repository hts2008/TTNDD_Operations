'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Calendar,
  Zap,
  Ticket,
  Wallet,
  CalendarDays,
  BookOpen,
  Award,
  TrendingUp,
  TrendingDown,
  Clock,
  UserPlus,
  CheckCircle2,
  Star,
} from 'lucide-react';

const STATS = [
  { label: 'Tổng đoàn sinh', value: '248', icon: Users, color: 'bg-blue-500', trend: '+12', up: true },
  { label: 'Buổi sinh hoạt', value: '32', icon: Calendar, color: 'bg-indigo-500', trend: '+3', up: true },
  { label: 'EXP đã cấp', value: '15.4K', icon: Zap, color: 'bg-amber-500', trend: '+2.1K', up: true },
  { label: 'Yêu cầu mở', value: '7', icon: Ticket, color: 'bg-rose-500', trend: '-2', up: false },
  { label: 'Số dư quỹ', value: '12.5M', icon: Wallet, color: 'bg-emerald-500', trend: '+1.2M', up: true },
  { label: 'Sự kiện sắp tới', value: '4', icon: CalendarDays, color: 'bg-violet-500', trend: '', up: true },
  { label: 'Khóa học hoạt động', value: '6', icon: BookOpen, color: 'bg-cyan-500', trend: '+1', up: true },
  { label: 'Huy hiệu đã cấp', value: '89', icon: Award, color: 'bg-orange-500', trend: '+14', up: true },
];

const RECENT_ACTIVITIES = [
  { icon: UserPlus, text: 'Nguyễn Văn An đã được thêm vào Ngành Thiếu', time: '5 phút trước', color: 'text-blue-500' },
  { icon: CheckCircle2, text: 'Buổi sinh hoạt "Kỹ năng cắm trại" hoàn thành', time: '2 giờ trước', color: 'text-emerald-500' },
  { icon: Star, text: 'Trần Thị Bình đạt huy hiệu "Sao Đạo Đức"', time: '3 giờ trước', color: 'text-amber-500' },
  { icon: Zap, text: '+150 EXP cho Đội Hướng Dương (điểm danh)', time: '5 giờ trước', color: 'text-violet-500' },
  { icon: Calendar, text: 'Sinh hoạt "Học kỳ quân đội" đã được lên lịch', time: '1 ngày trước', color: 'text-indigo-500' },
  { icon: Wallet, text: 'Thu quỹ tháng 3: +2.500.000đ', time: '2 ngày trước', color: 'text-emerald-500' },
];

const SPICES = [
  { label: 'Social', short: 'S', value: 75, color: '#3b82f6' },
  { label: 'Physical', short: 'P', value: 60, color: '#10b981' },
  { label: 'Intellectual', short: 'I', value: 85, color: '#f59e0b' },
  { label: 'Character', short: 'C', value: 70, color: '#ef4444' },
  { label: 'Emotional', short: 'E', value: 55, color: '#8b5cf6' },
  { label: 'Spiritual', short: 'S', value: 90, color: '#ec4899' },
];

function RadarPlaceholder() {
  const cx = 150, cy = 130, r = 90;
  const points = SPICES.map((_, i) => {
    const angle = (Math.PI * 2 * i) / SPICES.length - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  const dataPoints = SPICES.map((s, i) => {
    const angle = (Math.PI * 2 * i) / SPICES.length - Math.PI / 2;
    const dr = (s.value / 100) * r;
    return { x: cx + dr * Math.cos(angle), y: cy + dr * Math.sin(angle) };
  });
  const polygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 300 280" className="w-full max-w-xs mx-auto">
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon
          key={scale}
          points={points.map((p) => `${cx + (p.x - cx) * scale},${cy + (p.y - cy) * scale}`).join(' ')}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
      ))}
      {points.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="hsl(var(--border))" strokeWidth="1" />
      ))}
      <polygon points={polygon} fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="hsl(var(--primary))" />
      ))}
      {points.map((p, i) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const labelX = cx + (dx > 0 ? dx + 18 : dx < 0 ? dx - 18 : dx);
        const labelY = cy + (dy > 0 ? dy + 16 : dy < 0 ? dy - 10 : dy);
        return (
          <text key={i} x={labelX} y={labelY} textAnchor="middle" className="fill-[hsl(var(--muted-foreground))] text-[11px]">
            {SPICES[i].label}
          </text>
        );
      })}
    </svg>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Tổng quan</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Bảng điều khiển tổ chức — DTNDD</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {stat.trend && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${stat.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {stat.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {stat.trend}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{stat.value}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="p-6 pb-3">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Hoạt động gần đây</h2>
          </div>
          <CardContent className="space-y-1">
            {RECENT_ACTIVITIES.map((activity, i) => {
              const Icon = activity.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-[hsl(var(--muted)_/_0.5)] transition-colors"
                >
                  <div className={`mt-0.5 ${activity.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[hsl(var(--foreground))]">{activity.text}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{activity.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <div className="p-6 pb-3">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">SPICES Coverage</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Cân bằng phát triển toàn diện</p>
          </div>
          <CardContent>
            <RadarPlaceholder />
            <div className="mt-4 grid grid-cols-3 gap-2">
              {SPICES.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[hsl(var(--muted-foreground))]">{s.label}: {s.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
