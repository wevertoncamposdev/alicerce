import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SortSpecDto {
    field!: string;
    direction!: 'asc' | 'desc';
}

export class PaginationSpecDto {
    pageIndex!: number;
    pageSize!: number;
}

export class SearchBaseDto {
    @ApiPropertyOptional() @IsOptional() @IsString() searchText?: string;

    @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() groupBy?: string[];

    @ApiPropertyOptional({ type: [SortSpecDto] }) @IsOptional() sort?: SortSpecDto[];

    @ApiPropertyOptional({ type: PaginationSpecDto }) @IsOptional() pagination?: PaginationSpecDto;

    @ApiPropertyOptional() @IsOptional() filters?: Record<string, unknown>;
}