import { BadRequestException } from '@nestjs/common';
import { FileValidationPipe, ALLOWED_MIME_TYPES } from './file-validation.pipe';

/** Minimal file interface matching Express.Multer.File for testing */
interface MockFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  stream: any;
  destination: string;
  filename: string;
  path: string;
}

function mockFile(overrides: Partial<MockFile> = {}): MockFile {
  return {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

describe('FileValidationPipe', () => {
  let pipe: FileValidationPipe;

  beforeEach(() => {
    pipe = new FileValidationPipe();
  });

  it('should accept a valid JPEG file', () => {
    const file = mockFile();
    expect(pipe.transform(file as any)).toBe(file);
  });

  it('should accept a valid PDF file', () => {
    const file = mockFile({
      originalname: 'doc.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]),
    });
    expect(pipe.transform(file as any)).toBe(file);
  });

  it('should reject disallowed MIME type', () => {
    const file = mockFile({ mimetype: 'application/x-executable' });
    expect(() => pipe.transform(file as any)).toThrow(BadRequestException);
  });

  it('should reject file exceeding max size', () => {
    const file = mockFile({ size: 20 * 1024 * 1024 }); // 20MB
    expect(() => pipe.transform(file as any)).toThrow(BadRequestException);
  });

  it('should reject when no file provided', () => {
    expect(() => pipe.transform(null as any)).toThrow('File is required');
  });

  it('should detect MIME spoofing via magic bytes', () => {
    const file = mockFile({
      mimetype: 'image/jpeg',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), // PNG magic bytes with JPEG mime
    });
    expect(() => pipe.transform(file as any)).toThrow('MIME spoofing');
  });

  it('should sanitise filenames with path traversal', () => {
    const file = mockFile({ originalname: '../../../etc/passwd' });
    const result = pipe.transform(file as any);
    expect(result.originalname).not.toContain('..');
    expect(result.originalname).not.toContain('/');
  });

  it('should respect category filter', () => {
    const imagePipe = new FileValidationPipe({ categories: ['image'] });
    const pdfFile = mockFile({
      mimetype: 'application/pdf',
      buffer: Buffer.from([0x25, 0x50, 0x44, 0x46]),
    });
    expect(() => imagePipe.transform(pdfFile as any)).toThrow(BadRequestException);
  });

  it('should respect custom max size', () => {
    const smallPipe = new FileValidationPipe({ maxSize: 512 });
    const file = mockFile({ size: 1024 });
    expect(() => smallPipe.transform(file as any)).toThrow(BadRequestException);
  });
});
