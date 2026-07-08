import { apiClient } from "@/lib/api-client";

export interface RegisterInput {
    email: string;
    password: string;
    tenantId: string;
}

// Nota: autenticação agora é via cookie httpOnly (lida pelo proxy em
// /api/proxy), então não é mais necessário receber/repassar `token`.
export async function registerUser(data: RegisterInput) {
    return apiClient.post("user", data);
}
