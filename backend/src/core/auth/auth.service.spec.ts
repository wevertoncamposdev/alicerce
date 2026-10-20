import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RedisService } from '@core/redis/redis.service';
import { AuditService } from '@modules/audit/audit.service';
import { AccountTokenService } from './account-token.service';
import { MailService } from '@core/mail/mail.service';
import { FilesService } from '@core/files/file.service';

describe('AuthService', () => {
  let service: AuthService;
  let auditService: { register: jest.Mock };
  let i18nTranslate: jest.Mock;
  let redisClient: {
    get: jest.Mock;
    incr: jest.Mock;
    expire: jest.Mock;
    del: jest.Mock;
  };
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
    user: { findUnique: jest.Mock; update: jest.Mock };
  };
  let accountTokenService: { issue: jest.Mock; consume: jest.Mock };
  let mailService: { send: jest.Mock };

  const correctPassword = 'correct-password';
  let baseUser: {
    id: string;
    email: string;
    name: string | null;
    password: string;
    tenantId: string;
    roles: unknown[];
    status: string;
    deletedAt: Date | null;
    tenant: {
      id: string;
      legalName: string;
      slug: string;
      status: string;
      deletedAt: Date | null;
    };
  };

  beforeEach(async () => {
    baseUser = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Usuário de Teste',
      password: await bcrypt.hash(correctPassword, 4),
      tenantId: 'tenant-1',
      roles: [],
      status: 'ACTIVE',
      deletedAt: null,
      tenant: {
        id: 'tenant-1',
        legalName: 'Tenant 1',
        slug: 'tenant-1',
        status: 'ACTIVE',
        deletedAt: null,
      },
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
      user: {
        findUnique: jest.fn().mockResolvedValue(baseUser),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    auditService = { register: jest.fn().mockResolvedValue(undefined) };
    i18nTranslate = jest.fn().mockReturnValue('mocked message');
    redisClient = {
      get: jest.fn().mockResolvedValue(null),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
    };
    accountTokenService = {
      issue: jest.fn().mockResolvedValue('raw-account-token'),
      consume: jest.fn(),
    };
    mailService = { send: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaBootstrapService, useValue: prisma },
        { provide: RedisService, useValue: { client: redisClient } },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('token') },
        },
        { provide: ConfigService, useValue: {} },
        {
          provide: I18nService,
          useValue: { translate: i18nTranslate },
        },
        {
          provide: PermissionCacheService,
          useValue: { setPermissions: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: AuditService, useValue: auditService },
        { provide: AccountTokenService, useValue: accountTokenService },
        { provide: MailService, useValue: mailService },
        {
          provide: FilesService,
          useValue: { getSignedUrlOrNull: jest.fn().mockResolvedValue(null) },
        },
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

    it('uses the same message for a non-existent e-mail as for a wrong password (enumeration-safe)', async () => {
      // `bcrypt` é um binding nativo — não dá pra espiar `bcrypt.compare`
      // com `jest.spyOn` aqui (a propriedade não é redefinível). O que este
      // teste garante é o contrato observável: a mensagem é a mesma nos dois
      // casos. A chamada extra a `bcrypt.compare` contra o hash fixo (ver
      // DUMMY_PASSWORD_HASH em auth.service.ts) é o que garante o tempo
      // constante na prática, fora do escopo testável aqui.
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.signIn({ email: 'ghost@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(i18nTranslate).toHaveBeenCalledWith(
        'messages.USER.INVALID_CREDENTIALS',
        expect.anything(),
      );
      expect(i18nTranslate).not.toHaveBeenCalledWith(
        'messages.USER.NOT_FOUND',
        expect.anything(),
      );
    });

    it('rejects a correct password when the user is inactive, auditing LOGIN_FAILED', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...baseUser,
        status: 'INACTIVE',
      });

      await expect(
        service.signIn({ email: baseUser.email, password: correctPassword }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(auditService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: baseUser.tenantId,
          userId: baseUser.id,
          type: 'LOGIN_FAILED',
        }),
      );
    });

    it('rejects a correct password when the user is deleted', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...baseUser,
        deletedAt: new Date(),
      });

      await expect(
        service.signIn({ email: baseUser.email, password: correctPassword }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a correct password when the tenant is inactive', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...baseUser,
        tenant: { ...baseUser.tenant, status: 'INACTIVE' },
      });

      await expect(
        service.signIn({ email: baseUser.email, password: correctPassword }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a correct password when the tenant is deleted', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...baseUser,
        tenant: { ...baseUser.tenant, deletedAt: new Date() },
      });

      await expect(
        service.signIn({ email: baseUser.email, password: correctPassword }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('account lockout (Redis)', () => {
    it('increments the counter and sets a 15min TTL on the first failed attempt', async () => {
      redisClient.get.mockResolvedValue(null);
      redisClient.incr.mockResolvedValue(1);

      await expect(
        service.signIn({ email: baseUser.email, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(redisClient.incr).toHaveBeenCalledWith(
        `login:fail:${baseUser.email}`,
      );
      expect(redisClient.expire).toHaveBeenCalledWith(
        `login:fail:${baseUser.email}`,
        15 * 60,
      );
    });

    it('does not reset the TTL on subsequent failed attempts', async () => {
      redisClient.get.mockResolvedValue('2');
      redisClient.incr.mockResolvedValue(3);

      await expect(
        service.signIn({ email: baseUser.email, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(redisClient.expire).not.toHaveBeenCalled();
    });

    it('blocks with the generic message after 5 failed attempts, auditing the reason', async () => {
      redisClient.get.mockResolvedValue('5');

      await expect(
        service.signIn({ email: baseUser.email, password: correctPassword }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(auditService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LOGIN_FAILED',
          payload: { reason: 'account_locked' },
        }),
      );
      expect(i18nTranslate).toHaveBeenCalledWith(
        'messages.USER.INVALID_CREDENTIALS',
        expect.anything(),
      );
    });

    it('clears the counter on a successful login', async () => {
      redisClient.get.mockResolvedValue('2');

      await service.signIn({
        email: baseUser.email,
        password: correctPassword,
      });

      expect(redisClient.del).toHaveBeenCalledWith(
        `login:fail:${baseUser.email}`,
      );
    });

    it('fails open (does not block login) when Redis is unavailable', async () => {
      redisClient.get.mockRejectedValue(new Error('connection lost'));
      redisClient.incr.mockRejectedValue(new Error('connection lost'));

      const result = await service.signIn({
        email: baseUser.email,
        password: correctPassword,
      });

      expect(result.access_token).toBe('token');
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

    it('rejects a valid token when the user was deactivated since it was issued', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        familyId: 'family-1',
        userId: baseUser.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60),
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        ...baseUser,
        status: 'INACTIVE',
      });

      await expect(service.refreshTokens('raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a valid token when the tenant was deactivated since it was issued', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        familyId: 'family-1',
        userId: baseUser.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60),
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        ...baseUser,
        tenant: { ...baseUser.tenant, status: 'INACTIVE' },
      });

      await expect(service.refreshTokens('raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('emite um token e manda e-mail quando o usuário existe e está ativo', async () => {
      await service.forgotPassword(baseUser.email);

      expect(accountTokenService.issue).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: baseUser.id,
          type: 'RESET_PASSWORD',
        }),
      );
      expect(mailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: baseUser.email }),
      );
    });

    it('não lança e não manda e-mail quando o usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.forgotPassword('nao-existe@example.com'),
      ).resolves.toBeUndefined();

      expect(accountTokenService.issue).not.toHaveBeenCalled();
      expect(mailService.send).not.toHaveBeenCalled();
    });

    it('não manda e-mail quando a conta está inativa (mesma resposta pro chamador)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...baseUser,
        status: 'INACTIVE',
      });

      await service.forgotPassword(baseUser.email);

      expect(accountTokenService.issue).not.toHaveBeenCalled();
      expect(mailService.send).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('troca a senha e revoga as sessões quando o token é válido', async () => {
      accountTokenService.consume.mockResolvedValueOnce({
        userId: baseUser.id,
      });

      await service.resetPassword('raw-token', 'uma-senha-bem-forte-123');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: baseUser.id } }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('propaga o erro quando o token é inválido/expirado/já usado', async () => {
      accountTokenService.consume.mockRejectedValueOnce(
        new Error('Token inválido ou expirado'),
      );

      await expect(
        service.resetPassword('raw-token', 'uma-senha-bem-forte-123'),
      ).rejects.toThrow('Token inválido ou expirado');

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
