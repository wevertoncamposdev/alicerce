import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

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

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - startedAt;


                console.log(
                    `${method} ${url} ${res.statusCode} - ${duration}ms - Referer: ${referer} - Source: ${source}`,
                );
            }),
        );
    }
}