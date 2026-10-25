import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithPlatformAuth } from './platform-jwt-payload';

export const CurrentPlatformUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithPlatformAuth>();
    return request.platformUser;
  },
);
