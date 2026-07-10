// features/auth/services/login.service.ts
import "server-only";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

export async function favoritesCreated(token: string, title: string, url: string) {
    const res = await fetch(`${INTERNAL_API_URL}/favorites`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",  },
        body: JSON.stringify({ title, url }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.message ?? "Erro ao criar favorito.");
    }

    return data as { id: string; title: string; url: string };
}