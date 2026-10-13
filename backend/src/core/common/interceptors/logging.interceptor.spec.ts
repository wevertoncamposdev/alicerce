import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let consoleLogSpy: jest.SpyInstance;

  const buildContext = (req: Record<string, unknown>, res: unknown) =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('logs the response status code on success', (done) => {
    const context = buildContext(
      { method: 'GET', originalUrl: '/user', headers: {} },
      { statusCode: 200 },
    );
    const next = { handle: () => of({ id: '1' }) };

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('GET /user 200'),
        );
        done();
      },
    });
  });

  it('logs the HttpException status and still propagates the error', (done) => {
    const context = buildContext(
      { method: 'PATCH', originalUrl: '/user/1', headers: {} },
      { statusCode: 200 },
    );
    const error = new HttpException('Usuario nao encontrado', HttpStatus.NOT_FOUND);
    const next = { handle: () => throwError(() => error) };

    interceptor.intercept(context, next).subscribe({
      error: (thrown) => {
        expect(thrown).toBe(error);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`PATCH /user/1 ${HttpStatus.NOT_FOUND}`),
        );
        done();
      },
    });
  });

  it('logs 500 for a non-HttpException error', (done) => {
    const context = buildContext(
      { method: 'GET', originalUrl: '/boom', headers: {} },
      { statusCode: 200 },
    );
    const error = new Error('unexpected failure');
    const next = { handle: () => throwError(() => error) };

    interceptor.intercept(context, next).subscribe({
      error: () => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            `GET /boom ${HttpStatus.INTERNAL_SERVER_ERROR}`,
          ),
        );
        done();
      },
    });
  });
});
