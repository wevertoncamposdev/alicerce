import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/session";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://localhost:5000/api";

/** POST /api/auth/register — mesmo padrão do login, ver comentários lá. */
export async function POST(request: NextRequest) {
    const body = await request.json();

    const upstreamResponse = await fetch(`${INTERNAL_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const payload = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
        return NextResponse.json(payload, { status: upstreamResponse.status });
    }

    await setSessionCookies({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        tenantId: payload.tenant.id,
    });

    return NextResponse.json({
        user: payload.user,
        tenant: payload.tenant,
    });
}