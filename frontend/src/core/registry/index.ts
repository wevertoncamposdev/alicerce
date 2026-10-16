import "server-only";
import type { RecordModuleDefinition } from "@lib/registry/types";

const modules = new Map<string, RecordModuleDefinition>();

export function defineRecordModule<T>(definition: RecordModuleDefinition<T>): RecordModuleDefinition<T> {
    return definition;
}

export function registerModule<T>(definition: RecordModuleDefinition<T>): void {
    if (modules.has(definition.model)) {
        throw new Error(`Módulo "${definition.model}" já registrado — nome duplicado?`);
    }
    modules.set(definition.model, definition as RecordModuleDefinition);
}

export function getModule<T = unknown>(model: string): RecordModuleDefinition<T> {
    const found = modules.get(model);
    if (!found) {
        throw new Error(`Módulo não registrado: "${model}". Confira se ele está importado em registry/bootstrap.ts`);
    }
    return found as RecordModuleDefinition<T>;
}