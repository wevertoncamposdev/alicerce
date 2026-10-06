import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '@core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    refreshToken: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    user: { findUnique: jest.Mock };
  };

  const baseUser = {
    id: 'user-1',
    email: 'user@example.com',
    tenantId: 'tenant-1',
    roles: [],
    tenant: { id: 'tenant-1', legalName: 'Tenant 1', slug: 'tenant-1' },
  };

  beforeEach(async () => {
    prisma = {
      refreshToken: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({}),
      },
      user: { findUnique: jest.fn().mockResolvedValue(baseUser) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('token') },
        },
        { provide: ConfigService, useValue: {} },
        { provide: I18nService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('refreshTokens', () => {
    it('issues a new pair and revokes only the current token when it is still active', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        familyId: 'family-1',
        userId: baseUser.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60),
      });

      const result = await service.refreshTokens('raw-token');

      expect(result.access_token).toBe('token');
      expect(prisma.refreshToken.update).toHaveBeenCalledTimes(1);
      expect(prisma.refreshToken.update.mock.calls[0][0]).toMatchObject({
        where: { id: 'rt-1' },
      });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('tolerates reuse of a just-revoked token (parallel requests) without nuking the family', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        familyId: 'family-1',
        userId: baseUser.id,
        revokedAt: new Date(Date.now() - 2000), // revogado há 2s, dentro da janela
        expiresAt: new Date(Date.now() + 1000 * 60),
      });

      const result = await service.refreshTokens('raw-token');

      expect(result.access_token).toBe('token');
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('treats reuse outside the grace window as theft and revokes the whole family', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        familyId: 'family-1',
        userId: baseUser.id,
        revokedAt: new Date(Date.now() - 60 * 1000), // revogado há 60s
        expiresAt: new Date(Date.now() + 1000 * 60),
      });

      await expect(service.refreshTokens('raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.refreshToken.updateMany.mock.calls[0][0]).toMatchObject({
        where: { familyId: 'family-1' },
      });
    });

    it('rejects an expired or unknown token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
