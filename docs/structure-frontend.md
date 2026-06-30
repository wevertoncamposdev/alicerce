# 📘 FRONTEND NEXT.JS — GUIA PRÁTICO DE ARQUITETURA E DESENVOLVIMENTO (STUDY)

Este documento é um guia técnico baseado na estrutura atual do projeto **Study**, com foco em evolução profissional para desenvolvimento de aplicações robustas em Next.js + React.

O objetivo é ensinar como pensar, estruturar e evoluir um frontend como em times reais de engenharia de software.

---

## 1. 🧠 O QUE É O NEXT.JS NA PRÁTICA

Next.js não é apenas um framework de React.

Ele fornece 4 pilares principais:

## 1.1 Renderização

- SSR (Server Side Rendering)
- CSR (Client Side Rendering)
- SSG (Static Site Generation)
- ISR (Incremental Static Regeneration)

👉 Na prática:
Você decide *quando os dados são carregados* e *onde eles são processados*.

---

## 1.2 Routing (App Router)

Estrutura baseada em pastas:

```bash

app/
├── dashboard/
├── users/
├── roles/

```

Cada `page.tsx` é uma rota.

---

## 1.3 Data Fetching

Você pode buscar dados:

- no servidor (Server Components)
- no cliente (hooks/useEffect)
- híbrido (padrão mais comum em apps complexos)

---

## 1.4 API Integration

Next não força backend próprio.

Você consome APIs externas ou internas (NestJS no seu caso).

---

## 2. 🧱 ESTRUTURA ATUAL DO PROJETO STUDY

O projeto segue uma arquitetura **feature-based modular**:

```bash

features/
├── users/
├── roles/
├── permissions/
├── tenants/
├── audit/
├── tasks/

```

Cada feature contém:

```bash

feature/
├── components/
├── hooks/
├── services/
├── types.ts

```

## ✔️ Pontos fortes

- Separação por domínio (boa escalabilidade)
- Hooks encapsulam lógica
- Services isolam API
- Components são reutilizáveis por feature

---

## 3. 🏢 ESTRUTURA IDEAL PROFISSIONAL (ESCALA REAL)

Em empresas maduras, a estrutura evolui para:

```bash

src/
├── app/                 # rotas (Next.js)
├── features/           # domínio de negócio
├── shared/             # reutilizável global
│    ├── ui/
│    ├── hooks/
│    ├── utils/
│    ├── types/
├── services/           # camada HTTP/global client
├── lib/                # config (axios, auth, etc)
├── providers/         # contexts globais

```

---

## 🔥 Diferença importante

| Atual (Study) | Profissional |
| --- | --- |
| features isoladas | features + shared layer |
| contexts misturados | providers centralizados |
| hooks chamando API direto | service layer padronizado |
| pouca orquestração | camada de estado global clara |

---

## 4. 🔐 AUTHCONTEXT — PAPEL REAL NA ARQUITETURA

O AuthContext NÃO é um gerenciador de regras de negócio.

## ✔️ Responsabilidade correta

Ele deve conter apenas:

- token
- user
- tenant
- roles/permissions (opcional)
- isAuthReady

---

## ❌ Anti-pattern comum

- Fazer fetch dentro do AuthContext
- Controlar loading de páginas
- Orquestrar chamadas de API

---

## ✔️ Papel correto

```text
AuthContext = fonte de verdade da autenticação
````

Ele apenas EXPÕE estado.

---

## 💡 Regra de ouro

> Context não deve executar regra de negócio complexa

---

## 5. 🌐 COMO FUNCIONAM REQUISIÇÕES EM PÁGINAS COMPLEXAS

## Problema clássico

Uma página:

- Users
- Roles
- Permissions
- Stats

Cada componente faz fetch próprio.

---

## ❌ Problema comum

- múltiplas requisições duplicadas
- race conditions
- re-fetch desnecessário
- dependência circular de hooks

---

## ✔️ MODELO PROFISSIONAL

### Camada 1 — Page

Responsável apenas por layout:

```bash
Page
 ↓
Components
```

---

### Camada 2 — Componentes

Não fazem fetch diretamente.

---

### Camada 3 — Hooks (orquestração)

Ex:

```bash
useUsers()
useRoles()
usePermissions()
```

---

### Camada 4 — Services

Somente HTTP:

```bash
fetchUsers()
fetchRoles()
```

---

## 💡 Regra de fluxo

```bash
UI → Hook → Service → API
```

Nunca o contrário.

---

## 🚨 REGRA CRÍTICA

Evite:

```ts
useEffect(() => fetch(), [authState])
```

sem controle de inicialização.

---

## ✔️ SOLUÇÃO PROFISSIONAL

Adicionar “gate de inicialização”:

```ts
if (!isAuthReady) return;
```

---

## 6. 🚀 MODELO PROFISSIONAL DE NOVA FEATURE

## PASSO 1 — Definir domínio

Ex:

```bash
features/invoices
```

---

## PASSO 2 — Criar estrutura

```bash
invoices/
 ├── components/
 ├── hooks/
 ├── services/
 ├── types.ts
```

---

## PASSO 3 — Service (primeiro)

```bash
invoiceService.ts
```

Responsável por API.

---

## PASSO 4 — Hook

```bash
useInvoices()
```

Responsável por:

- estado
- loading
- cache local
- ações (create/update/delete)

---

## PASSO 5 — Componentes

- Table
- Form
- Filters

---

## PASSO 6 — Page

Somente composição:

```bash
InvoicesPage
```

---

## PASSO 7 — Documentação

- Issue criada
- CHANGELOG atualizado
- PR com checklist

---

## 7. 🧠 COMO PENSAR COMO ENGENHEIRO FRONTEND

## ❌ pensamento iniciante

- “onde coloco essa função?”
- “como faço funcionar?”

---

## ✔️ pensamento profissional

- “quem é responsável por esse dado?”
- “quem deve controlar estado?”
- “quem dispara fetch?”
- “qual camada deveria conhecer isso?”

---

## 8. 📊 FRONTEND PARA SISTEMAS DE DADOS E RELATÓRIOS

Em sistemas como o Study / TerceiroGestor:

## Você terá

- dashboards
- métricas
- tabelas grandes
- filtros complexos

---

## Isso exige

### 1. Controle de estado previsível

Evitar duplicação de fetch

---

### 2. Hooks bem isolados

Cada domínio independente

---

### 3. Evitar side effects ocultos

Nada de fetch escondido em contexts

---

### 4. Camada de dados clara

```bash
API → Service → Hook → UI
```

---

## 9. 🧩 CONCLUSÃO

O seu projeto Study já está em um nível acima da média porque:

- usa feature-based architecture
- separa hooks/services/components
- já tem auth context estruturado

---

## Próximo nível de evolução

Você deve focar em:

- controle de inicialização (isAuthReady)
- evitar fetch duplicado
- padronizar fluxos de hook
- criar “data flow predictability”

---

## 🎯 OBJETIVO FINAL DO STUDY

Transformar este projeto em:

> uma base reutilizável de arquitetura frontend escalável para sistemas reais

---

Se você aplicar corretamente esses conceitos:

✔ você elimina bugs de requisição duplicada
✔ melhora performance
✔ reduz complexidade
✔ e ganha visão de arquitetura profissional
