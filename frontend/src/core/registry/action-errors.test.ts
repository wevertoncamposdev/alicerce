import { describe, expect, it } from "vitest";
import { resolveActionFieldErrors } from "./action-errors";

// D5 (docs/PLAN-fundacao-ux.md): o backend devolve `{ details: { errors:
// [{ field, message }] } }` (ver backend/src/core/common/validation-error.util.ts
// e tenant.service.ts) — esta função extrai esse formato do erro que
// atravessa a Server Action, pra popular `fieldErrors` em vez de só um
// banner genérico de "Falha ao salvar".
describe("resolveActionFieldErrors", () => {
    it("extrai os erros de campo de um ApiServerError com details.errors", () => {
        const error = {
            message: "Dados inválidos.",
            data: {
                details: {
                    errors: [
                        { field: "document", message: "Documento inválido para o tipo selecionado." },
                        { field: "email", message: "E-mail inválido." },
                    ],
                },
            },
        };

        expect(resolveActionFieldErrors(error)).toEqual({
            document: "Documento inválido para o tipo selecionado.",
            email: "E-mail inválido.",
        });
    });

    it("devolve undefined quando o erro não tem essa forma", () => {
        expect(resolveActionFieldErrors(new Error("falha de rede"))).toBeUndefined();
        expect(resolveActionFieldErrors({ data: { message: "Bad Request" } })).toBeUndefined();
        expect(resolveActionFieldErrors(null)).toBeUndefined();
    });

    it("ignora entradas de details.errors sem field/message válidos", () => {
        const error = {
            data: { details: { errors: [{ field: "x" }, { message: "sem campo" }, "string solta"] } },
        };

        expect(resolveActionFieldErrors(error)).toBeUndefined();
    });
});
