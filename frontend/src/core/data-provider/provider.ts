import "server-only";
import { cache } from "react";
import { getModule } from "@core/registry";
import type { SearchArgs } from "@core/data-provider/types";

// lib/data-provider/provider.ts
//
// `cache()` do React dedupe chamadas repetidas com os MESMOS argumentos
// dentro da MESMA renderização (ex.: DetailViewScreen e uma aba de relação
// pedindo o mesmo registro não disparam 2 requests) — mesmo padrão já usado
// em lib/auth-server.ts (getCurrentUser). Só funciona com uma referência de
// função ESTÁVEL a nível de módulo — por isso search/read vivem fora de
// createDataProvider() (que cria um objeto novo a cada chamada) e são só
// reexpostas por ele.
const cachedSearch = cache(async <T>(model: string, args: SearchArgs) => {
  return getModule<T>(model).dataHandlers.search(args);
});

const cachedRead = cache(async <T>(model: string, id: string) => {
  return getModule<T>(model).dataHandlers.read(id);
});

export function createDataProvider() {
  return {
    search<T>(model: string, args: SearchArgs) {
      return cachedSearch<T>(model, args);
    },

    read<T>(model: string, id: string) {
      return cachedRead<T>(model, id);
    },

    async create<T>(model: string, payload: unknown): Promise<T> {
      const { dataHandlers } = getModule<T>(model);
      if (!dataHandlers.create) {
        throw new Error(`O módulo "${model}" é somente leitura — create() não está implementado.`);
      }
      return dataHandlers.create(payload) as Promise<T>;
    },

    async update<T>(model: string, id: string, payload: unknown): Promise<T> {
      const { dataHandlers } = getModule<T>(model);
      if (!dataHandlers.update) {
        throw new Error(`O módulo "${model}" é somente leitura — update() não está implementado.`);
      }
      return dataHandlers.update(id, payload) as Promise<T>;
    },

    async delete(model: string, id: string): Promise<void> {
      const { dataHandlers } = getModule(model);
      if (!dataHandlers.delete) {
        throw new Error(`O módulo "${model}" é somente leitura — delete() não está implementado.`);
      }
      await dataHandlers.delete(id);
    },
  };
}
