import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

const MAGIC_BYTES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// eslint-disable-next-line no-control-regex
const DANGEROUS_PATTERNS = /[<>:"/\\|?*\x00-\x1f]/g;
const DANGEROUS_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.scr',
  '.pif',
  '.js',
  '.vbs',
  '.wsf',
  '.ps1',
  '.sh',
  '.php',
]);

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(file: UploadedFile): UploadedFile {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(`File type "${file.mimetype}" is not allowed`);
    }

    this.validateMagicBytes(file);

    file.originalname = this.sanitizeFilename(file.originalname);

    return file;
  }

  private validateMagicBytes(file: UploadedFile): void {
    if (!file.buffer || file.buffer.length < 4) return;

    const signature = MAGIC_BYTES.find((s) => s.mime === file.mimetype);
    if (!signature) return;

    const headerBytes = Array.from(file.buffer.subarray(0, signature.bytes.length));
    const matches = signature.bytes.every((b, i) => headerBytes[i] === b);

    if (!matches) {
      throw new BadRequestException('File content does not match declared MIME type');
    }
  }

  private sanitizeFilename(name: string): string {
    let sanitized = name.replace(DANGEROUS_PATTERNS, '_');

    const ext = sanitized.substring(sanitized.lastIndexOf('.')).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`File extension "${ext}" is not allowed`);
    }

    sanitized = sanitized.substring(0, 255);

    return sanitized;
  }
}
