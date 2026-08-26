"use client";
import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";

type ToastMessage = { id: number; title?: string; description?: string };

const ToastContext = React.createContext<{ show: (t: Omit<ToastMessage, 'id'>) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [messages, setMessages] = React.useState<ToastMessage[]>([]);
    const nextId = React.useRef(1);

    const show = React.useCallback((m: Omit<ToastMessage, 'id'>) => {
        const id = nextId.current++;
        setMessages((s) => [...s, { id, ...m }]);
        // auto remove after 4s
        setTimeout(() => setMessages((s) => s.filter((x) => x.id !== id)), 4000);
    }, []);

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            <ToastPrimitive.Provider>
                <div className="fixed bottom-6 right-6 z-50 space-y-2">
                    {messages.map((m) => (
                        <ToastPrimitive.Root key={m.id} className="bg-white p-3 rounded shadow-lg border">
                            {m.title ? <div className="font-semibold">{m.title}</div> : null}
                            {m.description ? <div className="text-sm text-muted-foreground">{m.description}</div> : null}
                        </ToastPrimitive.Root>
                    ))}
                </div>
            </ToastPrimitive.Provider>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = React.useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}

export default ToastProvider;
