export function groupByDay<T extends { createdAt: string }>(data: T[]) {
    return data.reduce<Record<string, T[]>>((acc, item) => {
        const day = new Date(item.createdAt).toISOString().slice(0, 10);
        acc[day] = acc[day] ? [...acc[day], item] : [item];
        return acc;
    }, {});
}