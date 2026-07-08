"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AuthUserProfile, RegisterInput } from "@/features/auth/auth.service";
import { toErrorMessage } from "@/types/api";

const TENANT_COOKIE = "session_tenant";

type AuthState = {
    user: AuthUserProfile | null;
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

type AuthProviderProps = {
    children: React.ReactNode;
    initialUser?: AuthUserProfile | null;
    initialTenantId?: string | null;
};

export function AuthProvider({ children, initialUser = null, initialTenantId = null }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUserProfile | null>(initialUser);
    const [currentTenantId, setCurrentTenantIdState] = useState<string | null>(initialTenantId);

    const setCurrentTenantId = useCallback((tenantId: string | null) => {
        setCurrentTenantIdState(tenantId);

        if (!tenantId) {
            document.cookie = `${TENANT_COOKIE}=; path=/; max-age=0`;
            return;
        }

        document.cookie = `${TENANT_COOKIE}=${tenantId}; path=/; max-age=${60 * 60 * 8}`;
    }, []);

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
    }, [setCurrentTenantId]);

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
    }, [setCurrentTenantId]);

    const signOut = useCallback(async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
        setCurrentTenantId(null);
    }, [setCurrentTenantId]);

    const hasRole = useCallback((role: string) => (user?.roles ?? []).includes(role), [user]);
    const hasPermission = useCallback((permission: string) => (user?.permissions ?? []).includes(permission), [user]);

    const value = useMemo<AuthState>(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            currentTenantId,
            hasRole,
            hasPermission,
            setCurrentTenantId,
            signIn,
            signUp,
            signOut,
        }),
        [user, currentTenantId, hasRole, hasPermission, setCurrentTenantId, signIn, signUp, signOut],
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