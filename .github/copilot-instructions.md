# Copilot Instructions (Projeto)

## 1) Objetivo
Você está neste repositório para implementar mudanças **seguras, pequenas e testáveis**.

## 2) Princípios
- Não alterar arquivos fora do escopo solicitado.
- Priorizar legibilidade e manutenção.
- Evitar breaking changes sem sinalizar explicitamente.
- Sempre explicar impacto técnico de forma curta.

## 3) Estrutura e arquitetura (preencher)
- Módulos principais: `<listar>`
- Padrão de camadas: `<controller/service/repository etc.>`
- Ponto de entrada: `<ex: src/main.ts>`
- Pastas críticas: `<listar>`

## 4) Stack e comandos (preencher)
- Linguagem/framework: `<ex: Node.js + TypeScript + Express>`
- Testes: `<ex: Jest>`
- Lint/format: `<ex: ESLint + Prettier>`
- Comandos:
  - Instalar: `<ex: npm ci>`
  - Rodar: `<ex: npm run dev>`
  - Testar: `<ex: npm test>`
  - Lint: `<ex: npm run lint>`
  - Build: `<ex: npm run build>`

## 5) Convenções de código
- Nomeação:
  - variáveis/funções: `<camelCase>`
  - classes/types: `<PascalCase>`
  - arquivos: `<kebab-case|camelCase>`
- Tratar erros com `<ex: classes de erro + status code padronizado>`.
- Validar entrada com `<ex: zod/class-validator>`.
- Não deixar comentários óbvios; comentar apenas decisões não triviais.

## 6) Regras de mudança
- Mudanças devem ser mínimas e focadas.
- Se precisar refatorar além do escopo, justificar antes.
- Preservar contratos públicos (rotas, DTOs, eventos).  
- Em caso de dúvida de regra de negócio, sinalizar incerteza.

## 7) Testes e qualidade
- Sempre que possível, adicionar/ajustar testes do comportamento alterado.
- Não “quebrar” testes existentes.
- Se não houver teste viável, explicar por quê e sugerir teste futuro.

## 8) Segurança
- Nunca expor segredos/tokens.
- Não adicionar logs com dados sensíveis.
- Sanitizar entradas e validar payloads externos.

## 9) Formato da resposta do agente
Ao concluir uma tarefa, responder com:
1. Resumo em 3-5 bullets.
2. Arquivos alterados.
3. Riscos/impactos.
4. Como validar localmente.
5. Próximos passos opcionais.