import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTenantBoardTermDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
