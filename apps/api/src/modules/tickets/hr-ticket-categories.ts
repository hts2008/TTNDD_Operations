/**
 * T-0070: HR Helpdesk Ticket Types
 *
 * Pre-defined categories for HR-related tickets.
 * These integrate Module 3 (Tickets) with Module 2 (HRM) workflows.
 *
 * Usage: When creating a ticket, pass `category: 'transfer_request'` etc.
 * The FE can fetch these via GET /tickets/categories to populate dropdowns.
 */

export interface HrTicketCategory {
  key: string;
  label: string;
  description: string;
  defaultPriority: 'critical' | 'high' | 'medium' | 'low';
  isSensitive: boolean;
  /** Which HRM workflow this links to, if any */
  linkedWorkflow?: string;
}

export const HR_TICKET_CATEGORIES: HrTicketCategory[] = [
  {
    key: 'transfer_request',
    label: 'Yêu cầu chuyển ngành',
    description: 'Yêu cầu chuyển đoàn sinh sang ngành/đơn vị khác',
    defaultPriority: 'high',
    isSensitive: false,
    linkedWorkflow: 'WP-2.5:transfer_case',
  },
  {
    key: 'leave_request',
    label: 'Xin phép nghỉ/rời',
    description: 'Yêu cầu tạm nghỉ hoặc rời khỏi đoàn',
    defaultPriority: 'medium',
    isSensitive: false,
    linkedWorkflow: 'WP-2.6:offboarding',
  },
  {
    key: 'onboarding_issue',
    label: 'Vấn đề nhập môn',
    description: 'Hỗ trợ quy trình nhập môn cho thành viên mới',
    defaultPriority: 'medium',
    isSensitive: false,
    linkedWorkflow: 'WP-2.6:onboarding',
  },
  {
    key: 'training_request',
    label: 'Yêu cầu huấn luyện',
    description: 'Đăng ký khóa huấn luyện hoặc yêu cầu cấp chứng chỉ',
    defaultPriority: 'medium',
    isSensitive: false,
    linkedWorkflow: 'WP-2.6:training_record',
  },
  {
    key: 'compliance_query',
    label: 'Hỏi đáp tuân thủ',
    description: 'Câu hỏi về kiểm tra lý lịch, chứng chỉ hết hạn, yêu cầu compliance',
    defaultPriority: 'high',
    isSensitive: false,
    linkedWorkflow: 'WP-2.6:compliance_expiry',
  },
  {
    key: 'document_request',
    label: 'Yêu cầu cấp giấy tờ',
    description: 'Yêu cầu cấp giấy xác nhận, thẻ sinh hoạt, hoặc tài liệu khác',
    defaultPriority: 'low',
    isSensitive: false,
  },
  {
    key: 'role_change',
    label: 'Thay đổi vai trò',
    description: 'Yêu cầu đề cử, thăng chức, hoặc thay đổi vai trò trong đoàn',
    defaultPriority: 'high',
    isSensitive: false,
  },
  {
    key: 'complaint',
    label: 'Khiếu nại nhân sự',
    description: 'Khiếu nại về hành vi, quy trình, hoặc quyết định nhân sự',
    defaultPriority: 'critical',
    isSensitive: true,
  },
];

/** General (non-HR) ticket categories */
export const GENERAL_TICKET_CATEGORIES: HrTicketCategory[] = [
  {
    key: 'account',
    label: 'Tài khoản',
    description: 'Vấn đề đăng nhập, mật khẩu, quyền truy cập',
    defaultPriority: 'high',
    isSensitive: false,
  },
  {
    key: 'technical',
    label: 'Kỹ thuật',
    description: 'Lỗi hệ thống, bug, sự cố kỹ thuật',
    defaultPriority: 'high',
    isSensitive: false,
  },
  {
    key: 'feature_request',
    label: 'Tính năng',
    description: 'Đề xuất tính năng mới hoặc cải thiện',
    defaultPriority: 'low',
    isSensitive: false,
  },
  {
    key: 'asset',
    label: 'Tài sản',
    description: 'Mượn/trả trang phục, dụng cụ, thiết bị',
    defaultPriority: 'medium',
    isSensitive: false,
  },
];

/** All categories combined */
export const ALL_TICKET_CATEGORIES = [...HR_TICKET_CATEGORIES, ...GENERAL_TICKET_CATEGORIES];
