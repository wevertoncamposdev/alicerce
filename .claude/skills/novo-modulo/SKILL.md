---
name: novo-modulo
description: Criar um módulo de domínio novo no Alicerce usando o gerador. Use quando pedirem um módulo, entidade ou CRUD novo.
---

1. Confirme comigo o nome (singular, kebab-case) e a lista de campos.
2. Garanta o Postgres de dev rodando (`docker compose up -d`) e rode
   `npm run new:module <nome>` na raiz.
3. Edite só o necessário: model Prisma gerado, campos do formulário,
   colunas da lista e permissões especiais (ex.: `<nome>.manage`).
4. Relação filha (comentários, itens etc.): siga o padrão de
   `FeedbackComment` no módulo `feedback`.
5. Se o módulo precisar de algo que o core não oferece: PARE, explique o que
   falta e proponha um ADR. Não altere o core sem minha aprovação.
6. Testes: service spec + e2e de isolamento entre dois tenants.
7. Rode o checkpoint, faça o commit `feat(<nome>): ...` e atualize o `PLAN.md`.