import { describe, expect, it } from "vitest";
import { validateFormPayload } from "./form-validation";
import type { FormFieldConfig } from "./types";

type Entity = { email: string; age: string; bio: string; active: string };

const fields: FormFieldConfig<Entity>[] = [
    { name: "email", label: "E-mail", type: "email", required: true },
    { name: "age", label: "Idade", type: "number", required: false },
    { name: "bio", label: "Bio", type: "textarea", required: false },
    { name: "active", label: "Ativo", type: "switch" },
];

describe("validateFormPayload", () => {
    it("aceita um payload válido com todos os campos preenchidos", () => {
        const result = validateFormPayload(fields, {
            email: "a@example.com",
            age: "30",
            bio: "texto qualquer",
            active: "true",
        });

        expect(result.ok).toBe(true);
    });

    it("aceita campos opcionais vazios", () => {
        const result = validateFormPayload(fields, {
            email: "a@example.com",
            age: "",
            bio: "",
            active: "",
        });

        expect(result.ok).toBe(true);
    });

    it("rejeita e-mail obrigatório vazio com mensagem no campo certo", () => {
        const result = validateFormPayload(fields, {
            email: "",
            age: "",
            bio: "",
            active: "",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.fieldErrors.email).toMatch(/obrigatório/);
        }
    });

    it("rejeita e-mail com formato inválido", () => {
        const result = validateFormPayload(fields, {
            email: "nao-e-email",
            age: "",
            bio: "",
            active: "",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.fieldErrors.email).toMatch(/inválido/);
        }
    });

    it("rejeita número não numérico sem afetar os demais campos", () => {
        const result = validateFormPayload(fields, {
            email: "a@example.com",
            age: "abc",
            bio: "",
            active: "",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.fieldErrors.age).toMatch(/número/);
            expect(result.fieldErrors.email).toBeUndefined();
        }
    });
});
