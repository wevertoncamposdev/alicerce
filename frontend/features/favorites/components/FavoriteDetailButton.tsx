import Link from "next/link";
import { Button } from "@/components/ui/button";
export function FavoriteDetailButton({ id }: { id: string }) {
    return (
        <Link href={`/favorites/${id}`}>
            <Button className="ml-2" variant="outline" size="sm">
                Detalhes
            </Button>
        </Link>
    );
};