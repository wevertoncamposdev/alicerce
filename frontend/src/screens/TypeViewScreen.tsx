// screens/TypeViewScreen.tsx
import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { AppTopbar } from "@components/Layout/AppTopbar";
import { RecordListHost } from "@components/Layout/RecordListHost";
import { RecordSearch } from "@components/Layout/RecordSearch";
import { TypeView, type TypeViewMode } from "@components/TypeView/TypeView";
import { ViewSwitcher } from "@components/TypeView/ViewSwitcher";
import { CreateRecordSheet } from "@components/TypeView/CreateRecordSheet";

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
    const result = await dataProvider.search(moduleName, args);
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