import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma, type ImportBatch } from '@prisma/client';
import { PrismaService } from '../../core/database';

export interface ImportRow {
  [key: string]: string;
}

export interface ImportErrorDetail {
  row: number;
  field: string;
  message: string;
}

export interface ImportReportRow {
  row: number;
  email: string;
  memberCode: string;
  branchCode: string;
  status: 'success' | 'validated' | 'duplicate' | 'error';
  message: string;
}

export interface ImportValidationReport {
  generatedAt: string;
  importType: 'members';
  sourceHash: string;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  duplicateRows: number;
  validRows: number;
  errors: ImportErrorDetail[];
  rows: ImportReportRow[];
}

export interface ImportResult {
  batchId: string;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  duplicateRows: number;
  progressPct: number;
  errorDetails: ImportErrorDetail[];
  validationReport: ImportValidationReport;
  reportUrl: string;
  isDryRun: boolean;
  status: string;
}

export interface QueuedImportResult {
  batchId: string;
  status: string;
  totalRows: number;
  processedRows: number;
  progressPct: number;
  duplicateRows: number;
  errorRows: number;
  sourceHash: string;
  isDryRun: boolean;
  reportUrl: string;
}

type ImportBatchSummaryRecord = Pick<
  ImportBatch,
  | 'id'
  | 'orgId'
  | 'importType'
  | 'status'
  | 'totalRows'
  | 'processedRows'
  | 'successRows'
  | 'errorRows'
  | 'duplicateRows'
  | 'progressPct'
  | 'errorDetails'
  | 'validationReport'
  | 'sourceHash'
  | 'importedBy'
  | 'isDryRun'
  | 'createdAt'
  | 'startedAt'
  | 'completedAt'
>;

type ImportExecutionState = {
  processedRows: number;
  successRows: number;
  errorRows: number;
  duplicateRows: number;
  errors: ImportErrorDetail[];
  reportRows: ImportReportRow[];
};

const MEMBERS_IMPORT_TYPE = 'members';
const REQUIRED_MEMBER_FIELDS = ['displayName', 'email', 'role', 'branchCode'];
const ALLOWED_MEMBER_ROLES = ['user', 'admin', 'super_admin', 'parent'];

const IMPORT_BATCH_SUMMARY_SELECT = {
  id: true,
  orgId: true,
  importType: true,
  status: true,
  totalRows: true,
  processedRows: true,
  successRows: true,
  errorRows: true,
  duplicateRows: true,
  progressPct: true,
  errorDetails: true,
  validationReport: true,
  sourceHash: true,
  importedBy: true,
  isDryRun: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
} satisfies Prisma.ImportBatchSelect;

@Injectable()
export class DataImportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DataImportService.name);
  private worker?: ReturnType<typeof setInterval>;
  private readonly runningBatches = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.DATA_IMPORT_WORKER_DISABLED === 'true') {
      return;
    }

    const intervalMs = Number(process.env.DATA_IMPORT_WORKER_INTERVAL_MS ?? 5000);
    this.worker = setInterval(
      () => {
        void this.drainQueuedMemberImports().catch((error) => {
          this.logger.error(`Data import worker drain failed: ${this.errorMessage(error)}`);
        });
      },
      Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 5000,
    );

    setTimeout(() => {
      void this.drainQueuedMemberImports().catch((error) => {
        this.logger.error(`Initial data import drain failed: ${this.errorMessage(error)}`);
      });
    }, 0);
  }

  onModuleDestroy() {
    if (this.worker) {
      clearInterval(this.worker);
      this.worker = undefined;
    }
  }

  parseCsv(csvContent: string): ImportRow[] {
    const normalized = (csvContent ?? '').trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row + at least 1 data row');
    }
    const headers = (lines[0] as string).split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map((line) => {
      const vals = this.parseCsvLine(line);
      return headers.reduce(
        (acc, h, i) => ({ ...acc, [h]: vals[i]?.trim().replace(/^"|"$/g, '') ?? '' }),
        {} as ImportRow,
      );
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
    const sourceHash = this.hashSource(csvContent);
    const batch = await this.prisma.importBatch.create({
      data: {
        orgId,
        importType: MEMBERS_IMPORT_TYPE,
        status: 'processing',
        totalRows: rows.length,
        processedRows: 0,
        successRows: 0,
        errorRows: 0,
        duplicateRows: 0,
        progressPct: 0,
        errorDetails: [],
        validationReport: this.toJson(this.emptyReport(sourceHash, rows.length)),
        reportCsv: this.buildReportCsv([]),
        sourceHash,
        sourcePayload: this.toJson(rows),
        importedBy,
        isDryRun,
        startedAt: new Date(),
      },
      select: IMPORT_BATCH_SUMMARY_SELECT,
    });

    return this.executeMembersImportBatch(batch.id, orgId, importedBy, rows, isDryRun, sourceHash);
  }

  async queueMembersImport(
    orgId: string,
    importedBy: string,
    csvContent: string,
    isDryRun = false,
  ): Promise<QueuedImportResult> {
    const rows = this.parseCsv(csvContent);
    const sourceHash = this.hashSource(csvContent);
    const batch = await this.prisma.importBatch.create({
      data: {
        orgId,
        importType: MEMBERS_IMPORT_TYPE,
        status: 'queued',
        totalRows: rows.length,
        processedRows: 0,
        successRows: 0,
        errorRows: 0,
        duplicateRows: 0,
        progressPct: 0,
        errorDetails: [],
        validationReport: this.toJson(this.emptyReport(sourceHash, rows.length)),
        reportCsv: this.buildReportCsv([]),
        sourceHash,
        sourcePayload: this.toJson(rows),
        importedBy,
        isDryRun,
      },
      select: IMPORT_BATCH_SUMMARY_SELECT,
    });

    setTimeout(() => {
      void this.processQueuedMembersBatch(batch.id).catch((error) => {
        this.logger.error(`Queued import ${batch.id} failed: ${this.errorMessage(error)}`);
      });
    }, 0);

    return {
      batchId: batch.id,
      status: batch.status,
      totalRows: batch.totalRows,
      processedRows: batch.processedRows,
      progressPct: batch.progressPct,
      duplicateRows: batch.duplicateRows,
      errorRows: batch.errorRows,
      sourceHash,
      isDryRun,
      reportUrl: this.reportUrl(batch.id),
    };
  }

  async getImportHistory(orgId: string, importType?: string) {
    return this.prisma.importBatch.findMany({
      where: { orgId, ...(importType ? { importType } : {}) },
      select: IMPORT_BATCH_SUMMARY_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getImportBatch(orgId: string, batchId: string) {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id: batchId, orgId },
      select: IMPORT_BATCH_SUMMARY_SELECT,
    });
    if (!batch) {
      throw new NotFoundException('Import batch not found');
    }
    return { ...batch, reportUrl: this.reportUrl(batch.id) };
  }

  async getImportReportCsv(orgId: string, batchId: string) {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id: batchId, orgId },
      select: {
        id: true,
        reportCsv: true,
        errorDetails: true,
        sourceHash: true,
        totalRows: true,
      },
    });
    if (!batch) {
      throw new NotFoundException('Import batch not found');
    }
    if (batch.reportCsv) {
      return batch.reportCsv;
    }

    const errors = this.jsonArray<ImportErrorDetail>(batch.errorDetails);
    return this.buildReportCsv(
      errors.map((error) => ({
        row: error.row,
        email: '',
        memberCode: '',
        branchCode: '',
        status: 'error',
        message: error.message,
      })),
    );
  }

  getCsvTemplate(importType: string): string {
    const templates: Record<string, string> = {
      members: [
        'displayName,email,phone,role,branchCode,memberCode,joinDate',
        '"Nguyen Van An","nva@example.com","0901234567","user","THIEU","DS-001","2024-01-15"',
        '"Tran Thi Binh","ttb@example.com","0912345678","user","DONG","DS-002","2024-02-01"',
      ].join('\n'),
      assets: [
        'name,assetCode,categoryName,totalQuantity,condition,location',
        '"Leu Cam Trai 4 Nguoi","TENT-001","Dung Cu Cam Trai","5","good","Kho Doan"',
        '"La Ban Cam Tay","NAV-002","Dung Cu Cam Trai","10","new","Kho Doan"',
      ].join('\n'),
    };
    return templates[importType] ?? templates['members'] ?? '';
  }

  private async drainQueuedMemberImports() {
    const queued = await this.prisma.importBatch.findMany({
      where: { importType: MEMBERS_IMPORT_TYPE, status: 'queued' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    for (const batch of queued) {
      await this.processQueuedMembersBatch(batch.id);
    }
  }

  private async processQueuedMembersBatch(batchId: string) {
    if (this.runningBatches.has(batchId)) {
      return;
    }
    this.runningBatches.add(batchId);
    try {
      const lock = await this.prisma.importBatch.updateMany({
        where: { id: batchId, status: 'queued' },
        data: { status: 'processing', startedAt: new Date() },
      });
      if (lock.count === 0) {
        return;
      }

      const batch = await this.prisma.importBatch.findUnique({
        where: { id: batchId },
        select: {
          id: true,
          orgId: true,
          importedBy: true,
          isDryRun: true,
          sourceHash: true,
          sourcePayload: true,
        },
      });
      if (!batch) {
        return;
      }

      const rows = this.rowsFromPayload(batch.sourcePayload);
      await this.executeMembersImportBatch(
        batch.id,
        batch.orgId,
        batch.importedBy ?? '',
        rows,
        batch.isDryRun,
        batch.sourceHash ?? this.hashRows(rows),
      );
    } catch (error) {
      await this.markBatchFailed(batchId, error);
      throw error;
    } finally {
      this.runningBatches.delete(batchId);
    }
  }

  private async executeMembersImportBatch(
    batchId: string,
    orgId: string,
    importedBy: string,
    rows: ImportRow[],
    isDryRun: boolean,
    sourceHash: string,
  ): Promise<ImportResult> {
    const context = await this.buildMemberImportContext(orgId, rows);
    const state: ImportExecutionState = {
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
      duplicateRows: 0,
      errors: [],
      reportRows: [],
    };

    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: 'processing',
        startedAt: new Date(),
        progressPct: 0,
        processedRows: 0,
      },
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as ImportRow;
      const rowNumber = i + 2;
      const rowCheck = this.validateMemberRow(row, i, rowNumber, context);

      if (rowCheck.errors.length > 0) {
        state.errorRows += 1;
        state.errors.push(...rowCheck.errors);
        state.reportRows.push(
          this.buildReportRow(
            row,
            rowNumber,
            'error',
            rowCheck.errors.map((e) => e.message).join('; '),
          ),
        );
      } else if (rowCheck.duplicateReasons.length > 0) {
        state.duplicateRows += 1;
        state.reportRows.push(
          this.buildReportRow(row, rowNumber, 'duplicate', rowCheck.duplicateReasons.join('; ')),
        );
      } else if (isDryRun) {
        state.successRows += 1;
        state.reportRows.push(this.buildReportRow(row, rowNumber, 'validated', 'Valid row'));
      } else {
        await this.importMemberRow(orgId, importedBy, row, rowCheck.branchId, i, sourceHash, state);
      }

      state.processedRows = i + 1;
      await this.persistBatchProgress(batchId, sourceHash, rows.length, state, 'processing');
    }

    const finalStatus = this.resolveFinalStatus(isDryRun, state);
    await this.persistBatchProgress(batchId, sourceHash, rows.length, state, finalStatus, true);
    const saved = await this.getImportBatch(orgId, batchId);

    return {
      batchId: saved.id,
      totalRows: saved.totalRows,
      processedRows: saved.processedRows,
      successRows: saved.successRows,
      errorRows: saved.errorRows,
      duplicateRows: saved.duplicateRows,
      progressPct: saved.progressPct,
      errorDetails: this.jsonArray<ImportErrorDetail>(saved.errorDetails),
      validationReport: this.reportFromJson(saved.validationReport),
      reportUrl: this.reportUrl(saved.id),
      isDryRun: saved.isDryRun,
      status: saved.status,
    };
  }

  private async importMemberRow(
    orgId: string,
    importedBy: string,
    row: ImportRow,
    branchId: string,
    rowIndex: number,
    sourceHash: string,
    state: ImportExecutionState,
  ) {
    const rowNumber = rowIndex + 2;
    const email = this.normalizeEmail(row['email']);
    try {
      let user = await this.prisma.user.findFirst({ where: { email } });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            firebaseUid: `import-${sourceHash.slice(0, 12)}-${rowIndex}-${Date.now()}`,
            email,
            displayName: row['displayName'] || email,
            phone: row['phone'] || null,
          },
        });
      }

      const joinDateStr = row['joinDate'] as string | undefined;
      await this.prisma.orgMember.create({
        data: {
          orgId,
          userId: user.id,
          role: row['role'] || 'user',
          branchId,
          memberCode: row['memberCode'] || null,
          status: 'active',
          scoutName: row['displayName'] || null,
          joinedDate: joinDateStr ? new Date(joinDateStr) : null,
          meta: { importedBy, importSourceHash: sourceHash },
        },
      });

      state.successRows += 1;
      state.reportRows.push(this.buildReportRow(row, rowNumber, 'success', 'Imported member'));
    } catch (error) {
      const message = this.errorMessage(error);
      state.errorRows += 1;
      state.errors.push({ row: rowNumber, field: 'general', message });
      state.reportRows.push(this.buildReportRow(row, rowNumber, 'error', message));
    }
  }

  private async buildMemberImportContext(orgId: string, rows: ImportRow[]) {
    const branchCodes = this.uniqueValues(rows.map((row) => this.normalizeCode(row['branchCode'])));
    const emails = this.uniqueValues(rows.map((row) => this.normalizeEmail(row['email'])));
    const memberCodes = this.uniqueValues(rows.map((row) => this.normalizeCode(row['memberCode'])));

    const [branches, users, membersByCode] = await Promise.all([
      this.prisma.branch.findMany({
        where: { orgId, code: { in: branchCodes } },
        select: { id: true, code: true },
      }),
      this.prisma.user.findMany({
        where: { email: { in: emails } },
        select: {
          id: true,
          email: true,
          orgMembers: {
            where: { orgId },
            select: { id: true },
          },
        },
      }),
      memberCodes.length > 0
        ? this.prisma.orgMember.findMany({
            where: { orgId, memberCode: { in: memberCodes } },
            select: { memberCode: true },
          })
        : Promise.resolve([]),
    ]);

    const firstEmailRow = new Map<string, number>();
    const firstMemberCodeRow = new Map<string, number>();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as ImportRow;
      const email = this.normalizeEmail(row['email']);
      const memberCode = this.normalizeCode(row['memberCode']);
      if (email && !firstEmailRow.has(email)) {
        firstEmailRow.set(email, i);
      }
      if (memberCode && !firstMemberCodeRow.has(memberCode)) {
        firstMemberCodeRow.set(memberCode, i);
      }
    }

    return {
      branchesByCode: new Map(branches.map((branch) => [branch.code.toUpperCase(), branch.id])),
      existingMemberEmails: new Set(
        users
          .filter((user) => user.email && user.orgMembers.length > 0)
          .map((user) => this.normalizeEmail(user.email)),
      ),
      existingMemberCodes: new Set(
        membersByCode.map((member) => this.normalizeCode(member.memberCode)),
      ),
      firstEmailRow,
      firstMemberCodeRow,
    };
  }

  private validateMemberRow(
    row: ImportRow,
    rowIndex: number,
    rowNumber: number,
    context: Awaited<ReturnType<DataImportService['buildMemberImportContext']>>,
  ) {
    const errors: ImportErrorDetail[] = [];
    const duplicateReasons: string[] = [];

    for (const field of REQUIRED_MEMBER_FIELDS) {
      if (!row[field]?.trim()) {
        errors.push({ row: rowNumber, field, message: `Field '${field}' is required` });
      }
    }

    const email = this.normalizeEmail(row['email']);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNumber, field: 'email', message: `Invalid email: ${email}` });
    }

    const role = row['role'] || '';
    if (role && !ALLOWED_MEMBER_ROLES.includes(role)) {
      errors.push({
        row: rowNumber,
        field: 'role',
        message: `Invalid role: ${role}. Allowed: ${ALLOWED_MEMBER_ROLES.join(', ')}`,
      });
    }

    const branchCode = this.normalizeCode(row['branchCode']);
    const branchId = context.branchesByCode.get(branchCode);
    if (branchCode && !branchId) {
      errors.push({
        row: rowNumber,
        field: 'branchCode',
        message: `Branch '${branchCode}' not found in org`,
      });
    }

    if (email && context.firstEmailRow.get(email) !== rowIndex) {
      duplicateReasons.push(`Duplicate email '${email}' in CSV`);
    } else if (email && context.existingMemberEmails.has(email)) {
      duplicateReasons.push(`Email '${email}' already belongs to a member in this org`);
    }

    const memberCode = this.normalizeCode(row['memberCode']);
    if (memberCode && context.firstMemberCodeRow.get(memberCode) !== rowIndex) {
      duplicateReasons.push(`Duplicate memberCode '${memberCode}' in CSV`);
    } else if (memberCode && context.existingMemberCodes.has(memberCode)) {
      duplicateReasons.push(`MemberCode '${memberCode}' already exists in this org`);
    }

    return { errors, duplicateReasons, branchId: branchId ?? '' };
  }

  private async persistBatchProgress(
    batchId: string,
    sourceHash: string,
    totalRows: number,
    state: ImportExecutionState,
    status: string,
    completed = false,
  ) {
    const progressPct = totalRows > 0 ? Math.round((state.processedRows / totalRows) * 100) : 100;
    const report = this.buildValidationReport(sourceHash, totalRows, state);
    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status,
        processedRows: state.processedRows,
        successRows: state.successRows,
        errorRows: state.errorRows,
        duplicateRows: state.duplicateRows,
        progressPct: completed ? 100 : progressPct,
        errorDetails: this.toJson(state.errors),
        validationReport: this.toJson(report),
        reportCsv: this.buildReportCsv(state.reportRows),
        completedAt: completed ? new Date() : undefined,
      },
    });
  }

  private async markBatchFailed(batchId: string, error: unknown) {
    const message = this.errorMessage(error);
    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: 'failed',
        errorRows: { increment: 1 },
        progressPct: 100,
        errorDetails: this.toJson([{ row: 0, field: 'general', message }]),
        validationReport: this.toJson({
          generatedAt: new Date().toISOString(),
          importType: MEMBERS_IMPORT_TYPE,
          sourceHash: '',
          totalRows: 0,
          processedRows: 0,
          successRows: 0,
          errorRows: 1,
          duplicateRows: 0,
          validRows: 0,
          errors: [{ row: 0, field: 'general', message }],
          rows: [],
        }),
        reportCsv: this.buildReportCsv([
          { row: 0, email: '', memberCode: '', branchCode: '', status: 'error', message },
        ]),
        completedAt: new Date(),
      },
    });
  }

  private resolveFinalStatus(isDryRun: boolean, state: ImportExecutionState) {
    if (isDryRun) {
      return state.errorRows > 0 || state.duplicateRows > 0 ? 'dry_run_with_errors' : 'dry_run_ok';
    }
    if (state.successRows === 0 && state.errorRows > 0 && state.duplicateRows === 0) {
      return 'validation_failed';
    }
    return state.errorRows > 0 || state.duplicateRows > 0 ? 'completed_with_errors' : 'completed';
  }

  private buildValidationReport(
    sourceHash: string,
    totalRows: number,
    state: ImportExecutionState,
  ): ImportValidationReport {
    return {
      generatedAt: new Date().toISOString(),
      importType: MEMBERS_IMPORT_TYPE,
      sourceHash,
      totalRows,
      processedRows: state.processedRows,
      successRows: state.successRows,
      errorRows: state.errorRows,
      duplicateRows: state.duplicateRows,
      validRows: state.successRows,
      errors: state.errors,
      rows: state.reportRows,
    };
  }

  private emptyReport(sourceHash: string, totalRows: number): ImportValidationReport {
    return this.buildValidationReport(sourceHash, totalRows, {
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
      duplicateRows: 0,
      errors: [],
      reportRows: [],
    });
  }

  private buildReportRow(
    row: ImportRow,
    rowNumber: number,
    status: ImportReportRow['status'],
    message: string,
  ): ImportReportRow {
    return {
      row: rowNumber,
      email: this.normalizeEmail(row['email']),
      memberCode: this.normalizeCode(row['memberCode']),
      branchCode: this.normalizeCode(row['branchCode']),
      status,
      message,
    };
  }

  private buildReportCsv(rows: ImportReportRow[]) {
    const header = ['row', 'email', 'memberCode', 'branchCode', 'status', 'message'];
    const body = rows.map((row) =>
      [row.row, row.email, row.memberCode, row.branchCode, row.status, row.message]
        .map((value) => this.csvCell(value))
        .join(','),
    );
    return [header.join(','), ...body].join('\n');
  }

  private csvCell(value: unknown) {
    const raw = String(value ?? '');
    return `"${raw.replace(/"/g, '""')}"`;
  }

  private rowsFromPayload(payload: Prisma.JsonValue): ImportRow[] {
    if (!Array.isArray(payload)) {
      return [];
    }
    return payload
      .filter((row) => !!row && typeof row === 'object' && !Array.isArray(row))
      .map((row) => {
        const record = row as Record<string, unknown>;
        return Object.fromEntries(
          Object.entries(record).map(([key, value]) => [key, String(value ?? '')]),
        );
      });
  }

  private reportFromJson(value: Prisma.JsonValue): ImportValidationReport {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as unknown as ImportValidationReport;
    }
    return this.emptyReport('', 0);
  }

  private jsonArray<T>(value: Prisma.JsonValue): T[] {
    return Array.isArray(value) ? (value as unknown as T[]) : [];
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private uniqueValues(values: string[]) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  private normalizeEmail(email?: string | null) {
    return (email ?? '').trim().toLowerCase();
  }

  private normalizeCode(code?: string | null) {
    return (code ?? '').trim().toUpperCase();
  }

  private hashSource(csvContent: string) {
    return createHash('sha256').update(csvContent).digest('hex');
  }

  private hashRows(rows: ImportRow[]) {
    return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  }

  private reportUrl(batchId: string) {
    return `/api/v1/data-import/batches/${batchId}/report`;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
