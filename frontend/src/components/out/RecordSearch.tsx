
import { SearchInput } from "@/components/out/SearchInput";

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