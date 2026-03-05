import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database';

export interface ImportRow {
  [key: string]: string;
}

export interface ImportErrorDetail {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  batchId: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  errorDetails: ImportErrorDetail[];
  isDryRun: boolean;
  status: string;
}

@Injectable()
export class DataImportService {
  constructor(private readonly prisma: PrismaService) {}

  parseCsv(csvContent: string): ImportRow[] {
    const lines = csvContent.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row + at least 1 data row');
    }
    const headers = (lines[0] as string).split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const vals = this.parseCsvLine(line);
      return headers.reduce((acc, h, i) => ({ ...acc, [h]: vals[i]?.trim() ?? '' }), {} as ImportRow);
    });
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  async importMembers(
    orgId: string,
    importedBy: string,
    csvContent: string,
    isDryRun = true,
  ): Promise<ImportResult> {
    const rows = this.parseCsv(csvContent);
    const errors: ImportErrorDetail[] = [];
    let successRows = 0;

    const requiredFields = ['displayName', 'email', 'role', 'branchCode'];

    // Phase 1: Validate all rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as ImportRow;
      for (const field of requiredFields) {
        if (!row[field]?.trim()) {
          errors.push({ row: i + 2, field, message: `Field '${field}' is required` });
        }
      }
      const email = row['email'] || '';
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: i + 2, field: 'email', message: `Invalid email: ${email}` });
      }
      const role = row['role'] || '';
      const allowedRoles = ['user', 'admin', 'super_admin', 'parent'];
      if (role && !allowedRoles.includes(role)) {
        errors.push({ row: i + 2, field: 'role', message: `Invalid role: ${role}. Allowed: ${allowedRoles.join(', ')}` });
      }
    }

    if (isDryRun || errors.length > 0) {
      const batchStatus = isDryRun
        ? (errors.length === 0 ? 'dry_run_ok' : 'dry_run_with_errors')
        : 'validation_failed';
      const batch = await this.prisma.importBatch.create({
        data: {
          orgId, importType: 'members',
          status: batchStatus,
          totalRows: rows.length,
          successRows: isDryRun ? rows.length - errors.length : 0,
          errorRows: errors.length,
          errorDetails: errors as object[],
          importedBy, isDryRun,
        },
      });
      return {
        batchId: batch.id,
        totalRows: rows.length,
        successRows: isDryRun ? rows.length - errors.length : 0,
        errorRows: errors.length,
        errorDetails: errors,
        isDryRun,
        status: batchStatus,
      };
    }

    // Phase 2: Execute import
    const batch = await this.prisma.importBatch.create({
      data: {
        orgId, importType: 'members', status: 'processing',
        totalRows: rows.length, successRows: 0, errorRows: 0,
        errorDetails: [], importedBy, isDryRun: false,
      },
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as ImportRow;
      try {
        const branchCode = (row['branchCode'] || '').toUpperCase();
        const branch = await this.prisma.branch.findFirst({
          where: { orgId, code: branchCode },
        });
        if (!branch) {
          errors.push({ row: i + 2, field: 'branchCode', message: `Branch '${branchCode}' not found in org` });
          continue;
        }

        const email = row['email'] || '';
        let user = await this.prisma.user.findFirst({ where: { email } });
        if (!user) {
          user = await this.prisma.user.create({
            data: {
              firebaseUid: `import-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
              email,
              displayName: row['displayName'] || email,
              phone: row['phone'] || null,
            },
          });
        }

        const existing = await this.prisma.orgMember.findFirst({
          where: { orgId, userId: user.id },
        });
        if (!existing) {
          const joinDateStr = row['joinDate'] as string | undefined;
          await this.prisma.orgMember.create({
            data: {
              orgId, userId: user.id,
              role: row['role'] || 'user',
              branchId: branch.id,
              memberCode: row['memberCode'] || null,
              status: 'active',
              joinedDate: joinDateStr ? new Date(joinDateStr) : null,
            },
          });
        }
        successRows++;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        errors.push({ row: i + 2, field: 'general', message });
      }
    }

    const finalStatus = errors.length === 0 ? 'completed' : 'completed_with_errors';
    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: finalStatus, successRows,
        errorRows: errors.length,
        errorDetails: errors as object[],
        completedAt: new Date(),
      },
    });

    return {
      batchId: batch.id,
      totalRows: rows.length,
      successRows,
      errorRows: errors.length,
      errorDetails: errors,
      isDryRun: false,
      status: finalStatus,
    };
  }

  async getImportHistory(orgId: string, importType?: string) {
    return this.prisma.importBatch.findMany({
      where: { orgId, ...(importType ? { importType } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  getCsvTemplate(importType: string): string {
    const templates: Record<string, string> = {
      members: [
        'displayName,email,phone,role,branchCode,memberCode,joinDate',
        '"Nguyễn Văn An","nva@example.com","0901234567","user","THIEU","DS-001","2024-01-15"',
        '"Trần Thị Bình","ttb@example.com","0912345678","user","DONG","DS-002","2024-02-01"',
      ].join('\n'),
      assets: [
        'name,assetCode,categoryName,totalQuantity,condition,location',
        '"Lều Cắm Trại 4 Người","TENT-001","Dụng Cụ Cắm Trại","5","good","Kho Đoàn"',
        '"La Bàn Cầm Tay","NAV-002","Dụng Cụ Cắm Trại","10","new","Kho Đoàn"',
      ].join('\n'),
    };
    return templates[importType] ?? templates['members'] ?? '';
  }
}
