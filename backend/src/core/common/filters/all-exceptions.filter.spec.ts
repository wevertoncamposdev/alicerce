import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AuditService } from '@modules/audit/audit.service';
import { MonitoringService } from '@core/monitoring/monitoring.service';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let auditServiceMock: { register: jest.Mock };
  let monitoringServiceMock: { captureException: jest.Mock };

  const buildHost = (request: Record<string, unknown>) => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
    return { host, response };
  };

  beforeEach(() => {
    auditServiceMock = { register: jest.fn().mockResolvedValue(undefined) };
    monitoringServiceMock = { captureException: jest.fn() };
    filter = new AllExceptionsFilter(
      auditServiceMock as unknown as AuditService,
      monitoringServiceMock as unknown as MonitoringService,
    );
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logs HttpException as a structured warning (expected business error), not as error', () => {
    const { host, response } = buildHost({
      method: 'GET',
      url: '/user/1',
      id: 'req-1',
    });
    const exception = new HttpException(
      'Usuario nao encontrado',
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, host);

    expect(warnSpy).toHaveBeenCalledWith({
      method: 'GET',
      url: '/user/1',
      status: 404,
      correlationId: 'req-1',
      message: 'Usuario nao encontrado',
    });
    expect(errorSpy).not.toHaveBeenCalled();
    // Negócio esperado (HttpException) não vai pro monitoramento de erros.
    expect(monitoringServiceMock.captureException).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(404);
    // O mesmo correlationId do log também vai na resposta — permite ao
    // cliente reportar o erro citando um id que localiza o log exato.
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'req-1' }),
    );
  });

  it('logs an unexpected (non-HttpException) error as a structured error with its stack', () => {
    const { host, response } = buildHost({
      method: 'POST',
      url: '/boom',
      id: 'req-2',
    });
    const exception = new Error('something exploded');

    filter.catch(exception, host);

    expect(errorSpy).toHaveBeenCalledWith({
      method: 'POST',
      url: '/boom',
      status: 500,
      correlationId: 'req-2',
      message: 'erro não tratado',
      stack: exception.stack,
    });
    expect(warnSpy).not.toHaveBeenCalled();
    // Etapa 10.2 — bug real (não-HttpException) vai pro monitoramento.
    expect(monitoringServiceMock.captureException).toHaveBeenCalledWith(
      exception,
      { method: 'POST', url: '/boom', correlationId: 'req-2' },
    );
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Erro interno do servidor',
        correlationId: 'req-2',
      }),
    );
  });

  it('registers an ACCESS_DENIED audit entry (with correlationId) for 403 when request.user is present', () => {
    const { host } = buildHost({
      method: 'DELETE',
      url: '/api/tenant/t1/examples/f1',
      user: { sub: 'user-1', tenantId: 'tenant-1' },
      id: 'req-3',
    });
    const exception = new HttpException(
      'Acesso negado: permission insuficiente',
      HttpStatus.FORBIDDEN,
    );

    filter.catch(exception, host);

    expect(auditServiceMock.register).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'ACCESS_DENIED',
      action: 'DELETE',
      entity: 'example',
      payload: {
        message: 'Acesso negado: permission insuficiente',
        correlationId: 'req-3',
      },
    });
  });

  it('does not register an audit entry for 403 when request.user is absent', () => {
    const { host } = buildHost({ method: 'GET', url: '/api/user' });
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, host);

    expect(auditServiceMock.register).not.toHaveBeenCalled();
  });

  it('does not register an audit entry for non-403 statuses (e.g. 401)', () => {
    const { host } = buildHost({
      method: 'GET',
      url: '/api/user',
      user: { sub: 'user-1', tenantId: 'tenant-1' },
    });
    const exception = new HttpException(
      'Unauthorized',
      HttpStatus.UNAUTHORIZED,
    );

    filter.catch(exception, host);

    expect(auditServiceMock.register).not.toHaveBeenCalled();
  });
});
