import { describe, expect, it } from "vitest";
import { usersModule } from "@modules/users/config/contract";
import { rolesModule } from "@modules/roles/config/contract";
import { permissionsModule } from "@modules/permissions/config/contract";
import { auditModule } from "@modules/audit/config/contract";
import { feedbacksModule } from "@modules/feedbacks/config/contract";
import { perfilModule } from "@modules/perfil/config/contract";
import { instituicaoModule } from "@modules/instituicao/config/contract";
import type { RecordModuleDefinition } from "./types";

// Etapa 12.3 (corrige C2): `formFields` atravessa a fronteira Server→Client
// (contrato é Server, `FormView` é `'use client'`) — qualquer valor função
// aí dentro (ex.: o antigo `previewUrl: (record) => ...`) derruba a página
// em produção, sem avisar em dev nem no build. Mesma lista de módulos de
// `src/bootstrap.ts` (sem importar o próprio `bootstrap.ts` nem
// `core/registry/index.ts`: ambos têm `import "server-only"`, que SEMPRE
// lança ao importar fora do bundler do Next — ver `vitest.server-only-stub.ts`
// pelo alias que neutraliza isso só no Vitest).
const modules: RecordModuleDefinition[] = [
    usersModule,
    rolesModule,
    permissionsModule,
    auditModule,
    feedbacksModule,
    perfilModule,
    instituicaoModule,
] as RecordModuleDefinition[];

describe("contratos de módulo são serializáveis (formFields sem função)", () => {
    for (const mod of modules) {
        it(`${mod.model}: nenhum formFields tem valor função`, () => {
            for (const field of mod.formFields) {
                for (const [key, value] of Object.entries(field)) {
                    expect(
                        typeof value,
                        `${mod.model}.formFields: campo "${field.name}", propriedade "${key}" é uma função — não serializa Server→Client`,
                    ).not.toBe("function");
                }
            }
        });
    }
});
