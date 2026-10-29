import { describe, it, expect } from "vitest";
import { defineEnum } from "@core/registry/enum";

describe("defineEnum", () => {
    const StatusEnum = defineEnum("Status", {
        ACTIVE: { label: "Ativo", tone: "success" },
        INACTIVE: { label: "Inativo", tone: "neutral" },
    });

    it("devolve o label configurado", () => {
        expect(StatusEnum.label("ACTIVE")).toBe("Ativo");
        expect(StatusEnum.label("INACTIVE")).toBe("Inativo");
    });

    it("devolve o tone configurado", () => {
        expect(StatusEnum.tone("ACTIVE")).toBe("success");
        expect(StatusEnum.tone("INACTIVE")).toBe("neutral");
    });

    it("valor desconhecido: label cru, tone neutral — nunca quebra", () => {
        expect(StatusEnum.label("ARCHIVED")).toBe("ARCHIVED");
        expect(StatusEnum.tone("ARCHIVED")).toBe("neutral");
    });

    it("options() lista todos os valores na ordem declarada", () => {
        expect(StatusEnum.options()).toEqual([
            { value: "ACTIVE", label: "Ativo" },
            { value: "INACTIVE", label: "Inativo" },
        ]);
    });
});
