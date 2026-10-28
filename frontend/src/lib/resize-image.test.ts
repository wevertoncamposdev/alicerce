import { describe, expect, it, vi } from "vitest";
import { resizeImageToWebp } from "./resize-image";

// D7 (docs/PLAN-fundacao-ux.md): o redimensionamento de verdade (canvas,
// createImageBitmap) não é testável em jsdom (sem canvas 2d real) — ver
// plano. Este teste cobre só a garantia de "falha aberta": sem a API do
// browser disponível, o upload não trava, devolve o arquivo original.
describe("resizeImageToWebp", () => {
    it("devolve o arquivo original quando createImageBitmap não está disponível", async () => {
        const original = new File(["conteudo"], "foto.png", { type: "image/png" });

        const result = await resizeImageToWebp(original);

        expect(result).toBe(original);
    });

    it("devolve o arquivo original quando createImageBitmap rejeita (arquivo corrompido)", async () => {
        const original = new File(["lixo"], "foto.png", { type: "image/png" });
        vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("decode falhou")));

        const result = await resizeImageToWebp(original);

        expect(result).toBe(original);
        vi.unstubAllGlobals();
    });

    it("não tenta redimensionar um arquivo que não é imagem", async () => {
        const original = new File(["pdf"], "documento.pdf", { type: "application/pdf" });

        const result = await resizeImageToWebp(original);

        expect(result).toBe(original);
    });
});
