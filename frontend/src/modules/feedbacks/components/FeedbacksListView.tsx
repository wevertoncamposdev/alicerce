"use client";

import { ListView } from "@components/TypeView/ListView/ListView";
import { feedbackColumns } from "@modules/feedbacks/components/columns";
import type { FeedbackEntity } from "@modules/feedbacks/types/types";
import type { SearchResult, SortSpec } from "@core/data-provider/types";

type FeedbacksListViewProps = {
    data: FeedbackEntity[];
    pagination: SearchResult<FeedbackEntity>["pagination"];
    sort?: SortSpec[];
};

export function FeedbacksListView({ data, pagination, sort }: FeedbacksListViewProps) {
    return (
        <ListView
            data={data}
            columns={feedbackColumns}
            detail="/feedbacks"
            pagination={pagination}
            sort={sort}
        />
    );
}
