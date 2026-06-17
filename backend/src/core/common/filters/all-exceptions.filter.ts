import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const responseData =
            exception instanceof HttpException
                ? exception.getResponse()
                : { message: 'Erro interno do servidor' };

        const payload =
            typeof responseData === 'object'
                ? { statusCode: status, timestamp: new Date().toISOString(), path: request.url, ...responseData }
                : { statusCode: status, timestamp: new Date().toISOString(), path: request.url, message: responseData };

        // Express response object
        if (typeof response.status === 'function' && typeof response.json === 'function') {
            response.status(status).json(payload);
            return;
        }

        // Fastify reply object
        if (typeof response.code === 'function' && typeof response.send === 'function') {
            response.code(status).send(payload);
            return;
        }

        // Fallback for raw Node response object
        response.statusCode = status;
        response.setHeader?.('content-type', 'application/json');
        response.end?.(JSON.stringify(payload));
    }
}