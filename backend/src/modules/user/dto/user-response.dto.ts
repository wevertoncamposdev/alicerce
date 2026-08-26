import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ nullable: true })
  age!: number | null;

  @ApiProperty()
  createAge!: number;

  @ApiPropertyOptional()
  validationStatus?: boolean;

  @ApiPropertyOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  isAdult?: boolean;

  @ApiPropertyOptional({ nullable: true })
  birthDate?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;

  @ApiPropertyOptional({ nullable: true })
  deletedAt?: Date | null;
}
