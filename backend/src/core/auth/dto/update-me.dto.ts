import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const THEME_VALUES = ['light', 'dark', 'system'] as const;

export class UpdateMeDto {
  @IsOptional()
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
}
