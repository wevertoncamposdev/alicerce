// Etapa 12.3 — stub só pro Vitest. O pacote `server-only` SEMPRE lança ao
// ser importado (não é uma checagem de `window`/runtime — ver
// node_modules/server-only/index.js); fora do bundler do Next, que o
// reconhece e permite em módulos server-only de verdade, qualquer import
// transitivo dele (ex.: `@lib/api-server`, `core/registry/index.ts`)
// quebraria em teste. `vitest.config.mts` aponta o alias "server-only"
// pra este arquivo (vazio de propósito) só na resolução do Vitest — o
// build real do Next tem sua própria resolução, intocada por isto.
export {};
