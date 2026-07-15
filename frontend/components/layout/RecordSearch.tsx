
import { SearchInput } from "./SearchInput";

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