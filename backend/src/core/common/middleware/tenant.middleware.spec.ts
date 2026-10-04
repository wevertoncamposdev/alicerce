import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';

describe('TenantMiddleware', () => {
  const jwtServiceMock = { decode: jest.fn() };
  let middleware: TenantMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new TenantMiddleware(jwtServiceMock as never);
  });

  function buildRequest(opts: {
    method?: string;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    return {
      method: opts.method ?? 'GET',
      params: opts.params ?? {},
      headers: opts.headers ?? {},
    } as never;
  }

  it('bypasses validation for OPTIONS preflight requests', () => {
    const next = jest.fn();
    const req = buildRequest({ method: 'OPTIONS' });

    middleware.use(req, {} as never, next);

    expect(next).toHaveBeenCalled();
    expect(jwtServiceMock.decode).not.toHaveBeenCalled();
  });

  it('throws Unauthorized when there is no bearer token', () => {
    const req = buildRequest({ params: { tenantId: 'tenant-a' } });

    expect(() => middleware.use(req, {} as never, jest.fn())).toThrow(
      UnauthorizedException,
    );
  });

  it('throws Unauthorized when the token has no tenantId claim', () => {
    jwtServiceMock.decode.mockReturnValueOnce({ sub: 'user-1' });
    const req = buildRequest({
      headers: { authorization: 'Bearer token' },
    });

    expect(() => middleware.use(req, {} as never, jest.fn())).toThrow(
      UnauthorizedException,
    );
  });

  it('sets req.tenantId from the JWT when route and header are absent', () => {
    jwtServiceMock.decode.mockReturnValueOnce({ tenantId: 'tenant-a' });
    const next = jest.fn();
    const req = buildRequest({
      headers: { authorization: 'Bearer token' },
    });

    middleware.use(req, {} as never, next);

    expect((req as { tenantId?: string }).tenantId).toBe('tenant-a');
    expect(next).toHaveBeenCalled();
  });

  it('rejects when the route tenantId belongs to another tenant than the JWT', () => {
    jwtServiceMock.decode.mockReturnValueOnce({ tenantId: 'tenant-a' });
    const req = buildRequest({
      params: { tenantId: 'tenant-b' },
      headers: { authorization: 'Bearer token' },
    });

    expect(() => middleware.use(req, {} as never, jest.fn())).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when the x-tenant-id header belongs to another tenant than the JWT (does not trust the header)', () => {
    jwtServiceMock.decode.mockReturnValueOnce({ tenantId: 'tenant-a' });
    const req = buildRequest({
      headers: {
        authorization: 'Bearer token',
        'x-tenant-id': 'tenant-b',
      },
    });

    expect(() => middleware.use(req, {} as never, jest.fn())).toThrow(
      ForbiddenException,
    );
  });

  it('accepts when route and header agree with the JWT tenantId', () => {
    jwtServiceMock.decode.mockReturnValueOnce({ tenantId: 'tenant-a' });
    const next = jest.fn();
    const req = buildRequest({
      params: { tenantId: 'tenant-a' },
      headers: {
        authorization: 'Bearer token',
        'x-tenant-id': 'tenant-a',
      },
    });

    middleware.use(req, {} as never, next);

    expect((req as { tenantId?: string }).tenantId).toBe('tenant-a');
    expect(next).toHaveBeenCalled();
  });
});
