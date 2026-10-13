import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const method = req.method;
    const url = req.originalUrl;

    const referer = req.headers.referer ?? '-';
    const userAgent = req.headers['user-agent'] ?? '-';
    const ip = req.ip;
    const source = req.headers['x-source'] ?? '-';

    const startedAt = Date.now();
    const line = (statusCode: number) => {
      const duration = Date.now() - startedAt;
      console.log(
        `${method} ${url} ${statusCode} - ${duration}ms - Referer: ${referer} - Source: ${source}`,
      );
    };

    return next.handle().pipe(
      tap(() => line(res.statusCode)),
      // Sem isto, qualquer requisição que termina em erro (4xx/5xx) não
      // deixa nenhuma linha de log — só o sucesso (tap) era coberto antes.
      catchError((error) => {
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        line(statusCode);
        return throwError(() => error);
      }),
    );
  }
}
