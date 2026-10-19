import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { MeService } from './me.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { JwtPayload } from '@core/common/types/http.types';
import { REFRESH_COOKIE } from './cookie.constants';

type AuthenticatedRequest = FastifyRequest & { user: JwtPayload };

/**
 * `/me` — self-service do próprio usuário autenticado. Sem `@Permissions`:
 * a única regra de acesso é "é o próprio usuário", já garantida pelo
 * `AuthGuard` global. Ver ADR 0008 (por que isto fica em core/auth, não num
 * módulo novo).
 */
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  getMe(@Request() req: AuthenticatedRequest) {
    return this.meService.getMe(req.user.sub, req.user.tenantId);
  }

  @Patch()
  updateMe(@Request() req: AuthenticatedRequest, @Body() dto: UpdateMeDto) {
    return this.meService.updateMe(req.user.sub, req.user.tenantId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('password')
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ChangeMyPasswordDto,
  ) {
    await this.meService.changePassword(
      req.user.sub,
      dto,
      req.cookies?.[REFRESH_COOKIE],
    );
  }

  @Get('sessions')
  listSessions(@Request() req: AuthenticatedRequest) {
    return this.meService.listSessions(
      req.user.sub,
      req.cookies?.[REFRESH_COOKIE],
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('sessions/:familyId')
  async revokeSession(
    @Request() req: AuthenticatedRequest,
    @Param('familyId') familyId: string,
  ) {
    await this.meService.revokeSession(req.user.sub, familyId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('sessions')
  async revokeOtherSessions(@Request() req: AuthenticatedRequest) {
    await this.meService.revokeOtherSessions(
      req.user.sub,
      req.cookies?.[REFRESH_COOKIE],
    );
  }
}
