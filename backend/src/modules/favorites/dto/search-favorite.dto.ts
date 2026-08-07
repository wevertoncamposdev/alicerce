import {
    IsString,
    IsArray,
    IsUrl,
    IsDateString,
    MaxLength,
    IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// dto/search-favorites.dto.ts
export class SearchFavoritesDto {
    @ApiProperty({ required: false }) @IsOptional() @IsString() searchText?: string;
    @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() groupBy?: string[];
    @ApiProperty({ required: false }) @IsOptional() sort?: { field: string; direction: "asc" | "desc" }[];
    @ApiProperty({ required: false }) @IsOptional() pagination?: { pageIndex: number; pageSize: number };
    @ApiProperty({ required: false }) @IsOptional() filters?: Record<string, unknown>;
}