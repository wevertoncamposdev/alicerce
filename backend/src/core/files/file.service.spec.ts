import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FilesService } from './file.service';
import { PrismaService } from '@core/prisma/prisma.service';
import { STORAGE_PROVIDER } from '@core/storage/storage-provider.interface';

describe('FilesService', () => {
  let service: FilesService;
  const tenantId = 'tenant-1';

  const prismaMock = {
    file: {
      findUnique: jest.fn(),
    },
  };

  const storageMock = {
    put: jest.fn(),
    getSignedUrl: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: STORAGE_PROVIDER, useValue: storageMock },
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
