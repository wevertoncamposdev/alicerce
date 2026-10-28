/**
 * Forma mínima que UserMapper espera — não é o model `User` do Prisma
 * inteiro, só os campos que o mapper de fato usa.
 */
export interface UserLike {
  id: string;
  email: string;
  name?: string | null;
  status: string;
  avatarFileId?: string | null;
  password?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
