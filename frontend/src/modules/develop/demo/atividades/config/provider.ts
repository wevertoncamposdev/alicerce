// modules/develop/demo/atividades/config/provider.ts
import { createJsonDataHandlers } from "@core/data-provider/json";
import { ATIVIDADES } from "@modules/develop/demo/_shared/seed-data";
import type { Atividade } from "../types/types";

const handlers = createJsonDataHandlers<Atividade>(ATIVIDADES);

export const searchAtividades = handlers.search;
export const readAtividade = handlers.read;
export const createAtividade = handlers.create!;
export const updateAtividade = handlers.update!;
export const deleteAtividade = handlers.delete!;
