"use client";
import type { UserEntity } from "../types/types";
import { ListView } from "@components/TypeView/ListView/ListView";
import { userColumns } from "@modules/users/components/columns";
import type { SearchResult, SortSpec } from "@core/data-provider/types";

type UsersListViewProps = {
    data: UserEntity[];
    pagination: SearchResult<UserEntity>["pagination"];
    sort?: SortSpec[];
};

function UsersListView({ data, pagination, sort }: UsersListViewProps) {
    return <ListView data={data} columns={userColumns} detail={"/users"} pagination={pagination} sort={sort} />;
}

export default UsersListView;
