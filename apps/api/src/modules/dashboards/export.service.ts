import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

interface ColumnDef {
  key: string;
  header: string;
  transform?: (value: unknown) => string;
}

const EXPORT_DIR = path.resolve(process.cwd(), 'tmp', 'exports');
const DEFAULT_TTL_MINUTES = 30;

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor() {
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }
  }

  exportCSV(data: Record<string, unknown>[], columns: ColumnDef[], _filename?: string): Buffer {
    const header = columns.map((c) => this.escapeCsvField(c.header)).join(',');
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const raw = row[col.key];
          const val = col.transform ? col.transform(raw) : String(raw ?? '');
          return this.escapeCsvField(val);
        })
        .join(','),
    );

    const bom = '\uFEFF';
    return Buffer.from(bom + [header, ...rows].join('\r\n'), 'utf-8');
  }

  exportExcel(data: Record<string, unknown>[], columns: ColumnDef[], _filename?: string): Buffer {
    const header = columns.map((c) => c.header).join('\t');
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const raw = row[col.key];
          const val = col.transform ? col.transform(raw) : String(raw ?? '');
          return val.replace(/\t/g, ' ').replace(/\n/g, ' ');
        })
        .join('\t'),
    );

    const bom = '\uFEFF';
    return Buffer.from(bom + [header, ...rows].join('\r\n'), 'utf-8');
  }

  exportPDF(data: Record<string, unknown>[], columns: ColumnDef[], _filename?: string): Buffer {
    const lines: string[] = [];
    const headerLine = columns.map((c) => c.header.padEnd(20)).join(' | ');
    const separator = '-'.repeat(headerLine.length);

    lines.push(headerLine);
    lines.push(separator);

    for (const row of data) {
      const line = columns
        .map((col) => {
          const raw = row[col.key];
          const val = col.transform ? col.transform(raw) : String(raw ?? '');
          return val.substring(0, 20).padEnd(20);
        })
        .join(' | ');
      lines.push(line);
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  generateSignedUrl(buffer: Buffer, filename: string, ttlMinutes = DEFAULT_TTL_MINUTES): { url: string; expiresAt: Date } {
    const token = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(filename) || '.csv';
    const storedName = `${token}${ext}`;
    const filePath = path.join(EXPORT_DIR, storedName);

    fs.writeFileSync(filePath, buffer);

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        this.logger.debug(`Cleaned up export file: ${storedName}`);
      } catch {
        this.logger.warn(`Failed to clean up: ${storedName}`);
      }
    }, ttlMinutes * 60 * 1000);

    return {
      url: `/exports/${storedName}`,
      expiresAt,
    };
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
