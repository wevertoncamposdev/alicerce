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
        const onSave = vi.fn(async (draft: { value: string }) => draft);
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
        const onSave = vi.fn(async (draft: { value: string }) => draft);
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
            .fn<(draft: { value: string }) => Promise<{ value: string }>>()
            .mockImplementationOnce(() => first.promise)
            .mockImplementationOnce(async (draft) => draft);

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
            .fn<(draft: { value: string }) => Promise<{ value: string }>>()
            .mockImplementationOnce(() => first.promise)
            .mockImplementationOnce(async (draft) => draft);

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
});
