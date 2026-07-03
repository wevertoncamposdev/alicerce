---
name: architecture-aware-development
description: Use quando o desenvolvedor solicitar implementação, planejamento, refatoração, correção de bugs, revisão de arquitetura ou qualquer atividade relacionada ao desenvolvimento de software. Esta skill garante que todas as respostas considerem primeiro os documentos agent/knowledge/architecture.md e agent/knowledge/plan-development.md antes de propor qualquer solução.
---

# Skill: Desenvolvimento Guiado pela Arquitetura

Esta skill garante que qualquer atividade de desenvolvimento seja orientada pelos padrões arquiteturais, convenções e processo de desenvolvimento definidos para o projeto.

Seu principal objetivo é evitar que decisões sejam tomadas apenas com base em conhecimento geral, mantendo consistência com a arquitetura existente.

---

# Quando usar

Utilize esta skill sempre que o desenvolvedor solicitar:

- implementar uma feature;
- planejar uma feature;
- corrigir bugs;
- realizar refatorações;
- revisar código;
- criar novos módulos;
- alterar arquitetura;
- sugerir melhorias;
- escrever testes;
- definir estrutura de pastas;
- criar APIs;
- desenvolver componentes;
- tomar decisões técnicas.

Na prática, qualquer tarefa relacionada ao projeto deve passar primeiro por esta skill.

---

# Princípio Fundamental

## Nunca responda apenas com conhecimento geral.

Antes de qualquer recomendação, implementação ou planejamento, considere obrigatoriamente os documentos:

```
agent/knowledge/architecture.md
```

e

```
agent/knowledge/plan-development.md
```

Esses documentos representam a fonte da verdade do projeto.

Sempre priorize as decisões descritas neles, mesmo quando existirem outras abordagens tecnicamente válidas.

---

# Ordem obrigatória de análise

Sempre siga esta sequência.

## 1. Compreenda a solicitação

Primeiro descubra exatamente o que o desenvolvedor deseja.

Identifique:

- objetivo;
- escopo;
- impacto esperado;
- partes do sistema envolvidas.

Se houver ambiguidades, faça perguntas antes de continuar.

Nunca assuma requisitos.

---

## 2. Consulte a arquitetura

Considere todas as definições presentes em

```
agent/knowledge/architecture.md
```

Especialmente:

- organização do projeto;
- responsabilidades das camadas;
- padrões arquiteturais;
- convenções;
- comunicação entre módulos;
- separação de responsabilidades;
- fluxo de dados;
- injeção de dependências;
- gerenciamento de estado;
- autenticação;
- autorização;
- tratamento de erros;
- observabilidade;
- nomenclatura;
- qualquer outra decisão arquitetural registrada.

Se existir conflito entre uma boa prática genérica e a arquitetura do projeto, siga a arquitetura.

---

## 3. Consulte o plano de desenvolvimento

Considere todas as definições presentes em

```
agent/knowledge/plan-development.md
```

Principalmente:

- ordem correta de implementação;
- prioridades;
- dependências;
- fases do desenvolvimento;
- critérios de conclusão;
- incrementos planejados;
- MVP;
- roadmap.

Nunca proponha implementar algo fora da sequência prevista sem explicar o motivo.

---

## 4. Valide a consistência

Antes de sugerir qualquer solução, confirme mentalmente que ela:

- respeita a arquitetura;
- respeita o plano de desenvolvimento;
- mantém consistência com o restante do sistema;
- evita duplicação;
- evita acoplamento desnecessário;
- mantém baixo impacto em outras partes do projeto.

---

## 5. Desenvolva a solução

Somente após concluir as etapas anteriores:

- escreva código;
- proponha alterações;
- faça refatorações;
- sugira melhorias;
- explique conceitos;
- revise implementações.

Sempre contextualize a resposta dentro da arquitetura existente.

---

# Durante implementações

Ao implementar código, procure manter:

- alta coesão;
- baixo acoplamento;
- separação clara de responsabilidades;
- reutilização;
- legibilidade;
- simplicidade;
- escalabilidade.

Evite soluções rápidas que contrariem o padrão do projeto.

---

# Durante planejamentos

Ao criar planos de implementação:

- respeite as dependências descritas em
  `plan-development.md`;
- não antecipe etapas futuras;
- divida tarefas em pequenas entregas;
- priorize valor entregue ao usuário;
- considere riscos técnicos;
- proponha checkpoints.

---

# Durante revisões de código

Avalie sempre se o código:

- segue a arquitetura;
- segue as convenções;
- respeita responsabilidades;
- reduz complexidade;
- facilita manutenção;
- mantém consistência com o restante do projeto.

As sugestões devem priorizar alinhamento com o projeto, e não apenas boas práticas genéricas.

---

# Em caso de conflito

Se houver conflito entre:

- documentação;
- arquitetura;
- plano de desenvolvimento;
- solicitação do desenvolvedor;

explique claramente:

- qual conflito foi identificado;
- quais impactos ele gera;
- qual alternativa é mais consistente com o projeto.

Nunca ignore o conflito.

---

# Não faça

Nunca:

- ignore `architecture.md`;
- ignore `plan-development.md`;
- proponha uma arquitetura diferente sem justificativa;
- misture padrões arquiteturais incompatíveis;
- reorganize pastas apenas por preferência pessoal;
- sugira bibliotecas sem necessidade;
- implemente funcionalidades fora da ordem planejada sem explicar os impactos.

---

# Formato das respostas

Sempre que possível, organize a resposta na seguinte estrutura:

## Contexto

Resumo da solicitação.

## Alinhamento com a arquitetura

Como a solução respeita `architecture.md`.

## Alinhamento com o plano

Como a solução respeita `plan-development.md`.

## Solução proposta

Descrição da implementação, alteração ou planejamento.

## Observações

Riscos, impactos, dependências e possíveis próximos passos.

---

# Lembre-se

A arquitetura representa as decisões permanentes do projeto.

O plano de desenvolvimento representa a estratégia de evolução do projeto.

Toda resposta deve estar alinhada com ambos antes de considerar qualquer conhecimento geral.