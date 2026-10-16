import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from '@modules/audit/audit.service';
import { PrismaService } from '@core/prisma/prisma.service';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: { register: jest.Mock };
  let prismaService: { user: { findUnique: jest.Mock } };

  const buildContext = (req: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({ getRequest: () => req }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    auditService = { register: jest.fn().mockResolvedValue(undefined) };
    prismaService = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    interceptor = new AuditInterceptor(
      auditService as unknown as AuditService,
      prismaService as unknown as PrismaService,
    );
  });

  it('registers the persisted result as "after", not the request body', (done) => {
    const req = {
      method: 'PATCH',
      originalUrl: '/api/user/1',
      params: { id: '1' },
      body: { email: 'attempted@example.com', password: 'plain-text' },
      user: { id: 'actor-1', tenantId: 'tenant-1' },
      tenantId: 'tenant-1',
    };
    const persistedResult = {
      id: '1',
      email: 'persisted@example.com',
      password: 'hashed-value',
    };
    const next = { handle: () => of(persistedResult) };

    interceptor.intercept(buildContext(req), next).subscribe({
      complete: () => {
        expect(auditService.register).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: 'user',
            entityId: '1',
            payload: {
              id: '1',
              email: 'persisted@example.com',
              password: '[REDACTED]',
            },
          }),
        );
        done();
      },
    });
  });

  it('does not call register for GET requests', (done) => {
    const req = {
      method: 'GET',
      originalUrl: '/api/user/1',
      params: { id: '1' },
      body: {},
      user: { id: 'actor-1', tenantId: 'tenant-1' },
    };
    const next = { handle: () => of({ id: '1' }) };

    interceptor.intercept(buildContext(req), next).subscribe({
      complete: () => {
        expect(auditService.register).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('singularizes the plural resource name from the URL', (done) => {
    const req = {
      method: 'POST',
      originalUrl: '/api/examples',
      params: {},
      body: { title: 'x' },
      user: { id: 'actor-1', tenantId: 'tenant-1' },
    };
    const persistedResult = { id: 'ex-1', title: 'x' };
    const next = { handle: () => of(persistedResult) };

    interceptor.intercept(buildContext(req), next).subscribe({
      complete: () => {
        expect(auditService.register).toHaveBeenCalledWith(
          expect.objectContaining({ entity: 'example', entityId: 'ex-1' }),
        );
        done();
      },
    });
  });

  describe('type resolution', () => {
    const runWith = (req: Record<string, unknown>, result: unknown = {}) =>
      new Promise<void>((resolve) => {
        interceptor
          .intercept(buildContext(req), { handle: () => of(result) })
          .subscribe({ complete: resolve });
      });

    it('resolves LOGIN for the login endpoint', async () => {
      await runWith(
        {
          method: 'POST',
          originalUrl: '/api/auth/login',
          params: {},
          body: { email: 'x@example.com', password: 'secret' },
          user: undefined,
        },
        { user: { id: 'u1' }, tenant: { id: 't1' } },
      );

      expect(auditService.register).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'LOGIN' }),
      );
    });

    it('resolves LOGOUT for the logout endpoint', async () => {
      await runWith({
        method: 'POST',
        originalUrl: '/api/auth/logout',
        params: {},
        body: {},
        user: { id: 'actor-1', tenantId: 'tenant-1' },
      });

      expect(auditService.register).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'LOGOUT' }),
      );
    });

    it('resolves PERMISSION_CHANGE when attaching a user to a role', async () => {
      await runWith(
        {
          method: 'POST',
          originalUrl: '/api/roles/role-1/users',
          params: { id: 'role-1' },
          body: { userId: 'user-1' },
          user: { id: 'actor-1', tenantId: 'tenant-1' },
        },
        { userId: 'user-1', roleId: 'role-1', tenantId: 'tenant-1' },
      );

      expect(auditService.register).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PERMISSION_CHANGE' }),
      );
    });

    it('resolves PERMISSION_CHANGE when detaching a permission from a role', async () => {
      await runWith({
        method: 'DELETE',
        originalUrl: '/api/roles/role-1/permissions/perm-1',
        params: {},
        body: {},
        user: { id: 'actor-1', tenantId: 'tenant-1' },
      });

      expect(auditService.register).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PERMISSION_CHANGE' }),
      );
    });

    it('resolves DATA_CHANGE for ordinary CRUD', async () => {
      await runWith(
        {
          method: 'PATCH',
          originalUrl: '/api/examples/ex-1',
          params: { id: 'ex-1' },
          body: { title: 'y' },
          user: { id: 'actor-1', tenantId: 'tenant-1' },
        },
        { id: 'ex-1', title: 'y' },
      );

      expect(auditService.register).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DATA_CHANGE' }),
      );
    });
  });

  describe('"before" capture (dispatch dinâmico no Prisma)', () => {
    it('captures the pre-mutation state for PATCH and sanitizes it the same way as "after"', (done) => {
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: '1',
        email: 'old@example.com',
        password: 'old-hash',
      });
      const req = {
        method: 'PATCH',
        originalUrl: '/api/user/1',
        params: { id: '1' },
        body: { email: 'new@example.com' },
        user: { id: 'actor-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
      };
      const next = {
        handle: () => of({ id: '1', email: 'new@example.com' }),
      };

      interceptor.intercept(buildContext(req), next).subscribe({
        complete: () => {
          expect(prismaService.user.findUnique).toHaveBeenCalledWith({
            where: { id: '1' },
          });
          expect(auditService.register).toHaveBeenCalledWith(
            expect.objectContaining({
              before: {
                id: '1',
                email: 'old@example.com',
                password: '[REDACTED]',
              },
            }),
          );
          done();
        },
      });
    });

    it('does not look up "before" for POST (there is nothing to look up for a create)', (done) => {
      const req = {
        method: 'POST',
        originalUrl: '/api/examples',
        params: {},
        body: { title: 'x' },
        user: { id: 'actor-1', tenantId: 'tenant-1' },
      };
      const next = { handle: () => of({ id: 'ex-1', title: 'x' }) };

      interceptor.intercept(buildContext(req), next).subscribe({
        complete: () => {
          expect(prismaService.user.findUnique).not.toHaveBeenCalled();
          expect(auditService.register).toHaveBeenCalledWith(
            expect.objectContaining({ before: undefined }),
          );
          done();
        },
      });
    });

    it('leaves "before" undefined when the resolved entity has no matching Prisma delegate', (done) => {
      const req = {
        method: 'DELETE',
        originalUrl: '/api/tenant/t1/audit',
        params: { id: '1' },
        body: {},
        user: { id: 'actor-1', tenantId: 'tenant-1' },
      };
      const next = { handle: () => of({ id: '1' }) };

      interceptor.intercept(buildContext(req), next).subscribe({
        complete: () => {
          expect(auditService.register).toHaveBeenCalledWith(
            expect.objectContaining({ before: undefined }),
          );
          done();
        },
      });
    });

    it('leaves "before" undefined (without failing the request) if the Prisma lookup throws', (done) => {
      prismaService.user.findUnique.mockRejectedValueOnce(
        new Error('connection lost'),
      );
      const req = {
        method: 'DELETE',
        originalUrl: '/api/user/1',
        params: { id: '1' },
        body: {},
        user: { id: 'actor-1', tenantId: 'tenant-1' },
      };
      const next = { handle: () => of({ id: '1' }) };

      interceptor.intercept(buildContext(req), next).subscribe({
        complete: () => {
          expect(auditService.register).toHaveBeenCalledWith(
            expect.objectContaining({ before: undefined }),
          );
          done();
        },
      });
    });

    it('still propagates the handler error when the mutation itself fails (before-lookup never blocks the real request)', (done) => {
      prismaService.user.findUnique.mockResolvedValueOnce({ id: '1' });
      const req = {
        method: 'PATCH',
        originalUrl: '/api/user/1',
        params: { id: '1' },
        body: {},
        user: { id: 'actor-1', tenantId: 'tenant-1' },
      };
      const handlerError = new Error('update failed');
      const next = { handle: () => throwError(() => handlerError) };

      interceptor.intercept(buildContext(req), next).subscribe({
        error: (err) => {
          expect(err).toBe(handlerError);
          expect(auditService.register).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
