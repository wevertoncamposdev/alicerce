// create decorator to extract the user sub from the request object
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithAuth } from '@core/common/types/http.types';

export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    return request.user?.sub;
  },
);
