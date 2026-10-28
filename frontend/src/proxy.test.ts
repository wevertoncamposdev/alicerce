import { describe, expect, it } from "vitest";
import { config } from "./proxy";

// D9 (docs/PLAN-fundacao-ux.md): o matcher só excluía `favicon.ico` da
// verificação de sessão — qualquer outro arquivo estático (ícones,
// manifest) continuava sendo redirecionado pro login quando deslogado.
function middlewareRunsFor(pathname: string): boolean {
    const [rule] = config.matcher;
    const source = typeof rule === "string" ? rule : rule.source;
    return new RegExp(source).test(pathname);
}

describe("proxy matcher", () => {
    it.each([
        "/icon.png",
        "/site.webmanifest",
        "/favicon-16x16.png",
        "/favicon-32x32.png",
        "/favicon.ico",
    ])("libera %s sem sessão (arquivo com extensão)", (pathname) => {
        expect(middlewareRunsFor(pathname)).toBe(false);
    });

    it.each(["/dashboard", "/users/123", "/auth/login"])(
        "continua exigindo sessão em %s",
        (pathname) => {
            expect(middlewareRunsFor(pathname)).toBe(true);
        },
    );
});
