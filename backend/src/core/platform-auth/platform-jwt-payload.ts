/**
 * Payload do JWT de usuário de plataforma (ADR 0012) — assinado com
 * PLATFORM_JWT_SECRET, nunca com JWT_SECRET (o secret de tenant). Sem
 * `tenantId` de propósito: um platform user não pertence a nenhum tenant.
 * `scope: 'platform'` é redundante com o secret (quem verifica já sabe que
 * tipo de token é), mas documenta a intenção no próprio payload.
 */
export interface PlatformJwtPayload {
  sub: string;
  username: string;
  scope: 'platform';
}

export interface RequestWithPlatformAuth {
  platformUser?: PlatformJwtPayload;
  headers: Record<string, string | string[] | undefined>;
}
