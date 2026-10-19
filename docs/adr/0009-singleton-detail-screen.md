# ADR 0009 — `SingletonDetailScreen` sem registry novo

- Status: aceito
- Data: 2026-10-19
- Escopo: autorizado pelo ADR 0006 (Fase 4 do `Plano Base.md`, etapa 4.4).
  - Em `core/`: `frontend/src/core/screens/DetailViewScreen.tsx` (exporta
    `resolveContextItems`/`resolveAuditItems`/`normalizeAuditEntityName`,
    hoje privadas do arquivo), `frontend/src/core/screens/
    SingletonDetailScreen.tsx` (novo).
  - Nada além dessa lista em `core/` sem perguntar.

## Contexto

O Plano Base (Fase 4, etapa 4.4; reusado na Fase 5 pela página da
instituição) pede uma tela de "um registro só, sem lista": `/perfil` não
tem `:id` na URL, não tem breadcrumb de lista para voltar e nunca terá uma
tabela — é sempre o mesmo registro (o usuário autenticado, ou a instituição
do tenant). O ADR 0006 já apontou essa etapa como pendente de decisão
própria: criar um mecanismo novo no motor de UI, ou reaproveitar o que já
existe (`RecordModuleDefinition`, `DetailView`, `DataProvider`, registry)?

## Decisão

Não existe um registry/tipo paralelo para módulo "singleton". Um módulo
desse tipo continua um `RecordModuleDefinition` normal, registrado do
mesmo jeito (`defineRecordModule`/`registerModule`/`getModule`):

1. `dataHandlers.read`/`update` ignoram o `id` recebido e sempre resolvem
   para o registro do contexto atual (ex.: `perfil` chama sempre
   `apiServer.get('me')`/`apiServer.patch('me', patch)`, nunca
   `GET /perfil/:id`).
2. `search`, `views`, `defaultView`, `listLayout`, `parseListState`,
   `serializeListState` — campos obrigatórios da interface
   `RecordModuleDefinition` — viram stubs nunca exercitados: não existe
   rota de lista para esses módulos, então esse código nunca roda.
3. `SingletonDetailScreen` é uma variante enxuta de `DetailViewScreen`:
   mesmo `getModule(moduleName)` + `dataProvider.read(moduleName,
   recordId)`, mesmas `resolveContextItems`/`resolveAuditItems` (agora
   exportadas de `DetailViewScreen.tsx` em vez de privadas), mas recebe um
   `recordId` fixo passado pela página (não um `id` de URL) e monta um
   breadcrumb de 1 item, sem `href` — `Breadcrumbs.tsx` já renderiza o
   último item do array sempre como texto puro, nunca como link,
   independente de `href` estar setado, então nenhuma mudança é necessária
   nesse componente.
4. Escopo mínimo: sem `MetaDataSidebar` nem ações extra na topbar — a tela
   renderiza header, seções e autosave (via `DetailView` reaproveitado tal
   qual), nada além disso. Pode crescer depois se um módulo singleton
   precisar.

Isso mantém `DetailView`, `EditableSection`, `FormView`, autosave,
`DataProvider` e o registry **100% intocados** — "um mecanismo para tudo"
(AGENTS §1), zero abstração nova no motor.

Alternativa rejeitada: um tipo `SingletonModuleDefinition` paralelo a
`RecordModuleDefinition`, com sua própria função de registro. Resolveria a
mesma coisa com duas interfaces fazendo o mesmo papel — o resto do motor
(`DetailView`, autosave, `DataProvider`) teria que saber lidar com as duas,
ou duplicar código para cada uma.

## Consequências

- Todo módulo "singleton" paga um pequeno custo de ergonomia: precisa
  declarar 5 campos de lista que nunca usa (`search`, `views`,
  `defaultView`, `listLayout`, `parseListState`/`serializeListState`) só
  para satisfazer o contrato de `RecordModuleDefinition`. Aceitável — é
  menos custo do que manter dois contratos de módulo no motor.
- `resolveContextItems`/`resolveAuditItems`/`normalizeAuditEntityName`
  passam a ser API pública de `DetailViewScreen.tsx` dentro de `core/` —
  qualquer novo screen de detalhe (não só `SingletonDetailScreen`) pode
  reaproveitá-las no futuro.
- `SingletonDetailScreen` não tem breadcrumb de lista para voltar — correto
  para o caso de uso (perfil e instituição não têm "lista" para onde
  voltar); um módulo singleton que algum dia precisar disso teria que
  pedir a mudança separadamente.
