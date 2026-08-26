"use client";
import React from "react";
import type { UserEntity } from "../types/types";
import { ListView } from "@components/TypeView/ListView/ListView";
import { userColumns } from "@modules/users/components/columns";

export function UsersListView({ data }: { data: UserEntity[] }) {
    return <ListView data={data} columns={userColumns} detail={"/users"} />;
}

export default UsersListView;
