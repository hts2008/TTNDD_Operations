import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { PrismaService } from '../../core/database';
import { STORAGE_ADAPTER } from './storage-adapter.interface';

describe('FileStorageService', () => {
  let service: FileStorageService;
  let prisma: any;
  let storageAdapter: any;

  const mockFileRef = {
    id: 'f-1',
    orgId: 'org-1',
    bucketName: 'ttndd-ops-files',
    objectKey: 'org-1/general/123-test.pdf',
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    sizeBytes: BigInt(1024),
    status: 'READY',
    checksum: 'sha256:existing',
    scanStatus: 'CLEAN',
    scanError: null,
    finalizedAt: new Date(),
    deletedAt: null,
    uploadedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      fileObjectRef: {
        create: jest.fn().mockResolvedValue(mockFileRef),
        findFirst: jest.fn().mockResolvedValue(mockFileRef),
        findMany: jest.fn().mockResolvedValue([mockFileRef]),
        update: jest.fn().mockResolvedValue({ ...mockFileRef, deletedAt: new Date() }),
      },
    };
    storageAdapter = {
      name: 'test-adapter',
      generateUploadUrl: jest.fn().mockResolvedValue({
        uploadUrl: 'http://test/upload',
        expiresAt: new Date(),
      }),
      generateDownloadUrl: jest.fn().mockResolvedValue({
        downloadUrl: 'http://test/download',
        expiresAt: new Date(),
      }),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        { provide: PrismaService, useValue: prisma },
        { provide: STORAGE_ADAPTER, useValue: storageAdapter },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
  });

  // ── createUploadRequest ────────────────────────────────

  describe('createUploadRequest', () => {
    it('should create file ref and return signed URL', async () => {
      const result = await service.createUploadRequest('org-1', 'u-1', {
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      });
      expect(result.uploadUrl).toBe('http://test/upload');
      expect(result.fileRefId).toBe('f-1');
      expect(storageAdapter.generateUploadUrl).toHaveBeenCalled();
      expect(prisma.fileObjectRef.create).toHaveBeenCalled();
    });

    it('should reject invalid MIME type', async () => {
      await expect(
        service.createUploadRequest('org-1', 'u-1', {
          originalName: 'test.exe',
          mimeType: 'application/x-msdownload',
          sizeBytes: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file exceeding 50MB', async () => {
      await expect(
        service.createUploadRequest('org-1', 'u-1', {
          originalName: 'big.zip',
          mimeType: 'application/zip',
          sizeBytes: 51 * 1024 * 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-positive file size', async () => {
      await expect(
        service.createUploadRequest('org-1', 'u-1', {
          originalName: 'empty.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should sanitize filename', async () => {
      await service.createUploadRequest('org-1', 'u-1', {
        originalName: 'my file (1).pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100,
      });
      expect(prisma.fileObjectRef.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            objectKey: expect.stringContaining('my_file__1_'),
          }),
        }),
      );
    });
  });

  // ── getDownloadUrl ─────────────────────────────────────

  describe('finalizeUpload', () => {
    const pendingFileRef = {
      ...mockFileRef,
      status: 'PENDING',
      checksum: null,
      scanStatus: 'PENDING',
      scanError: null,
      finalizedAt: null,
    };

    it('should mark a matching upload request READY after scan passes', async () => {
      prisma.fileObjectRef.findFirst.mockResolvedValue(pendingFileRef);
      prisma.fileObjectRef.update.mockResolvedValue({
        ...pendingFileRef,
        status: 'READY',
        scanStatus: 'CLEAN',
        checksum: 'sha256:abc',
        finalizedAt: new Date('2026-05-15T00:00:00.000Z'),
      });

      const result = await service.finalizeUpload('org-1', 'u-1', {
        fileRefId: 'f-1',
        objectKey: pendingFileRef.objectKey,
        checksum: 'sha256:abc',
        sizeBytes: 1024,
      });

      expect(result).toMatchObject({
        fileRefId: 'f-1',
        status: 'READY',
        scanStatus: 'CLEAN',
        checksum: 'sha256:abc',
      });
      expect(prisma.fileObjectRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'f-1' },
          data: expect.objectContaining({
            status: 'READY',
            scanStatus: 'CLEAN',
            checksum: 'sha256:abc',
            finalizedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should mark finalize as FAILED when objectKey does not match', async () => {
      prisma.fileObjectRef.findFirst.mockResolvedValue(pendingFileRef);

      await expect(
        service.finalizeUpload('org-1', 'u-1', {
          fileRefId: 'f-1',
          objectKey: 'org-1/general/wrong.pdf',
          sizeBytes: 1024,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.fileObjectRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'f-1' },
          data: expect.objectContaining({
            status: 'FAILED',
            scanStatus: 'FAILED',
            scanError: 'object_key_mismatch',
          }),
        }),
      );
    });

    it('should mark finalize as FAILED when sizeBytes does not match', async () => {
      prisma.fileObjectRef.findFirst.mockResolvedValue(pendingFileRef);

      await expect(
        service.finalizeUpload('org-1', 'u-1', {
          fileRefId: 'f-1',
          objectKey: pendingFileRef.objectKey,
          sizeBytes: 2048,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.fileObjectRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'f-1' },
          data: expect.objectContaining({
            status: 'FAILED',
            scanStatus: 'FAILED',
            scanError: 'size_mismatch',
          }),
        }),
      );
    });

    it('should persist INFECTED scan outcome without returning a download-ready file', async () => {
      prisma.fileObjectRef.findFirst.mockResolvedValue(pendingFileRef);
      jest.spyOn(service as any, 'scanFinalizedObject').mockResolvedValue({
        status: 'INFECTED',
        scanStatus: 'INFECTED',
        scanError: 'malware_signature',
      });
      prisma.fileObjectRef.update.mockResolvedValue({
        ...pendingFileRef,
        status: 'INFECTED',
        scanStatus: 'INFECTED',
        scanError: 'malware_signature',
      });

      const result = await service.finalizeUpload('org-1', 'u-1', {
        fileRefId: 'f-1',
        objectKey: pendingFileRef.objectKey,
        sizeBytes: 1024,
      });

      expect(result).toMatchObject({
        fileRefId: 'f-1',
        status: 'INFECTED',
        scanStatus: 'INFECTED',
      });
      expect(prisma.fileObjectRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'INFECTED',
            scanStatus: 'INFECTED',
            scanError: 'malware_signature',
          }),
        }),
      );
    });

    it('should return READY idempotently for an already finalized matching file', async () => {
      const result = await service.finalizeUpload('org-1', 'u-1', {
        fileRefId: 'f-1',
        objectKey: mockFileRef.objectKey,
        checksum: mockFileRef.checksum,
        sizeBytes: 1024,
      });

      expect(result).toMatchObject({
        fileRefId: 'f-1',
        status: 'READY',
        scanStatus: 'CLEAN',
        checksum: mockFileRef.checksum,
      });
      expect(prisma.fileObjectRef.update).not.toHaveBeenCalled();
    });
  });

  describe('getDownloadUrl', () => {
    it('should return signed download URL', async () => {
      const result = await service.getDownloadUrl('org-1', 'f-1');
      expect(result.downloadUrl).toBe('http://test/download');
      expect(result.originalName).toBe('test.pdf');
    });

    it('should throw NotFoundException for missing file', async () => {
      prisma.fileObjectRef.findFirst.mockResolvedValue(null);
      await expect(service.getDownloadUrl('org-1', 'invalid')).rejects.toThrow(NotFoundException);
    });

    it('should reject a file that has not been finalized as READY', async () => {
      prisma.fileObjectRef.findFirst.mockResolvedValue({ ...mockFileRef, status: 'PENDING' });
      await expect(service.getDownloadUrl('org-1', 'f-1')).rejects.toThrow(BadRequestException);
      expect(storageAdapter.generateDownloadUrl).not.toHaveBeenCalled();
    });
  });

  // ── listFiles ──────────────────────────────────────────

  describe('assertReadyFileRefs', () => {
    it('should accept existing READY file refs for the org', async () => {
      prisma.fileObjectRef.findMany = jest.fn().mockResolvedValue([mockFileRef]);

      await expect(service.assertReadyFileRefs('org-1', ['f-1'])).resolves.toEqual([mockFileRef]);
      expect(prisma.fileObjectRef.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: 'org-1',
            id: { in: ['f-1'] },
            deletedAt: null,
          }),
        }),
      );
    });

    it('should reject missing file refs', async () => {
      prisma.fileObjectRef.findMany = jest.fn().mockResolvedValue([]);

      await expect(service.assertReadyFileRefs('org-1', ['missing'])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject file refs that are not READY', async () => {
      prisma.fileObjectRef.findMany = jest
        .fn()
        .mockResolvedValue([{ ...mockFileRef, status: 'PENDING' }]);

      await expect(service.assertReadyFileRefs('org-1', ['f-1'])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listFiles', () => {
    it('should list files for org', async () => {
      const result = await service.listFiles('org-1');
      expect(prisma.fileObjectRef.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: 'org-1', deletedAt: null }),
        }),
      );
    });

    it('should filter by entityType', async () => {
      await service.listFiles('org-1', 'session');
      expect(prisma.fileObjectRef.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'session' }),
        }),
      );
    });
  });

  // ── softDelete ─────────────────────────────────────────

  describe('softDelete', () => {
    it('should soft-delete and call adapter deleteObject', async () => {
      await service.softDelete('org-1', 'f-1');
      expect(storageAdapter.deleteObject).toHaveBeenCalled();
      expect(prisma.fileObjectRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw NotFoundException for missing file', async () => {
      prisma.fileObjectRef.findFirst.mockResolvedValue(null);
      await expect(service.softDelete('org-1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });
});
