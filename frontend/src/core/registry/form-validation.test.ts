import { describe, expect, it } from "vitest";
import { validateFormPayload } from "./form-validation";
import type { FormFieldConfig } from "./types";

type Entity = {
    email: string;
    age: string;
    bio: string;
    active: string;
    birthDate: string;
    scheduledAt: string;
    salary: string;
};

const fields: FormFieldConfig<Entity>[] = [
    { name: "email", label: "E-mail", type: "email", required: true },
    { name: "age", label: "Idade", type: "number", required: false },
    { name: "bio", label: "Bio", type: "textarea", required: false },
    { name: "active", label: "Ativo", type: "switch" },
    { name: "birthDate", label: "Nascimento", type: "date", required: false },
    { name: "scheduledAt", label: "Agendado para", type: "datetime", required: false },
    { name: "salary", label: "Salário", type: "money", required: false },
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

    // D2 (docs/PLAN-fundacao-ux.md): o autosave do edit agora manda só o
    // patch com os campos alterados — uma chave ausente é "não tocado nesta
    // rodada", não mais um bug do chamador.
    it("aceita um patch parcial, sem exigir os campos não tocados", () => {
        const result = validateFormPayload(fields, { bio: "texto novo" });

        expect(result.ok).toBe(true);
    });

    it("trata null igual a vazio (campo opcional limpo pelo autosave)", () => {
        const result = validateFormPayload(fields, { age: null });

        expect(result.ok).toBe(true);
    });

    it("rejeita e-mail obrigatório enviado como null", () => {
        const result = validateFormPayload(fields, { email: null });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.fieldErrors.email).toMatch(/obrigatório/);
        }
    });

    // U4 (docs/PLAN-fundacao-ux.md): date/datetime guardam o valor cru do
    // <input type="date"|"datetime-local">; money guarda centavos como
    // string de inteiro (AGENTS.md §4.2.10 — nunca float).
    it("aceita date/datetime/money válidos", () => {
        const result = validateFormPayload(fields, {
            birthDate: "1990-05-12",
            scheduledAt: "2026-01-02T15:30",
            salary: "123456",
        });

        expect(result.ok).toBe(true);
    });

    it("rejeita date/datetime com formato inválido", () => {
        const result = validateFormPayload(fields, { birthDate: "não é data" });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.fieldErrors.birthDate).toMatch(/data inválida/);
        }
    });

    it("rejeita money que não é inteiro puro (nunca float)", () => {
        const result = validateFormPayload(fields, { salary: "12.50" });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.fieldErrors.salary).toBeDefined();
        }
    });

    it("aceita money ausente/vazio (campo opcional)", () => {
        const result = validateFormPayload(fields, { salary: "" });
        expect(result.ok).toBe(true);
    });
});
