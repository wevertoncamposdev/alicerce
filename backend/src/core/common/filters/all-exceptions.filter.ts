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

        // Fastify: use .send(), Express: use .json()
        if (typeof response.json === 'function') {
            response.status(status).json(payload); // Express
        } else {
            response.status(status).send(payload); // Fastify
        }
    }
}