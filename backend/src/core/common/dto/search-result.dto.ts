
export interface SearchResultDto<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}