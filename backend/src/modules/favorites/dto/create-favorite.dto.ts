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
}
