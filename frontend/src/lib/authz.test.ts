import { describe, expect, it } from "vitest";
import { canAccessAction, canAccessRoute, resolveRoutePermission } from "./authz";

describe("authz: guards RBAC por rota", () => {
  it("libera uma rota sem regra de permissão cadastrada", () => {
    expect(canAccessRoute("/dashboard", [])).toBe(true);
  });

  it("bloqueia uma rota protegida quando o usuário não tem a permissão exigida", () => {
    expect(canAccessRoute("/users", ["role.read"])).toBe(false);
  });

  it("libera uma rota protegida quando o usuário tem a permissão exigida", () => {
    expect(canAccessRoute("/users", ["user.read"])).toBe(true);
  });

  it("resolve a permissão exigida por uma rota protegida", () => {
    expect(resolveRoutePermission("/roles/123")).toBe("role.read");
  });

  it("retorna null para uma rota sem regra cadastrada", () => {
    expect(resolveRoutePermission("/dashboard")).toBeNull();
  });
});

describe("authz: guards RBAC por ação", () => {
  it("bloqueia uma ação quando a permissão associada está ausente", () => {
    expect(canAccessAction("users.delete", ["user.read", "user.update"])).toBe(false);
  });

  it("libera uma ação quando a permissão associada está presente", () => {
    expect(canAccessAction("users.delete", ["user.delete"])).toBe(true);
  });
});
