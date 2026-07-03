import {
    IsString,
    IsUrl,
    IsDateString,
    MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteDto {
    @ApiProperty({
        description: 'Favoritos do usuário',
        example: 'Meu Favorito',
    })
    @IsString()
    @MaxLength(255)
    title!: string;

    @ApiProperty({
        description: 'URL do favorito',
        example: 'https://www.example.com',
    })
    @IsUrl()
    url!: string;

    @ApiProperty({
        description: 'ID do usuário',
        example: 'f85445f6-126c-4b4c-b25f-094613eb41ce',
    })
    @IsString()
    userId!: string;

    @ApiProperty({
        description: 'Data de criação do favorito',
        example: '2023-01-01T00:00:00Z',
    })
    @IsDateString()
    createdAt!: string;

    @ApiProperty({
        description: 'ID do tenant',
        example: 'f85445f6-126c-4b4c-b25f-094613eb41ce',
    })
    @IsString()
    tenantId!: string;
}
