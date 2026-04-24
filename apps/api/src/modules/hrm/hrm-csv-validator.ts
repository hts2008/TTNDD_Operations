/**
 * T-1016: HRM CSV Import Column Validator
 *
 * Validates and maps CSV columns to HRM member/profile fields.
 * Used by the data-import module's generic CSV endpoint.
 */

export interface HrmCsvRow {
  fullName: string;
  birthDate?: string;
  gender?: string;
  branchCode?: string;
  unitName?: string;
  memberCode?: string;
  scoutName?: string;
  phone?: string;
  email?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  emergencyContact?: string;
  address?: string;
}

const REQUIRED_COLUMNS = ['fullName'] as const;

const COLUMN_ALIASES: Record<string, string> = {
  // Vietnamese aliases
  'họ tên': 'fullName',
  'ho ten': 'fullName',
  'tên đầy đủ': 'fullName',
  'ngày sinh': 'birthDate',
  'ngay sinh': 'birthDate',
  'giới tính': 'gender',
  'gioi tinh': 'gender',
  ngành: 'branchCode',
  nganh: 'branchCode',
  'đơn vị': 'unitName',
  'don vi': 'unitName',
  mã: 'memberCode',
  ma: 'memberCode',
  'tên hướng đạo': 'scoutName',
  'ten huong dao': 'scoutName',
  'điện thoại': 'phone',
  'dien thoai': 'phone',
  'phụ huynh': 'guardianName',
  'phu huynh': 'guardianName',
  'sdt phụ huynh': 'guardianPhone',
  'sdt phu huynh': 'guardianPhone',
  'quan hệ': 'guardianRelation',
  'quan he': 'guardianRelation',
  'liên hệ khẩn': 'emergencyContact',
  'lien he khan': 'emergencyContact',
  'địa chỉ': 'address',
  'dia chi': 'address',
  // English aliases
  'full name': 'fullName',
  name: 'fullName',
  dob: 'birthDate',
  'date of birth': 'birthDate',
  'birth date': 'birthDate',
  branch: 'branchCode',
  unit: 'unitName',
  code: 'memberCode',
  'scout name': 'scoutName',
  'guardian name': 'guardianName',
  'guardian phone': 'guardianPhone',
  'guardian relation': 'guardianRelation',
  'emergency contact': 'emergencyContact',
};

export interface CsvValidationResult {
  valid: boolean;
  mappedColumns: Record<string, string>;
  missingRequired: string[];
  unmappedColumns: string[];
  warnings: string[];
}

/**
 * Validate CSV headers against expected HRM columns.
 * Returns column mapping and validation result.
 */
export function validateHrmCsvHeaders(headers: string[]): CsvValidationResult {
  const mappedColumns: Record<string, string> = {};
  const unmappedColumns: string[] = [];
  const warnings: string[] = [];

  for (const header of headers) {
    const normalized = header.trim().toLowerCase();
    const mapped =
      COLUMN_ALIASES[normalized] ||
      (normalized in Object.values(COLUMN_ALIASES) ? normalized : null);

    if (mapped) {
      if (mappedColumns[mapped]) {
        warnings.push(
          `Duplicate mapping for '${mapped}': '${header}' (already mapped from another column)`,
        );
      }
      mappedColumns[mapped] = header;
    } else {
      unmappedColumns.push(header);
    }
  }

  const missingRequired = REQUIRED_COLUMNS.filter((col) => !mappedColumns[col]);

  return {
    valid: missingRequired.length === 0,
    mappedColumns,
    missingRequired: missingRequired as unknown as string[],
    unmappedColumns,
    warnings,
  };
}

/**
 * Validate a single CSV row after column mapping.
 */
export function validateHrmCsvRow(
  row: HrmCsvRow,
  rowIndex: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!row.fullName || row.fullName.trim().length < 2) {
    errors.push(`Row ${rowIndex}: fullName is required (min 2 chars)`);
  }

  if (row.birthDate) {
    const date = new Date(row.birthDate);
    if (isNaN(date.getTime())) {
      errors.push(`Row ${rowIndex}: invalid birthDate format '${row.birthDate}'`);
    }
  }

  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push(`Row ${rowIndex}: invalid email '${row.email}'`);
  }

  if (
    row.gender &&
    !['male', 'female', 'other', 'nam', 'nữ', 'nu', 'khác', 'khac'].includes(
      row.gender.toLowerCase(),
    )
  ) {
    errors.push(`Row ${rowIndex}: invalid gender '${row.gender}'`);
  }

  return { valid: errors.length === 0, errors };
}
