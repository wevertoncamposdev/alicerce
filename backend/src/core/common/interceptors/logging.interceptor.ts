import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { RequestWithAuth } from '@core/common/types/http.types';
import { ResponseLike } from '@core/common/types/response-like.type';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('LoggingInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    const res = context.switchToHttp().getResponse<ResponseLike>();

    const method = req.method;
    const url = req.originalUrl ?? req.url;

    const referer = req.headers.referer ?? '-';
    const userAgent = req.headers['user-agent'] ?? '-';
    const ip = req.ip;
    const source = req.headers['x-source'] ?? '-';

    const startedAt = Date.now();
    // `req.log` é o child logger pino que o Fastify nativo vincula a esta
    // requisição (configurado em main.ts) — todo log daqui sai em JSON e já
    // carrega `req.id` (correlation-id) automaticamente. Cai para o Logger
    // do Nest quando `req.log` não existe: testes e2e que montam a app via
    // `createNestApplication()` sem especificar o FastifyAdapter usam Express
    // por padrão, que não decora `request` com `.log` — sem este fallback,
    // toda requisição vira 500 nesse ambiente (bug real, pego pelo
    // `app.e2e-spec.ts` ao reescrever este arquivo).
    const pinoLog = req.log;
    const line = (statusCode: number) => {
      const duration = Date.now() - startedAt;
      const payload = {
        method,
        url,
        statusCode,
        durationMs: duration,
        referer,
        userAgent,
        ip,
        source,
      };
      // Nest's `Logger` não tem `.info()` (é `.log()`) — os dois loggers têm
      // APIs de nível "informativo" com nomes diferentes, por isso o
      // if/else em vez de só trocar qual instância usar.
      if (pinoLog) {
        pinoLog.info(payload);
      } else {
        this.logger.log(payload);
      }
    };

    return next.handle().pipe(
      tap(() => line(res.statusCode ?? 200)),
      // Sem isto, qualquer requisição que termina em erro (4xx/5xx) não
      // deixa nenhuma linha de log — só o sucesso (tap) era coberto antes.
      catchError((error: unknown) => {
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
