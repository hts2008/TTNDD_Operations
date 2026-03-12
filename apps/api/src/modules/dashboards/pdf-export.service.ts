import { Injectable, Logger } from '@nestjs/common';

/**
 * PDF Export Service — STORY-007 T-0188
 *
 * Generates PDF reports from dashboard data.
 * Uses basic HTML→text approach (no heavy dependencies).
 * For production, integrate pdfkit or puppeteer-based rendering.
 */
@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  /**
   * Generate a simple PDF buffer from structured report data.
   * Currently returns a formatted text buffer with PDF-like structure.
   */
  async generateReport(params: {
    orgName: string;
    reportTitle: string;
    generatedAt: Date;
    data: Record<string, unknown>[];
    columns: string[];
  }): Promise<Buffer> {
    const { orgName, reportTitle, generatedAt, data, columns } = params;

    // ── Build a simple text-based report (PDF placeholder) ──
    // In production, replace with pdfkit or a proper PDF library
    const lines: string[] = [];

    // Header
    lines.push('═'.repeat(80));
    lines.push(`  ${reportTitle}`);
    lines.push(`  Tổ chức: ${orgName}`);
    lines.push(`  Ngày xuất: ${generatedAt.toISOString()}`);
    lines.push('═'.repeat(80));
    lines.push('');

    // Column headers
    const headerRow = columns.map((c) => c.padEnd(20)).join(' | ');
    lines.push(headerRow);
    lines.push('─'.repeat(headerRow.length));

    // Data rows
    for (const row of data) {
      const rowText = columns
        .map((col) => String(row[col] ?? '').padEnd(20))
        .join(' | ');
      lines.push(rowText);
    }

    lines.push('');
    lines.push('─'.repeat(80));
    lines.push(`  Watermark: ${orgName} — Exported ${generatedAt.toLocaleDateString('vi-VN')}`);
    lines.push('═'.repeat(80));

    const content = lines.join('\n');
    this.logger.debug(`PDF report generated: ${reportTitle} (${data.length} rows)`);

    return Buffer.from(content, 'utf-8');
  }

  /**
   * Generate signed URL with TTL for report download.
   * In production, upload to GCS and return a signed URL.
   */
  generateTtlUrl(reportId: string, ttlMinutes = 30): { url: string; expiresAt: Date } {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    // Placeholder: in production, upload buffer to GCS and generate signed URL
    const url = `/api/dashboards/reports/${reportId}/download?token=${Buffer.from(`${reportId}:${expiresAt.getTime()}`).toString('base64')}`;

    return { url, expiresAt };
  }

  /**
   * Validate a download token (TTL check).
   */
  validateToken(token: string): { reportId: string; valid: boolean } {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const parts = decoded.split(':');
      const reportId = parts[0] ?? '';
      const expiresAtStr = parts[1] ?? '0';
      const expiresAt = parseInt(expiresAtStr, 10);

      if (isNaN(expiresAt) || Date.now() > expiresAt) {
        return { reportId: reportId ?? '', valid: false };
      }

      return { reportId, valid: true };
    } catch {
      return { reportId: '', valid: false };
    }
  }
}
