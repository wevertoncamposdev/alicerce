
import { SearchInput } from "@/components/Layout/SearchInput";

type Props = {
    searchText?: string;
};

export function RecordSearch({
    searchText,
}: Props) {
    return (
        <SearchInput defaultValue={searchText} />
    );
}