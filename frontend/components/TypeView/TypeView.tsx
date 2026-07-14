/**@TypeView */

import { favoriteColumns } from "./ListView/columns";
import { ListView } from "./ListView/ListView";
import { CardsView } from "./CardsView/CardsView";
import { CalendarView } from "./CalendarView/CalendarView";
import { TimeLineView } from "./TimelineView/TimeLineView";

type TypeViewMode = "list" | "cards" | "calendar" | "timeline";

type TypeViewProps<T> = {
    data: T[];
    mode: TypeViewMode;
};

export function TypeView<T>({ data, mode }: TypeViewProps<T>) {
    switch (mode) {
        case "list":
            return <ListView data={data} columns={favoriteColumns} />;
        case "cards":
            return <CardsView data={data} />;
        case "calendar":
            return <CalendarView data={data} />;
        case "timeline":
            return <TimeLineView data={data} />;
        default:
            return <div>modo {mode} ainda não implementado</div>;
    }
}