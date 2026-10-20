import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '@core/prisma/prisma.service';
import { AccountTokenType } from '@core/prisma/generated/enums';

// Mesmo padrão de AuthService.createRefreshToken: token opaco aleatório,
// só o hash é persistido — o valor cru nunca é gravado (ver ADR 0011).
function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Token de uso único genérico pros quatro fluxos de conta (convite, reset
 * de senha, verificar e-mail, trocar e-mail) — cross-cutting, por isso
 * vive em core/auth como AuthService/MeService já vivem. Usado por
 * AuthService, MeService e UsersService (modules/ pode importar de
 * core/, só o inverso é proibido).
 */
@Injectable()
export class AccountTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(params: {
    userId: string;
    tenantId: string;
    type: AccountTokenType;
    ttlMs: number;
    newEmail?: string;
  }): Promise<string> {
    const rawToken = crypto.randomBytes(48).toString('hex');

    await this.prisma.accountToken.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + params.ttlMs),
        newEmail: params.newEmail,
      },
    });

    return rawToken;
  }

  // Nunca diferencia "não existe" de "expirado" de "já usado" no erro —
  // só uma mensagem genérica, pra não dar pista sobre qual dos três
  // aconteceu.
  async consume(rawToken: string, type: AccountTokenType) {
    const token = await this.prisma.accountToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });

    const isValid =
      token !== null &&
      token.type === type &&
      token.usedAt === null &&
      token.expiresAt > new Date();

    if (!isValid) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    await this.prisma.accountToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    return token;
  }

  // Usado pelo reenvio de convite (etapa 7.4): invalida tokens não
  // usados do mesmo tipo antes de emitir um novo.
  async invalidatePending(
    userId: string,
    type: AccountTokenType,
  ): Promise<void> {
    await this.prisma.accountToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
