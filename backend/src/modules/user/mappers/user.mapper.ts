import { Injectable } from '@nestjs/common';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserLike } from '../types/user-like.type';

@Injectable()
export class UserMapper {
  // `avatarUrl` é resolvido por quem chama (I/O — signed URL via
  // FilesService), não pelo mapper em si — mesmo motivo de
  // MeService/TenantService nunca resolverem dentro de um mapper puro.
  mapToResponseDto(
    user: UserLike,
    avatarUrl: string | null = null,
  ): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      status: user.status,
      avatarFileId: user.avatarFileId ?? null,
      avatarUrl,
      pendingInvite: user.password === null || user.password === undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt ?? null,
    };
  }

  mapToResponseDtoArray(users: UserLike[]): UserResponseDto[] {
    return users.map((user) => this.mapToResponseDto(user));
  }
}
