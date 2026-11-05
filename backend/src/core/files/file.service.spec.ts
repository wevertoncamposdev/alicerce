import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FilesService } from './file.service';
import { PrismaService } from '@core/prisma/prisma.service';
import { STORAGE_PROVIDER } from '@core/storage/storage-provider.interface';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';

describe('FilesService', () => {
  let service: FilesService;
  const tenantId = 'tenant-1';

  const prismaMock = {
    file: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const storageMock = {
    put: jest.fn(),
    getSignedUrl: jest.fn(),
    delete: jest.fn(),
  };

  const permissionCacheMock = {
    getFreshPermissions: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    permissionCacheMock.getFreshPermissions.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: STORAGE_PROVIDER, useValue: storageMock },
        { provide: PermissionCacheService, useValue: permissionCacheMock },
      ],
    }).compile();

    service = module.get(FilesService);
  });

  describe('assertUploadedBy', () => {
    it('não lança quando o usuário é quem enviou o arquivo', async () => {
      prismaMock.file.findUnique.mockResolvedValue({
        id: 'file-1',
        tenantId,
        uploadedById: 'user-1',
        deletedAt: null,
      });

      await expect(
        service.assertUploadedBy('file-1', tenantId, 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('lança BadRequestException quando outro usuário enviou o arquivo', async () => {
      prismaMock.file.findUnique.mockResolvedValue({
        id: 'file-1',
        tenantId,
        uploadedById: 'user-1',
        deletedAt: null,
      });

      await expect(
        service.assertUploadedBy('file-1', tenantId, 'user-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança NotFoundException quando o arquivo é de outro tenant', async () => {
      prismaMock.file.findUnique.mockResolvedValue({
        id: 'file-1',
        tenantId: 'outro-tenant',
        uploadedById: 'user-1',
        deletedAt: null,
      });

      await expect(
        service.assertUploadedBy('file-1', tenantId, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('upload', () => {
    const pdfBytes = Buffer.from('%PDF-1.4 fake content', 'ascii');
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const baseParams = {
      ownerType: 'feedback',
      ownerId: 'record-1',
      tenantId,
      uploadedById: 'user-1',
    };

    it('aceita PDF com assinatura válida', async () => {
      prismaMock.file.create.mockResolvedValue({ id: 'file-1' });

      await expect(
        service.upload({
          ...baseParams,
          data: pdfBytes,
          mime: 'application/pdf',
        }),
      ).resolves.toEqual({ id: 'file-1' });
      expect(storageMock.put).toHaveBeenCalledWith(
        expect.stringMatching(/\.pdf$/),
        pdfBytes,
        'application/pdf',
      );
    });

    it('aceita PNG com assinatura válida', async () => {
      prismaMock.file.create.mockResolvedValue({ id: 'file-2' });

      await expect(
        service.upload({ ...baseParams, data: pngBytes, mime: 'image/png' }),
      ).resolves.toEqual({ id: 'file-2' });
    });

    it('rejeita mime fora da whitelist', async () => {
      await expect(
        service.upload({
          ...baseParams,
          data: Buffer.from('<html></html>'),
          mime: 'text/html',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(storageMock.put).not.toHaveBeenCalled();
    });

    it('rejeita quando os bytes não correspondem ao mime declarado', async () => {
      await expect(
        service.upload({
          ...baseParams,
          data: pngBytes,
          mime: 'application/pdf',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(storageMock.put).not.toHaveBeenCalled();
    });

    it('rejeita arquivo maior que o limite', async () => {
      const bigPdf = Buffer.concat([pdfBytes, Buffer.alloc(6 * 1024 * 1024)]);

      await expect(
        service.upload({
          ...baseParams,
          data: bigPdf,
          mime: 'application/pdf',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(storageMock.put).not.toHaveBeenCalled();
    });
  });

  describe('getSignedUrlOrNull', () => {
    it('devolve a URL quando o arquivo existe', async () => {
      prismaMock.file.findUnique.mockResolvedValue({
        id: 'file-1',
        tenantId,
        key: 'abc.png',
        deletedAt: null,
      });
      storageMock.getSignedUrl.mockResolvedValue('https://example.com/abc.png');

      const url = await service.getSignedUrlOrNull('file-1', tenantId);
      expect(url).toBe('https://example.com/abc.png');
    });

    it('devolve null em vez de lançar quando o arquivo não existe mais', async () => {
      prismaMock.file.findUnique.mockResolvedValue(null);

      const url = await service.getSignedUrlOrNull('file-1', tenantId);
      expect(url).toBeNull();
    });

    it('devolve null quando o arquivo é de outro tenant', async () => {
      prismaMock.file.findUnique.mockResolvedValue({
        id: 'file-1',
        tenantId: 'outro-tenant',
        key: 'abc.png',
        deletedAt: null,
      });

      const url = await service.getSignedUrlOrNull('file-1', tenantId);
      expect(url).toBeNull();
    });
  });
});
