import { Test, TestingModule } from '@nestjs/testing';
import { PermissionCacheService } from './permission-cache.service';
import { RedisService } from '@core/redis/redis.service';
import { PrismaService } from '@core/prisma/prisma.service';

const redisClientMock = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const prismaMock = {
  userRole: { findMany: jest.fn() },
};

describe('PermissionCacheService', () => {
  let service: PermissionCacheService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionCacheService,
        { provide: RedisService, useValue: { client: redisClientMock } },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PermissionCacheService>(PermissionCacheService);
  });

  describe('getFreshPermissions', () => {
    it('returns the cached value on a hit, without touching the database', async () => {
      redisClientMock.get.mockResolvedValueOnce(
        JSON.stringify(['USER.READ', 'USER.WRITE']),
      );

      const result = await service.getFreshPermissions('tenant-1', 'user-1');

      expect(result).toEqual(['USER.READ', 'USER.WRITE']);
      expect(prismaMock.userRole.findMany).not.toHaveBeenCalled();
    });

    it('falls back to the database on a cache miss and populates the cache', async () => {
      redisClientMock.get.mockResolvedValueOnce(null);
      prismaMock.userRole.findMany.mockResolvedValueOnce([
        {
          role: {
            permissions: [{ permission: { name: 'user.read' } }],
          },
        },
      ]);

      const result = await service.getFreshPermissions('tenant-1', 'user-1');

      expect(result).toEqual(['USER.READ']);
      expect(redisClientMock.set).toHaveBeenCalledWith(
        'perm:tenant-1:user-1',
        JSON.stringify(['USER.READ']),
        'EX',
        60,
      );
    });

    it('falls back to the database when Redis itself is unreachable (fail-open to Postgres, not fail-closed)', async () => {
      redisClientMock.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      prismaMock.userRole.findMany.mockResolvedValueOnce([]);

      const result = await service.getFreshPermissions('tenant-1', 'user-1');

      expect(result).toEqual([]);
      expect(prismaMock.userRole.findMany).toHaveBeenCalled();
    });

    it('only considers active, non-deleted roles and permissions', async () => {
      redisClientMock.get.mockResolvedValueOnce(null);
      prismaMock.userRole.findMany.mockResolvedValueOnce([]);

      await service.getFreshPermissions('tenant-1', 'user-1');

      expect(prismaMock.userRole.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          role: { deletedAt: null, status: 'ACTIVE' },
        },
        include: {
          role: {
            include: {
              permissions: {
                where: { permission: { deletedAt: null } },
                include: { permission: true },
              },
            },
          },
        },
      });
    });
  });

  describe('invalidation', () => {
    it('invalidateUser deletes the single cache key', async () => {
      await service.invalidateUser('tenant-1', 'user-1');
      expect(redisClientMock.del).toHaveBeenCalledWith('perm:tenant-1:user-1');
    });

    it('invalidateUsers deletes all keys in one call and is a no-op for an empty list', async () => {
      await service.invalidateUsers('tenant-1', ['user-1', 'user-2']);
      expect(redisClientMock.del).toHaveBeenCalledWith([
        'perm:tenant-1:user-1',
        'perm:tenant-1:user-2',
      ]);

      redisClientMock.del.mockClear();
      await service.invalidateUsers('tenant-1', []);
      expect(redisClientMock.del).not.toHaveBeenCalled();
    });

    it('does not throw when Redis is unreachable during invalidation (best-effort)', async () => {
      redisClientMock.del.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await expect(
        service.invalidateUser('tenant-1', 'user-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('setPermissions', () => {
    it('uppercases and writes the permission list with the TTL', async () => {
      await service.setPermissions('tenant-1', 'user-1', ['user.read']);

      expect(redisClientMock.set).toHaveBeenCalledWith(
        'perm:tenant-1:user-1',
        JSON.stringify(['USER.READ']),
        'EX',
        60,
      );
    });
  });
});
