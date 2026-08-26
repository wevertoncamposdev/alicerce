import { IsArray, IsOptional, IsString, IsInt } from 'class-validator';
import { ApiPropertyOptional, ApiExtraModels } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SortSpecDto {
    @ApiPropertyOptional({ type: String })
    field!: string;

    @ApiPropertyOptional({ enum: ['asc', 'desc'], type: String })
    direction!: 'asc' | 'desc';
}

export class PaginationSpecDto {
    @ApiPropertyOptional({ type: Number })
    @IsInt()
    pageIndex!: number;

    @ApiPropertyOptional({ type: Number })
    @IsInt()
    pageSize!: number;
}

@ApiExtraModels(SortSpecDto, PaginationSpecDto)
export class SearchBaseDto {
    @ApiPropertyOptional() @IsOptional() @IsString() searchText?: string;

    @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() groupBy?: string[];

    @ApiPropertyOptional({ type: () => SortSpecDto, isArray: true })
    @IsOptional()
    @IsArray()
    @Type(() => SortSpecDto)
    sort?: SortSpecDto[];

    @ApiPropertyOptional({ type: () => PaginationSpecDto })
    @IsOptional()
    @Type(() => PaginationSpecDto)
    pagination?: PaginationSpecDto;

    @ApiPropertyOptional() @IsOptional() filters?: Record<string, unknown>;
}