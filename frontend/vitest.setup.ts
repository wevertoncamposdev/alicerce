import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// `test.globals` fica desligado (imports explícitos de `vitest` em cada teste),
// então o auto-cleanup do Testing Library — que depende de um `afterEach` global
// — não dispara por conta própria. Registrar aqui manualmente.
afterEach(() => {
  cleanup();
});
