import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '@modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const tenantId = req.tenantId;
    const method = req.method;
    const url = req.originalUrl;
    const body = req.body;

    return next.handle().pipe(
      tap((result) => {
        // Só audita ações relevantes (CRUD, login, etc)
        if (["POST", "PATCH", "DELETE"].includes(method) || url.includes("login")) {
          this.auditService.register({
            tenantId,
            userId: user?.id,
            action: method,
            entity: url,
            payload: body,
          });
        }
      })
    );
  }
}
