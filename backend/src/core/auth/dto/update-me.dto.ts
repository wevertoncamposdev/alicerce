import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { TrimToNull } from '@core/common/transformers/trim-to-null';

const THEME_VALUES = ['light', 'dark', 'system'] as const;

export class UpdateMeDto {
  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsIn(THEME_VALUES)
  theme?: (typeof THEME_VALUES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  // Posse validada em MeService.updateMe (ver ADR 0010) — só aceita um
  // File que o próprio usuário enviou.
  @IsOptional()
  @IsUUID()
  avatarFileId?: string;
}
