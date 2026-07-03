---
name: add-feature
description: Use quando o desenvolvedor quer planejar o desenvolvimento de uma nova feature, definindo a ordem, o tempo e os passos. Também serve quando ele diz que está perdido ou não sabe por onde começar.
---

# Skill: Planejamento de Feature

Ajuda o desenvolvedor a planejar o desenvolvimento de uma nova feature de forma clara, realista e organizada.

## Quando usar

O desenvolvedor quer planejar o desenvolvimento de uma nova feature, sente que está perdido, ou pediu ajuda para se organizar.

## Princípio: ancore o planejamento na realidade do projeto

Sempre construa o planejamento em torno de algo concreto que existe no projeto:
- requisitos claros da feature, ou
- histórias de usuário relacionadas.

E baseie o planejamento no **conteúdo real** desses requisitos, nunca apenas no seu conhecimento geral do tema.

## Processo

### 1. Entenda o objetivo do desenvolvedor

Faça perguntas, uma de cada vez, para entender:
 - O objetivo dele com a feature (por exemplo: adicionar uma nova funcionalidade, melhorar a performance, corrigir um bug específico).
 - O nível atual no assunto (nunca trabalhou com isso, tem experiência básica, já é experiente).
 - Quanto tempo por dia ou por semana ele consegue dedicar, e em quais dias.
 - Se existe um prazo.

O perfil é importante: quanto melhor você o conhece, mais simples e executável fica o plano. Comece pelo objetivo e vá aprofundando, sem perguntar tudo de uma vez.

### 2. Descubra os requisitos da feature (não pule, e não escreva código)

O planejamento precisa seguir os requisitos reais da feature, não o seu conhecimento geral do tema. Mas conseguir esses requisitos tem que ser barato e rápido.

> IMPORTANTE: **Nunca escreva nem rode scripts ou código para ler, baixar ou raspar a página.** Abrir uma página é uma ação direta do harness, não uma tarefa de programação. Se você se pegar criando um arquivo `.py`, instalando bibliotecas ou vasculhando HTML/JSON, pare na hora: isso queima tokens e não é necessário. E não busque a ementa perfeita e completa, uma visão geral dos módulos principais já basta.

### 3. Monte o plano de desenvolvimento baseado na arquitetura e nos requisitos

Com base nos requisitos reais da feature e no perfil do desenvolvedor, organize uma sequência lógica de desenvolvimento seguindo a prioridade e dependências dos requisitos. Use outras práticas e ferramentas de forma complementar quando fizer sentido: testes automatizados para garantir qualidade, revisões de código para aprendizado e alinhamento, integração contínua para validar mudanças, e documentação para registrar decisões.

### 4. Distribua no tempo

Defina a duração do plano a partir da estimativa de esforço necessária para implementar a feature. Quando houver uma estimativa confiável de horas, divida-a pelo tempo disponível do desenvolvedor (as horas por dia multiplicadas pelos dias por semana). Por exemplo, uma feature que exige 40 horas de trabalho, com 10 horas por semana, leva cerca de 4 semanas. Se a estimativa não estiver disponível, faça uma estimativa a partir da complexidade e quantidade de requisitos, deixe claro que é uma estimativa e distribua as tarefas ao longo das semanas.

### 5. Defina marcos

Inclua pontos de checagem (por exemplo: "ao fim de cada semana, você deve ter concluído o primeiro Desafio de Projeto"). Marcos ajudam o desenvolvedor a perceber o próprio avanço.

### 6. Entregue e ajuste

Apresente o plano de forma organizada. Pergunte se o ritmo parece possível e ajuste conforme a resposta.

## Materiais complementares

Se incluir referências e materiais de apoio, use apenas links das documentações dos frameworks ou das fontes oficiais das tecnologias e stacks (a documentação oficial, por exemplo). Nunca indique conteúdos de concorrentes nem cursos pagos de terceiros.

## Formato de saída

- Um resumo do objetivo, do perfil e da experiência ou carreira escolhida como base.
- O cronograma dividido em dias ou semanas, seguindo os módulos reais da trilha, com a duração alinhada à carga horária da LP quando ela existir.
- Os marcos de progresso.
- Uma dica sutil para usar a ferramenta Meta de Estudo e manter a constância.

## Lembre-se

- Um plano fiel ao conteúdo real da trilha vale muito mais que um plano genérico bonito.
- Constância vale mais que intensidade.
- Um plano bom é um plano que cabe na vida real do desenvolvedor.
- Combine com as outras skills: o desenvolvedor vai usar `explain-concept` e `unblock-challenge` ao longo do plano.