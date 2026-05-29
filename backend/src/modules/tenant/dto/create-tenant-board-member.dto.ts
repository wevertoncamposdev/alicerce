import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { BoardRoleType } from '@core/prisma/generated/enums';

export class CreateTenantBoardMemberDto {
  @IsUUID()
  boardTermId!: string;

  @IsUUID()
  personId!: string;

  @IsEnum(BoardRoleType)
  role!: BoardRoleType;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
