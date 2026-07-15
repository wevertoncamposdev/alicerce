
import { SearchInput } from "@components/layout/SearchInput";

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