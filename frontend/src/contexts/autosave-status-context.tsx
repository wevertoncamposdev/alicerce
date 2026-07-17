'use client';

import * as React from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

type AutoSaveStatusContextValue = {
    status: AutoSaveStatus;
    errorMessage: string | null;
    setStatus: (status: AutoSaveStatus, errorMessage?: string | null) => void;
};

const AutoSaveStatusContext = React.createContext<AutoSaveStatusContextValue | null>(null);

export function AutoSaveStatusProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatusState] = React.useState<AutoSaveStatus>("idle");
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const setStatus = React.useCallback((next: AutoSaveStatus, nextError: string | null = null) => {
        setStatusState(next);
        setErrorMessage(nextError);
    }, []);

    const value = React.useMemo(
        () => ({ status, errorMessage, setStatus }),
        [status, errorMessage, setStatus],
    );

    return (
        <AutoSaveStatusContext.Provider value={value}>
            {children}
        </AutoSaveStatusContext.Provider>
    );
}

export function useAutoSaveStatus() {
    const ctx = React.useContext(AutoSaveStatusContext);
    if (!ctx) {
        throw new Error("useAutoSaveStatus deve ser usado dentro de um AutoSaveStatusProvider");
    }
    return ctx;
}