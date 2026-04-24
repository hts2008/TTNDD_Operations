import { BadRequestException } from '@nestjs/common';
import { FileValidationPipe } from './file-validation.pipe';

describe('FileValidationPipe', () => {
  let pipe: FileValidationPipe;

  const makeFile = (overrides: Record<string, unknown> = {}) => ({
    fieldname: 'file',
    originalname: 'test.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    size: 1024,
    ...overrides,
  });

  beforeEach(() => {
    pipe = new FileValidationPipe();
  });

  it('should accept valid PNG file', () => {
    const file = makeFile();
    const result = pipe.transform(file as any);
    expect(result).toBeDefined();
    expect(result.originalname).toBe('test.png');
  });

  it('should reject when no file', () => {
    expect(() => pipe.transform(null as any)).toThrow(BadRequestException);
  });

  it('should reject oversized file', () => {
    const file = makeFile({ size: 11 * 1024 * 1024 });
    expect(() => pipe.transform(file as any)).toThrow('exceeds limit');
  });

  it('should reject disallowed MIME type', () => {
    const file = makeFile({ mimetype: 'application/x-executable' });
    expect(() => pipe.transform(file as any)).toThrow('not allowed');
  });

  it('should reject mismatched magic bytes', () => {
    const file = makeFile({
      mimetype: 'image/png',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    });
    expect(() => pipe.transform(file as any)).toThrow('does not match');
  });

  it('should accept valid JPEG magic bytes', () => {
    const file = makeFile({
      mimetype: 'image/jpeg',
      originalname: 'photo.jpg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]),
    });
    expect(pipe.transform(file as any).originalname).toBe('photo.jpg');
  });

  it('should reject dangerous file extensions', () => {
    const file = makeFile({ originalname: 'malware.exe', mimetype: 'application/pdf', buffer: Buffer.from([0x25, 0x50, 0x44, 0x46]) });
    expect(() => pipe.transform(file as any)).toThrow('not allowed');
  });

  it('should sanitize dangerous characters in filename', () => {
    const file = makeFile({ originalname: 'test<script>.png' });
    const result = pipe.transform(file as any);
    expect(result.originalname).not.toContain('<');
    expect(result.originalname).not.toContain('>');
  });

  it('should truncate long filenames', () => {
    const longName = 'a'.repeat(300) + '.png';
    const file = makeFile({ originalname: longName });
    const result = pipe.transform(file as any);
    expect(result.originalname.length).toBeLessThanOrEqual(255);
  });
});
