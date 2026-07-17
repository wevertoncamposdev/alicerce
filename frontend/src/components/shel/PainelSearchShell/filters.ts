// types/filter.ts
type FilterSchema = {
  key: string;
  label: string;
  type: "select" | "text" | "date";
  options?: string[];
};

const favoriteFilters: FilterSchema[] = [
  { key: "category", label: "Categoria", type: "select", options: ["work", "study"] },
  { key: "title", label: "Título", type: "text" },
];