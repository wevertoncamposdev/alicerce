'use server';
import { redirect } from "next/navigation";
import { getSessionToken, setSessionCookies } from "@/lib/session";
import { favoritesCreated} from "../services/favorites.services";

export async function favorites(_prevState: { error: string | null }, formData: FormData) {
    try {
        const token = await getSessionToken();
        await favoritesCreated(
            token as string,
            formData.get("title") as string,
            formData.get("url") as string
        );
    } catch (err) {
        return { error: (err as Error).message };
    }

    return redirect("/favorites");
}