---
name: upgrade-deps
description: Janela mensal de atualização de dependências do Alicerce.
disable-model-invocation: true
---

1. Branch própria: `chore/upgrade-<pacote>-<versão>`, a partir do `develop`.
2. Um upgrade major por branch. Patches e minors podem ir juntos.
3. Rode `npm outdated` e `npm audit` nos dois projetos e me mostre a lista
   antes de alterar qualquer coisa.
4. Siga o checklist de upgrade do `AGENTS.md`.
5. Checkpoint completo + `npm audit` no final.
6. Se um upgrade quebrar algo que exija mudança de código fora de config,
   pare e me reporte em vez de adaptar o código.