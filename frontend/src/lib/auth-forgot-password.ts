'use server';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

export async function requestPasswordReset(
    _prevState: { error: string | null; success: boolean },
    formData: FormData,
) {
    const email = String(formData.get("email") ?? "");

    try {
        const res = await fetch(`${INTERNAL_API_URL}/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (!res.ok) {
            const payload = await res.json();
            throw new Error(payload?.message ?? "Falha ao solicitar redefinição de senha.");
        }
    } catch (err) {
        return { error: (err as Error).message, success: false };
    }

    return { error: null, success: true };
}
