'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Save, Send, ChevronRight, ChevronDown,
  Target, Users, Calendar, DollarSign, Shield,
  AlertTriangle, ClipboardList, BarChart3, Settings,
} from 'lucide-react';

// Plan 9 sections as per V3 spec
const PLAN_SECTIONS = [
  { key: 'sectionI', label: 'I. Mô tả & Bối cảnh', icon: FileText, placeholder: 'Mô tả tổng quan kế hoạch, bối cảnh và lý do thực hiện...' },
  { key: 'sectionII', label: 'II. Mục tiêu', icon: Target, placeholder: 'Liệt kê các mục tiêu cụ thể, đo lường được...' },
  { key: 'sectionIII', label: 'III. Nhân sự & Phân công', icon: Users, placeholder: 'Danh sách nhân sự tham gia, vai trò, trách nhiệm...' },
  { key: 'sectionIV', label: 'IV. Hoạt động chính', icon: ClipboardList, placeholder: 'Liệt kê các hoạt động (name, description) — sẽ tự tạo task khi duyệt...' },
  { key: 'sectionV', label: 'V. Lịch trình', icon: Calendar, placeholder: 'Timeline, mốc thời gian quan trọng...' },
  { key: 'sectionVI', label: 'VI. Ngân sách', icon: DollarSign, placeholder: 'Dự toán chi phí, nguồn tài trợ...' },
  { key: 'sectionVII', label: 'VII. Đánh giá rủi ro', icon: AlertTriangle, placeholder: 'Các rủi ro tiềm ẩn, phương án xử lý...' },
  { key: 'sectionVIII', label: 'VIII. KPI & Đo lường', icon: BarChart3, placeholder: 'Chỉ số đo lường thành công...' },
  { key: 'sectionIX', label: 'IX. Phụ lục & Cài đặt', icon: Settings, placeholder: 'Tài liệu đính kèm, cấu hình bổ sung...' },
] as const;

type SectionKey = typeof PLAN_SECTIONS[number]['key'];

export default function NewPlanPage() {
  const [title, setTitle] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['sectionI']));
  const [sectionData, setSectionData] = useState<Record<SectionKey, string>>(
    Object.fromEntries(PLAN_SECTIONS.map(s => [s.key, ''])) as Record<SectionKey, string>,
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const updateSection = useCallback((key: SectionKey, value: string) => {
    setSectionData(prev => ({ ...prev, [key]: value }));
  }, []);

  const filledCount = PLAN_SECTIONS.filter(s => sectionData[s.key].trim().length > 0).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: connect to POST /api/projects/plans
      await new Promise(r => setTimeout(r, 600)); // placeholder
      console.log('Draft saved:', { title, ...sectionData });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // TODO: connect to PATCH /api/projects/plans/:id/transition { action: 'submit' }
      await new Promise(r => setTimeout(r, 800)); // placeholder
      console.log('Submitted for approval');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-8 w-8 text-violet-500" />
            Soạn Kế Hoạch
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Điền đủ 9 phần → Lưu nháp → Gửi duyệt
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {filledCount}/9 phần đã điền
          </Badge>
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Đang lưu...' : 'Lưu nháp'}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || filledCount < 4}>
            <Send className="h-4 w-4 mr-1" />
            {submitting ? 'Đang gửi...' : 'Gửi duyệt'}
          </Button>
        </div>
      </div>

      {/* Title */}
      <Card>
        <CardContent className="p-4">
          <label className="text-sm font-medium mb-1 block">Tên kế hoạch</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Kế hoạch Trại Hè 2026"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </CardContent>
      </Card>

      {/* 9 Sections */}
      <div className="space-y-3">
        {PLAN_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSections.has(section.key);
          const isFilled = sectionData[section.key].trim().length > 0;

          return (
            <Card key={section.key} className={isFilled ? 'border-violet-200' : ''}>
              <CardHeader
                className="p-4 cursor-pointer flex flex-row items-center gap-3"
                onClick={() => toggleSection(section.key)}
              >
                {isExpanded
                  ? <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  : <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />}
                <Icon className="h-5 w-5 text-violet-500" />
                <CardTitle className="text-sm font-semibold flex-1">{section.label}</CardTitle>
                {isFilled && <Badge className="bg-violet-100 text-violet-700 border-0 text-[10px]">Đã điền</Badge>}
              </CardHeader>

              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0">
                  <textarea
                    value={sectionData[section.key]}
                    onChange={(e) => updateSection(section.key, e.target.value)}
                    placeholder={section.placeholder}
                    rows={5}
                    className="w-full rounded-md border px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[120px]"
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="bg-[hsl(var(--muted))] rounded-full h-2 overflow-hidden">
        <div
          className="bg-violet-500 h-full transition-all duration-300"
          style={{ width: `${(filledCount / 9) * 100}%` }}
        />
      </div>
    </div>
  );
}
