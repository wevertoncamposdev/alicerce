# ADR 0004 — Layout da Detail Page (header, seções, relações em card, leitura × edição)

- Status: aceito
- Data: 2026-10-17
- Escopo: `frontend/src/core/components/DetailView/**`, `frontend/src/core/registry/types.ts`,
  `frontend/src/core/screens/DetailViewScreen.tsx`

## Contexto

O `DetailLayout<T>` da v1 só oferece os slots `main/side/bottom/relations`. O motor (`DetailView.tsx`)
renderiza `main` numa coluna flexível e `side` num `aside` de 360px. Com o Feedback (2 campos)
isso gera área vazia, e não há lugar para header com identidade do registro, ação primária,
abas, seções agrupadas nem contadores de relação.

Além disso, a tela de detalhe é sempre um formulário com autosave (`FormView mode="edit"`),
então campos de texto longo aparecem como textarea mesmo quando o usuário só quer ler.

A referência visual desejada está em `docs/ui/reference/detail-layout.png`, e o contrato em `docs/ui/detail-page.md`.

## Decisão

1. Estender `DetailLayout<T>` de forma **aditiva** com `header`, `sections` e `tabs` opcionais;
   `RelationTabConfig` ganha `icon` e `count` opcionais; `main` passa a opcional.
2. O motor renderiza: Header card → seções em grid de colunas declaradas → Relation card.
   Módulos sem `sections` continuam no caminho antigo (`main`), sem alteração.
3. Detalhe abre em **modo leitura**. O botão "Editar" (com permissão de update) liga o
   `FormView mode="edit"` existente nas seções `editable`. Estado em `?mode=edit`.
   O mecanismo de autosave não muda.
4. Metadados continuam exclusivamente no drawer direito (`MetaDataSidebar`).

## Consequências

- `users`, `roles`, `permissions` e `tenants` seguem funcionando; migração deles é opcional e posterior.
- O "mecanismo único" do AGENTS.md §1 passa a ser:
  `TypeView → DetailView (leitura; edição com autosave + RelationShell + MetaData)`.
  O AGENTS.md é atualizado no mesmo PR.
- `side` fica deprecated quando `sections` está presente.
- Nenhuma primitiva shadcn nova; nenhuma dependência nova.
