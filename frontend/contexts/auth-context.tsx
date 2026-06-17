"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    AuthUserProfile,
    fetchProfile,
    loginWithPassword,
    registerPublic,
    RegisterInput,
} from "@/features/auth/auth.service";
import { toErrorMessage } from "@/types/api";

const TOKEN_STORAGE_KEY = "session.access_token";
const TENANT_STORAGE_KEY = "session.tenant_id";

type AuthState = {
    token: string | null;
    user: AuthUserProfile | null;
    loading: boolean;
    isAuthenticated: boolean;
    currentTenantId: string | null;
    hasRole: (role: string) => boolean;
    hasPermission: (permission: string) => boolean;
    setCurrentTenantId: (tenantId: string | null) => void;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (payload: RegisterInput) => Promise<void>;
    signOut: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTenantId, setCurrentTenantIdState] = useState<string | null>(null);

    const clearSession = useCallback(() => {
        setToken(null);
        setUser(null);
        setCurrentTenantIdState(null);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TENANT_STORAGE_KEY);
    }, []);

    const applySession = useCallback((session: {
        access_token: string;
        user: AuthUserProfile;
        tenant: { id: string };
    }) => {
        setToken(session.access_token);
        setUser(session.user);
        setCurrentTenantIdState(session.tenant.id);
        localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
        localStorage.setItem(TENANT_STORAGE_KEY, session.tenant.id);
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedTenantId = localStorage.getItem(TENANT_STORAGE_KEY);

        if (storedTenantId) {
            setCurrentTenantIdState(storedTenantId);
        }

        if (!storedToken) {
            setLoading(false);
            return;
        }

        void fetchProfile(storedToken)
            .then((profile) => {
                setToken(storedToken);
                setUser(profile);
                setCurrentTenantIdState(storedTenantId ?? profile.tenantId);
            })
            .catch(() => {
                clearSession();
            })
            .finally(() => {
                setLoading(false);
            });
    }, [clearSession]);

    const setCurrentTenantId = useCallback((tenantId: string | null) => {
        setCurrentTenantIdState(tenantId);

        if (!tenantId) {
            localStorage.removeItem(TENANT_STORAGE_KEY);
            return;
        }

        localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        try {
            const response = await loginWithPassword({ email, password });
            applySession(response);
        } catch (error) {
            throw new Error(toErrorMessage(error, "Falha ao autenticar."));
        }
    }, [applySession]);

    const signUp = useCallback(async (payload: RegisterInput) => {
        try {
            const response = await registerPublic(payload);
            applySession(response);
        } catch (error) {
            throw new Error(toErrorMessage(error, "Falha no auto-onboarding."));
        }
    }, [applySession]);

    const signOut = useCallback(() => {
        clearSession();
    }, [clearSession]);

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
            token,
            user,
            loading,
            isAuthenticated: Boolean(token),
            currentTenantId,
            hasRole,
            hasPermission,
            setCurrentTenantId,
            signIn,
            signUp,
            signOut,
        }),
        [
            token,
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
