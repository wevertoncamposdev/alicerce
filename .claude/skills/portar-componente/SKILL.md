---
name: portar-componente
description: Portar um componente ou funcionalidade do repositório de referência system_development para o Alicerce. Use quando a tarefa precisar de algo que o Alicerce não tem e que exista na referência.
disable-model-invocation: true
---

O `system_development` (github.com/TerceiroGestor/system_development) é fonte de
ideias e componentes, **nunca de arquitetura**. Ele usa padrões que o Alicerce rejeita.

## Como consultar

```bash
node scripts/reference.mjs          # clona ou atualiza em .reference/system_development
node scripts/reference.mjs --where  # mostra o caminho e o commit atual
```

`.reference/` é somente leitura e está no `.gitignore`: nunca editar, importar ou commitar.

## Mapa de portabilidade

| Necessidade | Onde está na referência | Como trazer |
| --- | --- | --- |
| Campos de formulário (money, cpf, phone, date, date_range, boolean, select/multiselect, tags, file/image, richtext, color) | `frontend/src/web-client/forms/` | Portar tipos e renderers para `frontend/src/core/forms/`; form segue com autosave via Server Action |
| Filtros avançados | `web-client/domain/`, `web-client/filtering/` | Serializar na URL; avaliar **no backend** (traduzir para `where` do Prisma) |
| Views extras (kanban, calendário, timeline, gantt, lista agrupada) | `web-client/views/` | Ilha client recebendo dados já buscados no servidor |
| Paginação, view switcher, filtros, buscas salvas | `web-client/ui/PaginationBar.tsx`, `control-panel/` | Trocar `localStorage` por URL ou preferência salva no backend |
| DetailShell completo (abas, comentários, notas, tags, mídia) | `web-client/detail/` | Manter a composição; trocar fetch client por props do Server Component |
| E-mail com templates | `backend/src/core/email/` | Provider (SMTP/Resend) atrás de interface |
| Upload de arquivos | `backend/src/core/files/` | Storage (local/S3/GCS) atrás de interface |
| Criptografia de PII | `backend/src/core/pii/` | Portar como está, com testes |

## Tradução obrigatória

| Na referência | No Alicerce |
| --- | --- |
| JWT em `localStorage`, `auth-context` client | Cookies httpOnly + sessão resolvida no servidor |
| `useEffect` + fetch no client | Server Component com `apiServer` + props para a ilha client |
| Arquivos de domínio dentro de `web-client/` | Domínio só em `modules/` |
| Estado em `localStorage` | URL ou preferência persistida no backend |
| Tipos Express em middleware | Tipos Fastify |

Nomes equivalentes: TypeView = `views/*View.tsx` + `ViewSwitcher` · DetailShell =
`DetailShellEngine` · MetaDataShell = `StandardDetailMetadataSide` · RelationShell =
`RelationListHost` + `DetailRelationTablePanel` · FormView = `RecordForm`.

## Processo

1. Ler o componente e suas dependências na referência. Listar o que usa de
   domínio, de `localStorage` e de fetch client.
2. Apresentar: o que será mantido, o que será traduzido e o que será descartado.
   Esperar aprovação.
3. Implementar em `core/` sem nenhum nome de domínio.
4. Usar no módulo `feedback` para provar que funciona.
5. Checkpoint e commit.