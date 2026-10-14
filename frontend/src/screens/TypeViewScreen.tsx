// screens/TypeViewScreen.tsx
import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { ApiServerError } from "@lib/api-server";
import { AppTopbar } from "@components/Layout/AppTopbar";
import { RecordListHost } from "@components/Layout/RecordListHost";
import { RecordSearch } from "@components/Layout/RecordSearch";
import { PermissionDeniedView } from "@components/Layout/PermissionDeniedView";
import { TypeView, type TypeViewMode } from "@components/TypeView/TypeView";
import { ViewSwitcher } from "@components/TypeView/ViewSwitcher";
import { CreateRecordSheet } from "@components/TypeView/CreateRecordSheet";
import type { SearchResult } from "@lib/data-provider/types";

type TypeViewScreenProps = {
    moduleName: string;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function TypeViewScreen({ moduleName, searchParams }: TypeViewScreenProps) {
    const rawParams = await searchParams;
    const mod = getModule(moduleName);

    const view = typeof rawParams.view === "string" ? rawParams.view : mod.defaultView;
    const mode: TypeViewMode = mod.views.includes(view) ? view : mod.defaultView;

    const args = mod.parseListState(rawParams);
    const dataProvider = createDataProvider();

    let result: SearchResult<unknown>;
    try {
        result = await dataProvider.search(moduleName, args);
    } catch (err) {
        if (err instanceof ApiServerError && err.status === 403) {
            return (
                <div>
                    <AppTopbar title={mod.label} />
                    <PermissionDeniedView message={err.message} />
                </div>
            );
        }
        throw err;
    }

    const listContext = { data: result.data, searchArgs: args };

    return (
        <div>
            <AppTopbar
                title={mod.label}
                center={<RecordSearch searchText={args.searchText} resultCount={result.pagination.total} />}
                actions={
                    <>
                        <ViewSwitcher current={mode} views={mod.views} />
                        {mod.listLayout.form ? (
                            <CreateRecordSheet label={mod.label}>
                                {mod.listLayout.form(listContext)}
                            </CreateRecordSheet>
                        ) : null}
                    </>
                }
            />
            <div className="px-4 py-3">
                <RecordListHost>
                    <TypeView
                        layout={mod.listLayout}
                        mode={mode}
                        context={listContext}
                    />
                </RecordListHost>
            </div>
        </div>
    );
}