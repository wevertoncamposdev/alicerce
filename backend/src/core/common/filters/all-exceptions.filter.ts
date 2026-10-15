import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { AuditService } from '@modules/audit/audit.service';
import { resolveAuditEntityFromUrl } from '@core/common/utils/audit-entity.util';
import { RequestWithAuth } from '@core/common/types/http.types';
import { ResponseLike } from '@core/common/types/response-like.type';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  constructor(private readonly auditService: AuditService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ResponseLike>();
    const request = ctx.getRequest<Partial<RequestWithAuth>>();

    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Sem isto, uma exceção que não é HttpException (bug real de código)
    // vira só "Erro interno do servidor" na resposta e não deixa nenhum
    // rastro no log — o único jeito de descobrir o que quebrou seria
    // reproduzir manualmente. Erros de negócio (HttpException) logam em
    // nível `warn` (esperados, não indicam bug); o resto loga em `error`
    // com stack trace.
    //
    // Log estruturado (objeto, não string concatenada) com `correlationId`
    // (request.id, nativo do Fastify — ver a config do logger em main.ts) —
    // o mesmo id que vai na resposta de erro ao cliente (abaixo) e no
    // registro de auditoria de 403, fechando o rastro requisição → log →
    // auditoria. `request.log` é o child logger pino já vinculado a esta
    // requisição; cai para o Logger do Nest (`this.logger`) quando não
    // existe (testes unitários com request mockado, contexto não-HTTP).
    const method = request?.method ?? '-';
    const url = request?.url ?? '-';
    const correlationId = request?.id;
    const log = request?.log ?? this.logger;
    if (exception instanceof HttpException) {
      log.warn({
        method,
        url,
        status,
        correlationId,
        message: exception.message,
      });
    } else {
      const stack = exception instanceof Error ? exception.stack : undefined;
      log.error({
        method,
        url,
        status,
        correlationId,
        message: 'erro não tratado',
        stack,
      });
    }

    // Auditoria de 403 (tentativa de escalonamento de privilégio) — só 403,
    // não 401: nesse ponto request.user já existe (AuthGuard roda antes de
    // qualquer guard de autorização e já validou o token), então
    // tenantId/userId — obrigatórios no model Audit — estão disponíveis.
    // Um 401 não tem usuário identificável para registrar. Fire-and-forget:
    // auditoria não deve atrasar nem derrubar a resposta de erro.
    if (status === Number(HttpStatus.FORBIDDEN) && request?.user) {
      void this.auditService
        .register({
          tenantId: request.user.tenantId,
          userId: request.user.sub ?? request.user.id,
          type: 'ACCESS_DENIED',
          action: method,
          entity: resolveAuditEntityFromUrl(url),
          payload: {
            message:
              exception instanceof HttpException
                ? exception.message
                : 'Acesso negado',
            correlationId,
          },
        })
        .catch(() => {
          // Auditoria não deve interromper a resposta de erro já em curso.
        });
    }

    const responseData =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Erro interno do servidor' };

    // `correlationId` na resposta — se o cliente reportar o erro ao suporte,
    // esse id localiza o log e (se for 403) o registro de auditoria exatos
    // dessa requisição, sem precisar casar por timestamp/mensagem.
    const payload =
      typeof responseData === 'object'
        ? {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            correlationId,
            ...responseData,
          }
        : {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            correlationId,
            message: responseData,
          };

    // Express response object. Chama status()/json() separadamente (em vez
    // de encadear o retorno de status()) para não depender do tipo exato
    // que cada runtime retorna — `res.status(code)` já aplica o código via
    // efeito colateral antes de retornar.
    const { status: setStatus, json } = response;
    if (typeof setStatus === 'function' && typeof json === 'function') {
      setStatus.call(response, status);
      json.call(response, payload);
      return;
    }

    // Fastify reply object
    const { code, send } = response;
    if (typeof code === 'function' && typeof send === 'function') {
      code.call(response, status);
      send.call(response, payload);
      return;
    }

    // Fallback for raw Node response object
    response.statusCode = status;
    response.setHeader?.('content-type', 'application/json');
    response.end?.(JSON.stringify(payload));
  }
}
