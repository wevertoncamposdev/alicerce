import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Só ACTIVE/SUSPENDED aqui — INACTIVE/ARCHIVED (demais valores do enum
// Status) não fazem parte do fluxo de management mínimo (ADR 0012).
export class UpdateTenantStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED'])
  @IsNotEmpty()
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  status!: 'ACTIVE' | 'SUSPENDED';
}
