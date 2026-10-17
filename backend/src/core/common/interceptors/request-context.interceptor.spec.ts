import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { RequestContextInterceptor } from './request-context.interceptor';
import { getCurrentTenantId } from '@core/common/context/request-context';

describe('RequestContextInterceptor', () => {
  let interceptor: RequestContextInterceptor;

  const buildContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    interceptor = new RequestContextInterceptor();
  });

  it('exposes request.tenantId via getCurrentTenantId() during handler execution', (done) => {
    const context = buildContext({ tenantId: 'tenant-1' });
    let seenDuringHandler: string | undefined;
    const next = {
      handle: () => {
        seenDuringHandler = getCurrentTenantId();
        return of({ ok: true });
      },
    };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(seenDuringHandler).toBe('tenant-1');
        done();
      },
    });
  });

  it('runs the handler without a tenant context on public routes (no request.tenantId)', (done) => {
    const context = buildContext({});
    let seenDuringHandler: string | undefined = 'untouched';
    const next = {
      handle: () => {
        seenDuringHandler = getCurrentTenantId();
        return of({ ok: true });
      },
    };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(seenDuringHandler).toBeUndefined();
        done();
      },
    });
  });

  it('does not leak tenant context across two sequential independent requests', async () => {
    const first = buildContext({ tenantId: 'tenant-a' });
    const second = buildContext({ tenantId: 'tenant-b' });
    const seen: (string | undefined)[] = [];

    await lastValueFrom(
      interceptor.intercept(first, {
        handle: () => {
          seen.push(getCurrentTenantId());
          return of({ ok: true });
        },
      }),
    );
    await lastValueFrom(
      interceptor.intercept(second, {
        handle: () => {
          seen.push(getCurrentTenantId());
          return of({ ok: true });
        },
      }),
    );

    expect(seen).toEqual(['tenant-a', 'tenant-b']);
    expect(getCurrentTenantId()).toBeUndefined();
  });
});
