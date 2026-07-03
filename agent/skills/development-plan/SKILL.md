---
name: development-plan
description: Use quando for necessário planejar uma implementação, refatoração, correção de bugs ou evolução da arquitetura. Também utilize quando o desenvolvedor pedir a próxima etapa do projeto, estiver perdido ou antes de iniciar uma nova feature.
---

# Skill: Development Plan

Esta skill tem como objetivo criar um plano de implementação consistente com a arquitetura e o roadmap do projeto.

Ela deve ser utilizada antes de qualquer implementação relevante.

## Fonte de verdade

Sempre utilize como referência:

- agent/knowledge/architecture.md
- agent/knowledge/plan-development.md

Esses documentos têm prioridade sobre qualquer conhecimento geral.

---

# Quando utilizar

Utilize esta skill quando:

- uma nova feature será desenvolvida;
- uma funcionalidade precisa ser refatorada;
- um bug exige alterações estruturais;
- houver dúvidas sobre a ordem correta de implementação;
- o desenvolvedor perguntar "qual o próximo passo?";
- for necessário organizar tarefas antes de começar a programar.

---

# Objetivo

Antes de escrever código, entender:

- o estado atual do projeto;
- a milestone atual;
- as dependências;
- o impacto da alteração;
- a melhor sequência de implementação.

O resultado deve ser um plano pequeno, claro e executável.

---

# Processo

## 1. Entenda a solicitação

Identifique:

- objetivo;
- módulo;
- feature;
- problema a resolver.

Caso necessário, faça perguntas antes de continuar.

---

## 2. Consulte a arquitetura

Utilize:

agent/knowledge/architecture.md

Identifique:

- módulo responsável;
- camada correta;
- componentes reutilizáveis;
- padrões arquiteturais envolvidos.

---

## 3. Consulte o roadmap

Utilize:

agent/knowledge/plan-development.md

Determine:

- milestone atual;
- dependências;
- prioridade;
- tarefas relacionadas.

Nunca planeje atividades fora da ordem definida sem justificar.

---

## 4. Analise o projeto

Antes de criar o plano, descubra:

- o que já existe;
- o que está incompleto;
- o que precisa ser implementado;
- o que pode ser reutilizado;
- o que merece refatoração.

Evite criar tarefas duplicadas.

---

## 5. Monte o plano

Divida a implementação em pequenas etapas.

Cada etapa deve:

- possuir um objetivo claro;
- ser independente sempre que possível;
- gerar uma entrega verificável;
- respeitar as dependências.

Caso a alteração seja grande, divida em múltiplas tarefas.

---

## 6. Validar o plano

Confirme que:

- respeita a arquitetura;
- respeita o roadmap;
- reduz riscos;
- minimiza retrabalho;
- mantém compatibilidade com o restante do sistema.

---

# Formato da resposta

## Contexto

Resumo da solicitação.

## Situação atual

O que já existe no projeto.

## Análise

- arquitetura afetada;
- milestone;
- dependências;
- riscos.

## Plano

Liste as etapas numeradas.

Para cada etapa informe:

- objetivo;
- arquivos ou módulos envolvidos;
- dependências;
- resultado esperado.

## Observações

Inclua riscos, melhorias futuras e possíveis refatorações identificadas.

---

# Regras

Nunca implemente código.

Nunca pule diretamente para uma solução.

Sempre planeje primeiro.

Se identificar que a solicitação está fora da milestone atual, explique o motivo antes de montar o plano.

Sempre priorize evolução incremental, reutilização de código e aderência à arquitetura.