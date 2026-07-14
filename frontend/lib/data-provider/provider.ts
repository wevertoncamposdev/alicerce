import type { DataProvider, SearchArgs, SearchResult } from "@/lib/data-provider/types";
import {
  searchFavorites,
  readFavorite,
  createFavorite,
  updateFavorite,
  deleteFavorite,
} from "@/lib/data-provider/rest/favorites";

const inflightSearchRequests = new Map<string, Promise<unknown>>();
const inflightReadRequests = new Map<string, Promise<unknown>>();

function withInFlightRequest<T>(
  store: Map<string, Promise<unknown>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const existing = store.get(key);
  if (existing) return existing as Promise<T>;

  const request = load().finally(() => store.delete(key));
  store.set(key, request as Promise<unknown>);
  return request;
}

export function createDataProvider(): DataProvider {
  return {
    async search<T>(model: string, args: SearchArgs) {
      const key = JSON.stringify(["search", model, args]);
      return withInFlightRequest(inflightSearchRequests, key, async () => {
        switch (model) {
          case "favorites.list":
            return (await searchFavorites(args)) as unknown as SearchResult<T>;
          default:
            throw new Error(`Model não suportado: ${model}`);
        }
      });
    },

    async read<T>(model: string, id: string) {
      const key = JSON.stringify(["read", model, id]);
      return withInFlightRequest(inflightReadRequests, key, async () => {
        switch (model) {
          case "favorites.detail":
            return (await readFavorite(id)) as unknown as T;
          default:
            throw new Error(`read() não implementado para ${model}`);
        }
      });
    },

    async create<T>(model: string, payload: unknown) {
      switch (model) {
        case "favorites.detail":
          return (await createFavorite(payload)) as unknown as T;
        default:
          throw new Error(`create() não implementado para ${model}`);
      }
    },

    async update<T>(model: string, id: string, payload: unknown) {
      switch (model) {
        case "favorites.detail":
          return (await updateFavorite(id, payload)) as unknown as T;
        default:
          throw new Error(`update() não implementado para ${model}`);
      }
    },

    async delete(model: string, id: string) {
      switch (model) {
        case "favorites.detail":
          await deleteFavorite(id);
          return;
        default:
          throw new Error(`delete() não implementado para ${model}`);
      }
    },
  };
}