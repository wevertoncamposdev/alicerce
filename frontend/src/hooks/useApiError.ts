"use client";
import { ApiError } from "@/lib/api-client";

export default function useApiError() {
    return (err: unknown) => {
        if (!err) return "Erro desconhecido";
        try {
            if (err instanceof ApiError) return err.friendlyMessage();
            if (err instanceof Error) return err.message;
            if (typeof err === "string") return err;
            if (typeof err === "object") return JSON.stringify(err);
            return String(err);
        } catch (e) {
            return "Erro ao processar mensagem de erro";
        }
    };
}
