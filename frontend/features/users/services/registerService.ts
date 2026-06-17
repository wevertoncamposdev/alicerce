import { apiRequest } from "@/lib/api-client";

export interface RegisterInput {
    email: string;
    password: string;
    tenantId: string;
}

export async function registerUser(params: {
    token: string;
    data: RegisterInput;
}) {
    const { token, data } = params;

    return apiRequest("/user", {
        method: "POST",
        token,
        body: data,
    });
}
