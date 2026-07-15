// CalendarView.tsx
import { groupByDay } from '@components/TypeView/CalendarView/groupByDay';

export function CalendarView<T extends { id: string | number; title: string; createdAt: string }>({ data }: { data: T[] }) {
    const grouped = groupByDay(data);
    return (
        <div>
            {Object.entries(grouped).map(([day, items]) => (
                <div key={day}>
                    <strong>{day}</strong>
                    <ul>{items.map((i) => <li key={i.id}>{i.title}</li>)}</ul>
                </div>
            ))}
        </div>
    );
}