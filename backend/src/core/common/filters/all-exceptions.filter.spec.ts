import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

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
    filter = new AllExceptionsFilter();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logs HttpException as a warning (expected business error), not as error', () => {
    const { host, response } = buildHost({ method: 'GET', url: '/user/1' });
    const exception = new HttpException(
      'Usuario nao encontrado',
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, host);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('GET /user/1 404'),
    );
    expect(errorSpy).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(404);
  });

  it('logs an unexpected (non-HttpException) error with its stack, as error level', () => {
    const { host, response } = buildHost({ method: 'POST', url: '/boom' });
    const exception = new Error('something exploded');

    filter.catch(exception, host);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('POST /boom 500'),
      exception.stack,
    );
    expect(warnSpy).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Erro interno do servidor' }),
    );
  });
});
