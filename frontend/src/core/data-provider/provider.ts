
import "server-only";
import { getModule } from "@core/registry";
import type { SearchArgs } from "@core/data-provider/types";

// lib/data-provider/provider.ts
export function createDataProvider() {
  return {
    search<T>(model: string, args: SearchArgs) {
      return getModule<T>(model).dataHandlers.search(args);
    },

    read<T>(model: string, id: string) {
      return getModule<T>(model).dataHandlers.read(id);
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