"use client";

// Ponte entre o Sheet de criação (Client Component, controla `open`) e o
// FormView dentro dele (também client, mas instanciado por um Server Component
// no meio — TypeViewScreen chama mod.listLayout.form(ctx) no servidor, então
// uma função de callback não pode viajar como prop através desse ponto).
// Context atravessa esse limite normalmente porque o Provider é Client
// Component; o Server Component no meio só repassa `children` sem precisar
// saber nada sobre isso.
import { createContext, useContext } from "react";

type CreateSheetContextValue = {
    onCreateSuccess?: () => void;
};

const CreateSheetContext = createContext<CreateSheetContextValue>({});

export function CreateSheetProvider({
    onCreateSuccess,
    children,
}: CreateSheetContextValue & { children: React.ReactNode }) {
    return <CreateSheetContext.Provider value={{ onCreateSuccess }}>{children}</CreateSheetContext.Provider>;
}

export function useCreateSheetContext() {
    return useContext(CreateSheetContext);
}
