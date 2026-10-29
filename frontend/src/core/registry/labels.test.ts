import { describe, it, expect, vi } from "vitest";
import { entityLabel, fieldLabel, actionLabel } from "@core/registry/labels";

vi.mock("@core/registry", () => ({
    getModule: vi.fn((model: string) => {
        if (model === "feedbacks") {
            return {
                formFields: [{ name: "title", label: "Título" }, { name: "description", label: "Descrição" }],
            };
        }
        throw new Error(`Módulo não registrado: "${model}"`);
    }),
}));

describe("entityLabel", () => {
    it("resolve entidade singular minúscula (forma da auditoria) via módulo registrado", () => {
        expect(entityLabel("user")).toBe("Usuários");
        expect(entityLabel("feedback")).toBe("Feedbacks");
    });

    it("resolve recurso já no plural (forma do catálogo de permissões)", () => {
        expect(entityLabel("users")).toBe("Usuários");
    });

    it("cai no mapa estático pra entidade sem módulo", () => {
        expect(entityLabel("tenant")).toBe("Instituição");
        expect(entityLabel("auth")).toBe("Autenticação");
        expect(entityLabel("file")).toBe("Arquivo");
        expect(entityLabel("me")).toBe("Perfil");
    });

    it("entidade totalmente desconhecida: capitaliza como último recurso, nunca quebra", () => {
        expect(entityLabel("example")).toBe("Example");
    });
});

describe("fieldLabel", () => {
    it("resolve o label declarado em formFields do módulo", () => {
        expect(fieldLabel("feedbacks", "title")).toBe("Título");
        expect(fieldLabel("feedbacks", "description")).toBe("Descrição");
    });

    it("módulo não registrado: humaniza a chave em vez de quebrar", () => {
        expect(fieldLabel("inexistente", "createdAt")).toBe("Created At");
    });

    it("campo fora de formFields: humaniza a chave", () => {
        expect(fieldLabel("feedbacks", "tenantId")).toBe("Tenant Id");
    });
});

describe("actionLabel", () => {
    it("traduz os verbos HTTP conhecidos", () => {
        expect(actionLabel("POST")).toBe("Criou");
        expect(actionLabel("PATCH")).toBe("Alterou");
        expect(actionLabel("PUT")).toBe("Alterou");
        expect(actionLabel("DELETE")).toBe("Removeu");
    });

    it("aceita minúsculo (normaliza antes de buscar)", () => {
        expect(actionLabel("post")).toBe("Criou");
    });

    it("verbo desconhecido: devolve como veio, nunca quebra", () => {
        expect(actionLabel("GET")).toBe("GET");
    });
});
