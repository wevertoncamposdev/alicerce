'use server';
import { redirect } from "next/navigation";
import { setSessionCookies } from "@/lib/session";
import { loginWithCredentials } from "../services/login.service";

export async function login(_prevState: { error: string | null }, formData: FormData) {
    try {
        const payload = await loginWithCredentials(
            formData.get("email") as string,
            formData.get("password") as string
        );
        await setSessionCookies({
            accessToken: payload.access_token,
            refreshToken: payload.refresh_token,
            tenantId: payload.tenant.id,
        });
    } catch (err) {
        return { error: (err as Error).message };
    }

    redirect("/dashboard");
}