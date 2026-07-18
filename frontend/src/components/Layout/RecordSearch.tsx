
import { SearchInput } from "@/components/Layout/SearchInput";

type Props = {
    searchText?: string;
    resultCount?: number;
};

export function RecordSearch({
    searchText,
    resultCount,
}: Props) {
    return (
        <SearchInput defaultValue={searchText} resultCount={resultCount} />
    );
}