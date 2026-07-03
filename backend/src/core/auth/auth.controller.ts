import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Request,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { Public } from './auth.guard';
import { SignUpPublicDto } from './dto/sign-up-public.dto';

// Nome do cookie que transporta o refresh token entre BFF e Nest.
// O access token nunca viaja em cookie para o Nest — ele vem como Bearer no header.
const REFRESH_COOKIE = 'refresh_token';

// Opções de cookie compartilhadas entre set e clear
const COOKIE_PATH = '/api/auth';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('register')
  async signUp(
    @Body() signUpPublicDto: SignUpPublicDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const session = await this.authService.signUpPublic(signUpPublicDto);
    this.setRefreshCookie(res, session.refresh_token);

    // refresh_token nunca sai no JSON — fica só no cookie httpOnly.
    const { refresh_token: _, ...publicPayload } = session;
    return publicPayload;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const session = await this.authService.signIn(signInDto);
    this.setRefreshCookie(res, session.refresh_token);

    const { refresh_token: _, ...publicPayload } = session;
    return publicPayload;
  }

  /**
   * POST /api/auth/refresh
   *
   * Chamado pelo BFF do Next.js quando recebe 401 do Nest (access token expirado).
   * O BFF reenvia o cookie de refresh_token automaticamente (mesma origem, path /api/auth).
   *
   * É @Public() porque não exige access token — a autenticação é feita
   * pelo próprio refresh token no cookie.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Request() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE];

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    const session = await this.authService.refreshTokens(rawToken);
    this.setRefreshCookie(res, session.refresh_token);

    const { refresh_token: _, ...publicPayload } = session;
    return publicPayload;
  }

  /**
   * POST /api/auth/logout
   *
   * Revoga o refresh token no banco (toda a família) e apaga o cookie.
   * O access token ainda é válido até expirar (TTL curto — 15 min — é aceitável).
   * Para revogação imediata de access token, uma blacklist em Redis é necessária (Fase 4).
   */
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Request() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE];

    if (rawToken) {
      await this.authService.revokeRefreshToken(rawToken);
    }

    this.clearRefreshCookie(res);
  }

  @Get('profile')
  getProfile(@Request() req: FastifyRequest) {
    return this.authService.getProfile((req as any).user.sub);
  }

  // ------------------------------------------------------------------ helpers

  private setRefreshCookie(res: FastifyReply, token: string) {
    res.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // Restringir o path reduz a superfície: este cookie só é enviado
      // automaticamente para /api/auth/* — não para /api/users, /api/tasks etc.
      path: COOKIE_PATH,
      maxAge: COOKIE_MAX_AGE_MS / 1000, // Fastify usa segundos
    });
  }

  private clearRefreshCookie(res: FastifyReply) {
    res.clearCookie(REFRESH_COOKIE, {
      path: COOKIE_PATH,
    });
  }
}
