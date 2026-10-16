# Template de módulo frontend

Esqueleto de pastas pra começar um módulo novo. **O guia completo de como
criar um módulo — passo a passo, com os nomes exatos das funções e o
contrato que o registry espera — vive em `/develop` (rota da aplicação,
código-fonte em `frontend/src/modules/develop/`).** Este README só documenta
a estrutura de pastas; não duplica o tutorial.

Para um exemplo real e comentado de módulo funcionando, com relações N:N
geridas no próprio DetailView, veja `frontend/src/modules/roles/README.md`.

## Estrutura

```bash
_template/
├── config/
│   ├── contract.tsx   # defineRecordModule + registerModule — liga o módulo ao registry
│   └── provider.ts    # dataHandlers (search/read/create/update/delete) via apiServer
├── components/        # Componentes React da feature (list view, abas do DetailView, etc.)
├── types/
│   └── types.ts       # Entity, CreatePayload, UpdatePayload
└── constants/         # Opcional — constantes/valores padrão, só se o módulo precisar
```

Um `actions/` com Server Actions (ex. attach/detach de relação N:N) entra só
se o módulo precisar — ver `modules/roles/actions/roleService.ts` como
exemplo real. Não existe `hooks/`/`services/` na convenção atual: busca de
dado é sempre via `config/provider.ts` + `apiServer`, nunca um client
`fetch` direto nem um hook customizado por módulo.

## Como usar

1. Copie esta pasta para `src/modules/<nome-do-modulo>/`.
2. Siga o tutorial em `/develop` pra preencher `config/contract.tsx` e
   `config/provider.ts` — eles seguem um contrato fixo
   (`RecordModuleDefinition`), não é código livre.
3. Registre o módulo em `src/bootstrap.ts` (import de efeito colateral do
   `config/contract.tsx`).
4. Adicione a permissão correspondente no catálogo do backend
   (`backend/src/core/authorization/permission-catalog.ts`) — toda ação do
   módulo precisa de uma permissão real do backend, nunca uma checagem só
   no frontend.

## Fica pra quando o gerador existir (Fase 4 do `AGENTS.md`)

Hoje este processo é manual. `npm run new:module <nome>` (ainda não existe)
vai gerar esta estrutura, registrar no `bootstrap.ts` e no catálogo de
permissões automaticamente — quando isso acontecer, este README é
atualizado para refletir o fluxo novo.
