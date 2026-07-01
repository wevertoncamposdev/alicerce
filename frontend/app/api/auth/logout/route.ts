import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/session";

/**
 * POST /api/auth/logout
 *
 * O JWT do Nest é stateless (não existe endpoint de logout na API — não tem
 * "sessão" pra invalidar lá). Logout aqui é 100% um assunto do Next.js:
 * apagar o cookie. E só o servidor consegue apagar um cookie httpOnly —
 * é por isso que isso precisa ser uma rota, não um `document.cookie = ...`
 * no cliente.
 */
export async function POST() {
    await clearSessionCookies();
    return NextResponse.json({ ok: true });
}