
import "server-only";
import { getModule } from "@lib/registry";
import type { DataProvider, SearchArgs, SearchResult } from "@lib/data-provider/types";

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
        const module = getModule(model);
        return module.dataHandlers.search(args) as Promise<SearchResult<T>>;
      });
    },
    async read<T>(model: string, id: string) {
      const key = JSON.stringify(["read", model, id]);
      return withInFlightRequest(inflightReadRequests, key, async () => {
        const module = getModule(model);
        return module.dataHandlers.read(id) as Promise<T>;
      });
    },
    async create<T>(model: string, payload: unknown) {
      return getModule(model).dataHandlers.create(payload) as Promise<T>;
    },
    async update<T>(model: string, id: string, payload: unknown) {
      return getModule(model).dataHandlers.update(id, payload) as Promise<T>;
    },
    async delete(model: string, id: string) {
      await getModule(model).dataHandlers.delete(id);
    },
  };
}