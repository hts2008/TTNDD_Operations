import {
  PipeTransform,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';

/**
 * Minimal file interface compatible with Express.Multer.File.
 * Defined locally to avoid hard dependency on @types/multer.
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  stream?: any;
  destination?: string;
  filename?: string;
  path?: string;
}

/**
 * Allowed MIME types for file uploads.
 * This is the whitelist — anything not listed here is rejected.
 */
export const ALLOWED_MIME_TYPES: Record<string, readonly string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf'],
  data: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
} as const;

const ALL_ALLOWED_MIMES = Object.values(ALLOWED_MIME_TYPES).flat();

/**
 * Magic‑bytes signatures for MIME type verification.
 * Prevents MIME spoofing by checking actual file content.
 */
const MAGIC_BYTES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
];

/** Default max file size: 10 MB */
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

/** Characters forbidden in filenames (path traversal prevention) */
const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

export interface FileValidationOptions {
  /** Max file size in bytes. Default 10 MB. */
  maxSize?: number;
  /** Restrict to a subset of ALLOWED_MIME_TYPES keys (e.g. ['image']). */
  categories?: Array<keyof typeof ALLOWED_MIME_TYPES>;
  /** Enable magic-bytes check. Default true for binary uploads. */
  checkMagicBytes?: boolean;
}

/**
 * T-0204 — File Validation Pipe
 *
 * Validates uploaded files before they reach any handler:
 * 1. MIME type whitelist
 * 2. Max file size enforcement
 * 3. Magic bytes verification (anti-MIME-spoofing)
 * 4. Filename sanitisation (path traversal prevention)
 *
 * Usage:
 * ```ts
 * @Post('upload')
 * @UseInterceptors(FileInterceptor('file'))
 * uploadFile(@UploadedFile(new FileValidationPipe()) file: Express.Multer.File) { ... }
 * ```
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly logger = new Logger(FileValidationPipe.name);
  private readonly maxSize: number;
  private readonly allowedMimes: string[];
  private readonly checkMagicBytes: boolean;

  constructor(private readonly options: FileValidationOptions = {}) {
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
    this.checkMagicBytes = options.checkMagicBytes ?? true;

    if (options.categories?.length) {
      this.allowedMimes = options.categories.flatMap(
        (cat) => ALLOWED_MIME_TYPES[cat] ?? [],
      );
    } else {
      this.allowedMimes = [...ALL_ALLOWED_MIMES];
    }
  }

  transform(file: UploadedFile): UploadedFile {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // 1. MIME type whitelist check
    if (!this.allowedMimes.includes(file.mimetype)) {
      this.logger.warn(
        `Rejected file upload: invalid MIME type "${file.mimetype}" for "${file.originalname}"`,
      );
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed. Accepted: ${this.allowedMimes.join(', ')}`,
      );
    }

    // 2. File size check
    if (file.size > this.maxSize) {
      const maxMB = (this.maxSize / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(
        `File size ${(file.size / (1024 * 1024)).toFixed(1)} MB exceeds limit of ${maxMB} MB`,
      );
    }

    // 3. Magic bytes verification
    if (this.checkMagicBytes && file.buffer?.length) {
      this.verifyMagicBytes(file);
    }

    // 4. Sanitise filename
    file.originalname = this.sanitiseFilename(file.originalname);

    return file;
  }

  private verifyMagicBytes(file: UploadedFile): void {
    const signature = MAGIC_BYTES.find((sig) => sig.mime === file.mimetype);
    if (!signature) return; // No magic bytes rule for this MIME → skip

    const headerBytes = Array.from(file.buffer.slice(0, signature.bytes.length));
    const matches = signature.bytes.every(
      (byte, idx) => headerBytes[idx] === byte,
    );

    if (!matches) {
      this.logger.warn(
        `Magic-bytes mismatch: claimed "${file.mimetype}" but header does not match for "${file.originalname}"`,
      );
      throw new BadRequestException(
        'File content does not match the declared file type (possible MIME spoofing)',
      );
    }
  }

  private sanitiseFilename(name: string): string {
    // Remove path components
    const basename = name.replace(/^.*[\\/]/, '');
    // Remove unsafe characters
    const safe = basename.replace(UNSAFE_FILENAME_CHARS, '_');
    // Limit length
    return safe.slice(0, 255);
  }
}
