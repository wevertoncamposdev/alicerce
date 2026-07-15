// components/type-view/TypeView.tsx
import { CardsView } from "./cards-view/CardsView";
import { TextView } from "./text-view/TextView";
import { FormView } from "./form-view/FormView";

export type TypeViewMode = "list" | "cards" | "graph" | "text" | "form";

export function TypeView<T extends { id: string | number; title: string }>({
    data,
    mode,
    cardsView, // um ReactNode já pronto, montado no client, ex: <CardsView data={data} />
    listView, // um ReactNode já pronto, montado no client, ex: <FavoritesListView data={data} />
    graphView, // um ReactNode já pronto, montado no client, ex: <FavoritesGraphView data={data} />
    formView,
}: {
    data: T[];
    mode: TypeViewMode;
    cardsView: React.ReactNode;
    listView: React.ReactNode;
    graphView: React.ReactNode;
    formView: React.ReactNode;
}) {
    switch (mode) {
        case "list":
            return listView;
        case "cards":
            return cardsView;
        case "graph":
            return graphView;
        case "text":
            return <TextView data={data} />;
        case "form":
            return formView;
        default:
            return mode satisfies never;
    }
}