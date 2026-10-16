# Prompts Ecônomicos

Perfeito — aqui está seu **kit de 12 prompts econômicos** para usar com Claude/ChatGPT no desenvolvimento por fases, com foco em **baixo consumo de tokens**.

---

## 1) Quebrar fase em tarefas pequenas

```text
Estou na fase [NOME_DA_FASE]. 
Quebre em tarefas de execução de no máximo 1 PR por tarefa.

Formato obrigatório:
1) Tarefa
2) Objetivo técnico
3) Arquivos afetados
4) Critério de aceite
5) Risco principal

Responda curto, máximo 12 tarefas, com códigos de exemplo para a escrita manual
```

## 2) Ordem ideal de implementação

```text
Considere estas tarefas: [COLE_LISTA].
Defina a ordem ótima de implementação com justificativa curta.

Formato:
- Ordem (T1 -> T2 -> ...)
- Dependências
- Paralelizável (sim/não)
- Bloqueios

Máximo 250 palavras.
```

## 3) Plano técnico de uma tarefa (sem código)

```text
Explique como implementar a tarefa [NOME].
Contexto: Next.js + NestJS + multitenancy + RBAC + auditoria.

Quero:
1) passo a passo (max 8 passos)
2) decisões técnicas
3) armadilhas comuns
4) validação final

Sem gerar código.
```

## 4) Código mínimo do passo atual

```text
Implemente apenas o PASSO [N] da tarefa [NOME].

Regras:
- gerar somente código essencial
- no máximo 80 linhas
- não reescrever arquivo inteiro
- informar em quais arquivos inserir
- sem explicação longa
```

## 5) Gerar diff ao invés de arquivo completo

```text
Com base no passo [N], gere apenas um diff unificado (patch) dos arquivos:
[ARQUIVO_1], [ARQUIVO_2].

Regras:
- mudanças mínimas
- sem alterar partes não relacionadas
- sem criar arquivos extras
```

## 6) Testes mínimos da tarefa

```text
Para a tarefa [NOME], sugira somente os testes essenciais.

Formato:
- teste
- tipo (unit/integration/e2e)
- cenário
- resultado esperado

Máximo 8 testes, sem código de teste.
```

## 7) Revisão técnica econômica

```text
Revise esta implementação [COLE_CÓDIGO_OU_DIFF].

Retorne apenas:
1) problemas críticos
2) problemas importantes
3) melhorias opcionais

Para cada item: impacto + correção em 1 frase.
Sem reescrever código inteiro.
```

## 8) Debug objetivo de erro

```text
Erro: [COLE_ERRO]
Trecho atual: [COLE_TRECHO]

Quero:
1) causa raiz provável
2) como confirmar (2 checks)
3) correção mínima

Sem refatoração ampla. Máximo 200 palavras.
```

## 9) Segurança da tarefa (check rápido)

```text
Faça checklist de segurança para a tarefa [NOME], contexto multitenant.

Retorne:
- risco
- severidade (alta/média/baixa)
- mitigação objetiva

Foque em: auth, autorização, tenant isolation, logs/auditoria.
Máximo 10 itens.
```

## 10) PR pronto (descrição enxuta)

```text
Gere descrição de PR para a tarefa [NOME].

Formato:
- Contexto
- O que foi feito
- Como testar
- Riscos
- Checklist

Máximo 180 palavras.
```

## 11) Mensagens de commit convencionais

```text
Sugira até 5 commits semânticos (Conventional Commits) para estas mudanças:
[RESUMO_MUDANÇAS]

Formato: tipo(escopo): mensagem
Sem explicações.
```

## 12) Encerramento da fase + preparação da próxima

```text
Concluí a fase [NOME]. 
Gere:
1) checklist de fechamento da fase
2) pendências técnicas
3) débito técnico assumido
4) pré-requisitos da próxima fase

Resposta curta, prática, sem código.
```

---

## Mini “prompt coringa” (ultra econômico)

Use no dia a dia para controlar custo:

```text
Responda de forma objetiva e curta.
Não reescreva arquivos inteiros.
Trabalhe em passos.
Gere apenas o mínimo necessário para o passo atual.
Se possível, use checklist e diff.
```

Se quiser, eu também posso te entregar a **versão desse kit adaptada por momento do fluxo** (início da fase, meio da implementação, pré-PR e pós-merge).
