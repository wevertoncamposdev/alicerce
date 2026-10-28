import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAutoSaveController } from "./use-autosave-controller";

// Cobre a reescrita de recursão -> loop em commitDraftAsync (necessária pra
// não quebrar o React Compiler, ver eslint react-hooks/preserve-manual-
// memoization) — o objetivo é provar que o comportamento de antes
// (reprocessar o que foi enfileirado durante um save, mesmo depois de erro)
// continua idêntico. `lastSavedRef` começa igual ao draft inicial, então
// todo teste primeiro muda o draft (rerender) antes do primeiro commit —
// comitar o mesmo valor do mount é um no-op por design (nada mudou).

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe("useAutoSaveController", () => {
    it("saves the draft and reports saving=false when done", async () => {
        const onSave = vi.fn(async (patch: Partial<{ value: string }>) => ({ value: "a", ...patch }));
        const { result, rerender } = renderHook(
            ({ draft }) => useAutoSaveController({ draft, onSave }),
            { initialProps: { draft: { value: "a" } } },
        );
        rerender({ draft: { value: "b" } });

        await act(async () => {
            result.current.commitField();
            await Promise.resolve();
        });

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith({ value: "b" });
        expect(result.current.saving).toBe(false);
    });

    it("does not call onSave again for an unchanged draft", async () => {
        const onSave = vi.fn(async (patch: Partial<{ value: string }>) => ({ value: "a", ...patch }));
        const { result, rerender } = renderHook(
            ({ draft }) => useAutoSaveController({ draft, onSave }),
            { initialProps: { draft: { value: "a" } } },
        );
        rerender({ draft: { value: "b" } });

        await act(async () => {
            result.current.commitField();
            await Promise.resolve();
        });
        expect(onSave).toHaveBeenCalledTimes(1);

        await act(async () => {
            result.current.commitField();
            await Promise.resolve();
        });

        expect(onSave).toHaveBeenCalledTimes(1);
    });

    it("drains a draft queued while a save was in flight (via the loop, not recursion)", async () => {
        const first = deferred<{ value: string }>();
        const onSave = vi
            .fn<(patch: Partial<{ value: string }>) => Promise<{ value: string }>>()
            .mockImplementationOnce(() => first.promise)
            .mockImplementationOnce(async (patch) => ({ value: "a", ...patch }));

        const { result, rerender } = renderHook(
            ({ draft }) => useAutoSaveController({ draft, onSave }),
            { initialProps: { draft: { value: "a" } } },
        );

        rerender({ draft: { value: "b" } });
        act(() => {
            result.current.commitField();
        });
        expect(result.current.saving).toBe(true);

        // muda o draft e tenta comitar de novo ENQUANTO o primeiro save
        // ainda está pendente — deve ser enfileirado, não disparar um
        // segundo onSave imediatamente.
        rerender({ draft: { value: "c" } });
        act(() => {
            result.current.commitField();
        });
        expect(onSave).toHaveBeenCalledTimes(1);

        await act(async () => {
            first.resolve({ value: "b" });
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onSave).toHaveBeenCalledTimes(2);
        expect(onSave).toHaveBeenNthCalledWith(2, { value: "c" });
        expect(result.current.saving).toBe(false);
    });

    it("still drains the queue after onSave rejects (error does not stop the loop)", async () => {
        const onError = vi.fn();
        const first = deferred<{ value: string }>();
        const onSave = vi
            .fn<(patch: Partial<{ value: string }>) => Promise<{ value: string }>>()
            .mockImplementationOnce(() => first.promise)
            .mockImplementationOnce(async (patch) => ({ value: "a", ...patch }));

        const { result, rerender } = renderHook(
            ({ draft }) => useAutoSaveController({ draft, onSave, onError }),
            { initialProps: { draft: { value: "a" } } },
        );

        rerender({ draft: { value: "b" } });
        act(() => {
            result.current.commitField();
        });

        rerender({ draft: { value: "c" } });
        act(() => {
            result.current.commitField();
        });

        await act(async () => {
            first.reject(new Error("save failed"));
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledTimes(2);
        expect(onSave).toHaveBeenNthCalledWith(2, { value: "c" });
        expect(result.current.saving).toBe(false);
    });

    // D2 (docs/PLAN-fundacao-ux.md): o motor mandava a seção inteira a cada
    // commit, inclusive campos que o usuário nunca tocou — com `""` nos
    // vazios, qualquer campo opcional estrito (enum/e-mail/UUID) do backend
    // reprovava o lote todo. A partir daqui o controller manda só as chaves
    // que mudaram desde o último save.
    it("sends only the changed keys, not the whole draft (D2)", async () => {
        const onSave = vi.fn(async (patch: Partial<{ a: string; b: string }>) => ({
            a: "a1",
            b: "b1",
            ...patch,
        }));
        const { result, rerender } = renderHook(
            ({ draft }) => useAutoSaveController({ draft, onSave }),
            { initialProps: { draft: { a: "a1", b: "b1" } } },
        );

        // só `a` muda; `b` permanece igual ao último save.
        rerender({ draft: { a: "a2", b: "b1" } });

        await act(async () => {
            result.current.commitField();
            await Promise.resolve();
        });

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith({ a: "a2" });
    });

    it("sends an emptied field as null, never as an empty string (D2)", async () => {
        const onSave = vi.fn(async (patch: Partial<{ email: string | null }>) => ({
            email: patch.email ?? null,
        }));
        const { result, rerender } = renderHook(
            ({ draft }) => useAutoSaveController({ draft, onSave }),
            { initialProps: { draft: { email: "old@example.com" } } },
        );

        rerender({ draft: { email: "" } });

        await act(async () => {
            result.current.commitField();
            await Promise.resolve();
        });

        expect(onSave).toHaveBeenCalledWith({ email: null });
    });

    it("does not resend an already-cleared field just because the input still shows an empty string", async () => {
        const onSave = vi.fn(async (patch: Partial<{ email: string | null }>) => ({
            email: patch.email ?? null,
        }));
        const { result, rerender } = renderHook(
            ({ draft }) => useAutoSaveController({ draft, onSave }),
            { initialProps: { draft: { email: "old@example.com" } } },
        );

        rerender({ draft: { email: "" } });
        await act(async () => {
            result.current.commitField();
            await Promise.resolve();
        });
        expect(onSave).toHaveBeenCalledTimes(1);

        // nada mudou de verdade (null vs "" é a mesma coisa pro motor) — um
        // segundo blur no mesmo campo não deve reenviar nada.
        rerender({ draft: { email: "" } });
        await act(async () => {
            result.current.commitField();
            await Promise.resolve();
        });

        expect(onSave).toHaveBeenCalledTimes(1);
    });
});
