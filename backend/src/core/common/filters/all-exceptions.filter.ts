import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Sem isto, uma exceção que não é HttpException (bug real de código)
    // vira só "Erro interno do servidor" na resposta e não deixa nenhum
    // rastro no log — o único jeito de descobrir o que quebrou seria
    // reproduzir manualmente. Erros de negócio (HttpException) logam em
    // nível `warn` (esperados, não indicam bug); o resto loga em `error`
    // com stack trace.
    const method = request?.method ?? '-';
    const url = request?.url ?? '-';
    if (exception instanceof HttpException) {
      this.logger.warn(`${method} ${url} ${status} - ${exception.message}`);
    } else {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${method} ${url} ${status} - erro não tratado`,
        stack,
      );
    }

    const responseData =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Erro interno do servidor' };

    const payload =
      typeof responseData === 'object'
        ? {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            ...responseData,
          }
        : {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: responseData,
          };

    // Express response object
    if (
      typeof response.status === 'function' &&
      typeof response.json === 'function'
    ) {
      response.status(status).json(payload);
      return;
    }

    // Fastify reply object
    if (
      typeof response.code === 'function' &&
      typeof response.send === 'function'
    ) {
      response.code(status).send(payload);
      return;
    }

    // Fallback for raw Node response object
    response.statusCode = status;
    response.setHeader?.('content-type', 'application/json');
    response.end?.(JSON.stringify(payload));
  }
}
