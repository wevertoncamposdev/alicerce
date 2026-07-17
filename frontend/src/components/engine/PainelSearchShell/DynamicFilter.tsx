// DynamicFilter.tsx — renderiza o input certo baseado no schema escolhido
import { useState } from "react";
import { FilterSelect } from "@/components/engine/PainelSearchShell/FilterSelect";
import { SearchInput } from "@/components/engine/PainelSearchShell/SearchInput";

export function DynamicFilter({ schema }: { schema: FilterSchema[] }) {
    const [activeKey, setActiveKey] = useState(schema[0]?.key);
    const active = schema.find((f) => f.key === activeKey);

    return (
        <div>
            <select value={activeKey} onChange={(e) => setActiveKey(e.target.value)}>
                {schema.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            {active?.type === "select" && <FilterSelect paramKey={active.key} options={active.options ?? []} />}
            {active?.type === "text" && <SearchInput /* adaptar paramKey */ />}
        </div>
    );
}