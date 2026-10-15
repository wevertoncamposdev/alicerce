import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logInfoMock: jest.Mock;

  const buildContext = (req: Record<string, unknown>, res: unknown) => {
    logInfoMock = jest.fn();
    const request = { ...req, log: { info: logInfoMock } };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('logs a structured entry with the response status code on success', (done) => {
    const context = buildContext(
      { method: 'GET', originalUrl: '/user', headers: {}, id: 'req-1' },
      { statusCode: 200 },
    );
    const next = { handle: () => of({ id: '1' }) };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(logInfoMock).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: '/user',
            statusCode: 200,
          }),
        );
        done();
      },
    });
  });

  it('logs the HttpException status and still propagates the error', (done) => {
    const context = buildContext(
      { method: 'PATCH', originalUrl: '/user/1', headers: {}, id: 'req-2' },
      { statusCode: 200 },
    );
    const error = new HttpException(
      'Usuario nao encontrado',
      HttpStatus.NOT_FOUND,
    );
    const next = { handle: () => throwError(() => error) };

    interceptor.intercept(context, next).subscribe({
      error: (thrown) => {
        expect(thrown).toBe(error);
        expect(logInfoMock).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PATCH',
            url: '/user/1',
            statusCode: HttpStatus.NOT_FOUND,
          }),
        );
        done();
      },
    });
  });

  it('logs 500 for a non-HttpException error', (done) => {
    const context = buildContext(
      { method: 'GET', originalUrl: '/boom', headers: {}, id: 'req-3' },
      { statusCode: 200 },
    );
    const error = new Error('unexpected failure');
    const next = { handle: () => throwError(() => error) };

    interceptor.intercept(context, next).subscribe({
      error: () => {
        expect(logInfoMock).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: '/boom',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          }),
        );
        done();
      },
    });
  });

  // Regressão real: `createNestApplication()` sem especificar o
  // FastifyAdapter usa Express por padrão (ex.: app.e2e-spec.ts), que não
  // decora `request` com `.log` — sem este fallback, toda requisição virava
  // 500 nesse ambiente.
  it('falls back to the Nest Logger when request.log does not exist', (done) => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const request = { method: 'GET', originalUrl: '/no-pino', headers: {} };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of({ id: '1' }) };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: '/no-pino',
            statusCode: 200,
          }),
        );
        logSpy.mockRestore();
        done();
      },
    });
  });
});
