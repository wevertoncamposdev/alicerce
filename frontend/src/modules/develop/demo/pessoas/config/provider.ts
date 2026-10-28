// modules/develop/demo/pessoas/config/provider.ts
import { createJsonDataHandlers } from "@core/data-provider/json";
import { PESSOAS } from "@modules/develop/demo/_shared/seed-data";
import type { Pessoa } from "../types/types";

const handlers = createJsonDataHandlers<Pessoa>(PESSOAS);

export const searchPessoas = handlers.search;
export const readPessoa = handlers.read;
export const createPessoa = handlers.create!;
export const updatePessoa = handlers.update!;
export const deletePessoa = handlers.delete!;
