"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { AuthUserProfile, RegisterInput } from "@/features/auth/auth.service";
import { toErrorMessage } from "@/types/api";

// Precisa bater com TENANT_COOKIE em lib/session.ts. Repetido aqui (em vez
// de importado) porque lib/session.ts tem `import "server-only"` no topo --
// importar de lá dentro de um Client Component quebraria o build de
// propósito. É o próprio Next.js nos protegendo de misturar as duas coisas.
const TENANT_COOKIE = "session_tenant";

type AuthState = {
    user: AuthUserProfile | null;
    loading: boolean;
    isAuthenticated: boolean;
    currentTenantId: string | null;
    hasRole: (role: string) => boolean;
    hasPermission: (permission: string) => boolean;
    setCurrentTenantId: (tenantId: string | null) => void;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (payload: RegisterInput) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

// Repare: NÃO existe mais `token` no estado. O componente client não tem
// mais como ler o token (ele mora só no cookie httpOnly). Tudo que hoje
// precisar de autenticação passa a falar com /api/... (mesma origem), que
// lê o cookie sozinho.

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTenantId, setCurrentTenantIdState] = useState<string | null>(null);

    // O cookie de tenant NÃO é httpOnly (só o de sessão é), então dá pra
    // escrever direto de `document.cookie` aqui no cliente -- sem precisar
    // de uma ida ao servidor só pra trocar de tenant.
    const setCurrentTenantId = useCallback((tenantId: string | null) => {
        setCurrentTenantIdState(tenantId);

        if (!tenantId) {
            document.cookie = `${TENANT_COOKIE}=; path=/; max-age=0`;
            return;
        }

        document.cookie = `${TENANT_COOKIE}=${tenantId}; path=/; max-age=${60 * 60 * 8}`;
    }, []);

    const restoreSession = useCallback(async () => {
        setLoading(true);

        try {
            // credentials "same-origin" já é o padrão do fetch para chamadas de
            // mesma origem, então o cookie viaja sozinho aqui.
            const response = await fetch("/api/auth/me");

            if (!response.ok) {
                setUser(null);
                setCurrentTenantId(null);
                return;
            }

            const data = await response.json();
            setUser(data.user);
            setCurrentTenantId(data.tenantId ?? data.user?.tenantId ?? null);
        } catch {
            setUser(null);
            setCurrentTenantId(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void restoreSession();
    }, [restoreSession]);

    const signIn = useCallback(async (email: string, password: string) => {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(toErrorMessage(new Error(data?.message), "Falha ao autenticar."));
        }

        setUser(data.user);
        setCurrentTenantId(data.tenant.id);
    }, []);

    const signUp = useCallback(async (payload: RegisterInput) => {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(toErrorMessage(new Error(data?.message), "Falha no auto-onboarding."));
        }

        setUser(data.user);
        setCurrentTenantId(data.tenant.id);
    }, []);

    const signOut = useCallback(async () => {
        // Precisa ser uma chamada ao servidor: JS não consegue apagar cookie httpOnly.
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
        setCurrentTenantId(null);
    }, []);

    const hasRole = useCallback(
        (role: string) => (user?.roles ?? []).includes(role),
        [user],
    );

    const hasPermission = useCallback(
        (permission: string) => (user?.permissions ?? []).includes(permission),
        [user],
    );

    const value = useMemo<AuthState>(
        () => ({
            user,
            loading,
            isAuthenticated: Boolean(user),
            currentTenantId,
            hasRole,
            hasPermission,
            setCurrentTenantId,
            signIn,
            signUp,
            signOut,
        }),
        [
            user,
            loading,
            currentTenantId,
            hasRole,
            hasPermission,
            setCurrentTenantId,
            signIn,
            signUp,
            signOut,
        ],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
    }

    return context;
}