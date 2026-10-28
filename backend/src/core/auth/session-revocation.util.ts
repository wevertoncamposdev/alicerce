import { PrismaService } from '@core/prisma/prisma.service';

// Consolida o `refreshToken.updateMany` que `UsersService.revokeAllSessions`
// e `MeService.revokeSessions` já duplicavam (ver ADR 0011) — extraído
// porque o fluxo de redefinir senha (etapa 7.3) precisa da mesma coisa de
// novo. Puramente mecânico: cada chamador mantém o que já fazia por fora
// (ex.: `UsersService` ainda invalida o cache de permissões depois).
export type RevokeSessionsScope =
  { all: true } | { exceptFamilyId?: string } | { onlyFamilyId: string };

// Aceita tanto `PrismaService` (tenant-scoped, a maioria dos chamadores)
// quanto `PrismaBootstrapService` (AuthService — fluxos sem tenant ainda
// resolvido, como redefinir senha) — os dois têm o mesmo
// `refreshToken.updateMany` gerado pelo Prisma, só a role de conexão difere.
type RefreshTokenClient = {
  refreshToken: Pick<PrismaService['refreshToken'], 'updateMany'>;
};

export async function revokeSessions(
  prisma: RefreshTokenClient,
  userId: string,
  scope: RevokeSessionsScope,
): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...('onlyFamilyId' in scope
        ? { familyId: scope.onlyFamilyId }
        : 'all' in scope
          ? {}
          : scope.exceptFamilyId
            ? { familyId: { not: scope.exceptFamilyId } }
            : {}),
    },
    data: { revokedAt: new Date() },
  });
}
