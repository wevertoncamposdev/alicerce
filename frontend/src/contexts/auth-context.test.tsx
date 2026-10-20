import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth-context";
import type { AuthUserProfile } from "@lib/auth-types";

function buildUser(overrides: Partial<AuthUserProfile> = {}): AuthUserProfile {
  return {
    id: "user-1",
    email: "user@example.com",
    tenantId: "tenant-1",
    permissions: ["user.read", "user.update"],
    emailVerified: true,
    ...overrides,
  };
}

describe("AuthProvider / useAuth: estado de autenticação e permissões", () => {
  it("expõe hasPermission a partir do usuário inicial", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider initialUser={buildUser()} initialTenantId="tenant-1">
          {children}
        </AuthProvider>
      ),
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasPermission("user.update")).toBe(true);
    expect(result.current.hasPermission("user.delete")).toBe(false);
  });

  it("sem usuário logado, nenhuma role/permissão é concedida", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.hasPermission("user.read")).toBe(false);
  });
});

describe("AuthProvider: isolamento de tenant (currentTenantId + cookie)", () => {
  beforeEach(() => {
    document.cookie = "session_tenant=; path=/; max-age=0";
  });

  it("signIn adota o tenant retornado pelo backend, não um valor arbitrário do cliente", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        user: buildUser(),
        tenant: { id: "tenant-from-backend" },
      }),
    } as Response);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await result.current.signIn("user@example.com", "secret");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.current.currentTenantId).toBe("tenant-from-backend");
    expect(document.cookie).toContain("session_tenant=tenant-from-backend");
  });

  it("setCurrentTenantId(null) limpa o estado e o cookie de tenant", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider initialUser={buildUser()} initialTenantId="tenant-1">
          {children}
        </AuthProvider>
      ),
    });

    act(() => {
      result.current.setCurrentTenantId(null);
    });

    expect(result.current.currentTenantId).toBeNull();
    expect(document.cookie).not.toContain("session_tenant=tenant-1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
