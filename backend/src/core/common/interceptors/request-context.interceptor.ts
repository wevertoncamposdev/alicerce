import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { requestContextStorage } from '@core/common/context/request-context';
import { RequestWithAuth } from '@core/common/types/http.types';

/**
 * Precisa ser o PRIMEIRO interceptor global registrado (app.module.ts) para
 * que seu escopo de AsyncLocalStorage envolva todos os demais interceptors e
 * o handler — é o que permite a extension de RLS do Prisma
 * (tenant-rls.extension.ts) descobrir o tenantId da requisição corrente sem
 * precisar que cada service passe `tenantId` explicitamente em toda chamada.
 *
 * Roda depois do TenantScopeGuard (guards vêm antes de interceptors no
 * pipeline do Nest), então request.tenantId já está resolvido aqui — exceto
 * em rotas @Public(), onde não há tenant e a extension do Prisma roda sem
 * contexto (comportamento esperado: ver AuthService, que lida com as únicas
 * consultas cross-tenant legítimas do sistema).
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const tenantId = request?.tenantId;

    if (!tenantId) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      // Precisa ser uma função `async` (mesmo sem nenhum `await` dentro) —
      // descoberto empiricamente: uma arrow SÍNCRONA que só retorna/dispara
      // uma Promise/Observable perde o contexto do AsyncLocalStorage para
      // tudo que rodar depois dela (ex.: a extension de RLS do Prisma, bem
      // mais abaixo na cadeia). Só `async () => {...}` faz o Node manter a
      // propagação do contexto pelas continuações internas — por isso o
      // `void` (a promise em si nunca importa) e o disable (o lint não tem
      // como saber que o `async` aqui é proposital, não um esquecimento).
      void requestContextStorage.run(
        { tenantId },
        // eslint-disable-next-line @typescript-eslint/require-await
        async () => {
          next.handle().subscribe(subscriber);
        },
      );
    });
  }
}
