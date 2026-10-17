import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { AuditService } from '@modules/audit/audit.service';

describe('AuthService', () => {
  let service: AuthService;
  let auditService: { register: jest.Mock };
  let prisma: {
    refreshToken: {
      findUnique: jest.Mock;
      update: jest.Mock<Promise<unknown>, [{ where: { id: string } }]>;
      updateMany: jest.Mock<
        Promise<unknown>,
        [{ where: { familyId: string } }]
      >;
      create: jest.Mock;
    };
    user: { findUnique: jest.Mock };
  };

  const correctPassword = 'correct-password';
  let baseUser: {
    id: string;
    email: string;
    password: string;
    tenantId: string;
    roles: unknown[];
    tenant: { id: string; legalName: string; slug: string };
  };

  beforeEach(async () => {
    baseUser = {
      id: 'user-1',
      email: 'user@example.com',
      password: await bcrypt.hash(correctPassword, 4),
      tenantId: 'tenant-1',
      roles: [],
      tenant: { id: 'tenant-1', legalName: 'Tenant 1', slug: 'tenant-1' },
    };

    prisma = {
      refreshToken: {
        findUnique: jest.fn(),
        update: jest
          .fn<Promise<unknown>, [{ where: { id: string } }]>()
          .mockResolvedValue({}),
        updateMany: jest
          .fn<Promise<unknown>, [{ where: { familyId: string } }]>()
          .mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({}),
      },
      user: { findUnique: jest.fn().mockResolvedValue(baseUser) },
    };

    auditService = { register: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaBootstrapService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('token') },
        },
        { provide: ConfigService, useValue: {} },
        {
          provide: I18nService,
          useValue: { translate: jest.fn().mockReturnValue('mocked message') },
        },
        {
          provide: PermissionCacheService,
          useValue: { setPermissions: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signIn', () => {
    it('registers a LOGIN_FAILED audit entry when the password is wrong (user exists)', async () => {
      await expect(
        service.signIn({ email: baseUser.email, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(auditService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: baseUser.tenantId,
          userId: baseUser.id,
          type: 'LOGIN_FAILED',
        }),
      );
    });

    it('does not register any audit entry when the e-mail does not exist', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.signIn({ email: 'ghost@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(auditService.register).not.toHaveBeenCalled();
    });
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
