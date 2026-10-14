import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppAccessGuard } from "./AppAccessGuard";
import type { AuthUserProfile } from "@lib/auth-types";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

function buildUser(permissions: string[]): AuthUserProfile {
  return {
    id: "user-1",
    email: "user@example.com",
    tenantId: "tenant-1",
    roles: [],
    permissions,
  };
}

describe("AppAccessGuard", () => {
  it("renderiza o conteúdo protegido quando o usuário tem a permissão da rota", () => {
    usePathnameMock.mockReturnValue("/users");

    render(
      <AppAccessGuard currentUser={buildUser(["user.read"])}>
        <div>Conteúdo da rota</div>
      </AppAccessGuard>,
    );

    expect(screen.getByText("Conteúdo da rota")).toBeInTheDocument();
  });

  it("bloqueia o conteúdo e mostra a permissão exigida quando o usuário não a tem", () => {
    usePathnameMock.mockReturnValue("/users");

    render(
      <AppAccessGuard currentUser={buildUser(["role.read"])}>
        <div>Conteúdo da rota</div>
      </AppAccessGuard>,
    );

    expect(screen.queryByText("Conteúdo da rota")).not.toBeInTheDocument();
    expect(screen.getByText(/Acesso negado/)).toBeInTheDocument();
    expect(screen.getByText(/user\.read/)).toBeInTheDocument();
  });
});
