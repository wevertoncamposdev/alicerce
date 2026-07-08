// features/favorites/queries.ts
import 'server-only';
import { cookies } from 'next/headers';

export async function getFavorites() {
    const cookieStore = await cookies();

    const res = await fetch(`${process.env.API_URL}/favorites`, {
        headers: { cookie: cookieStore.toString() },
        cache: 'no-store', // ou next: { tags: ['favorites'] } se quiser revalidar por tag
    });

    if (!res.ok) throw new Error('Erro ao carregar favoritos');
    return res.json();
}