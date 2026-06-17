import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '@modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) { }

  private sanitizePayload(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const clone = { ...(payload as Record<string, unknown>) };

    if ('password' in clone) {
      clone.password = '[REDACTED]';
    }

    if ('newPassword' in clone) {
      clone.newPassword = '[REDACTED]';
    }

    return clone;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const tenantId = req.tenantId;
    const method = req.method;
    const url = req.originalUrl;
    const body = req.body;

    return next.handle().pipe(
      tap((result) => {
        // Só audita ações relevantes (CRUD, login, onboarding, etc.)
        if (!['POST', 'PATCH', 'DELETE'].includes(method) && !url.includes('login')) {
          return;
        }

        const resolvedTenantId =
          tenantId ?? user?.tenantId ?? result?.tenant?.id ?? result?.user?.tenantId;
        const resolvedUserId = user?.id ?? user?.sub ?? result?.user?.id;

        void this.auditService
          .register({
            tenantId: resolvedTenantId,
            userId: resolvedUserId,
            action: method,
            entity: url,
            payload: this.sanitizePayload(body),
          })
          .catch(() => {
            // Auditoria não deve interromper o request principal.
          });
      }),
    );
  }
}
