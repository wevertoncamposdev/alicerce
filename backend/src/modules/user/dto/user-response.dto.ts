import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  avatarFileId!: string | null;

  // Resolvido (signed URL) por quem chama o mapper — nunca o fileId cru
  // vira link direto (ver ADR 0010, mesmo padrão de MeService/TenantService).
  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  // Convite ainda não aceito (etapa 7.4) — true enquanto a senha não foi
  // definida. Nunca expõe a senha/hash em si, só este booleano.
  @ApiProperty()
  pendingInvite!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;

  @ApiPropertyOptional({ nullable: true })
  deletedAt?: Date | null;
}
