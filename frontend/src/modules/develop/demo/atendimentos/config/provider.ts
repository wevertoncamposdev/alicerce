// modules/develop/demo/atendimentos/config/provider.ts
import { createJsonDataHandlers } from "@core/data-provider/json";
import { ATENDIMENTOS } from "@modules/develop/demo/_shared/seed-data";
import type { Atendimento } from "../types/types";

const handlers = createJsonDataHandlers<Atendimento>(ATENDIMENTOS);

export const searchAtendimentos = handlers.search;
export const readAtendimento = handlers.read;
export const createAtendimento = handlers.create!;
export const updateAtendimento = handlers.update!;
export const deleteAtendimento = handlers.delete!;
