/**
 * Forma mínima que UserMapper/UserValidator esperam — não é o model `User`
 * do Prisma (que não tem `name`/`birthDate` hoje; são campos legados desta
 * camada, pendentes da limpeza de entidades do AGENTS.md Fase 2). Existe só
 * para tirar o `any` implícito destes dois arquivos.
 */
export interface UserLike {
  id: string;
  email: string;
  name?: string | null;
  birthDate?: Date | null;
  password?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
