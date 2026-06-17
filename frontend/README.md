# Frontend - SaaS Admin

Frontend em Next.js com App Router, arquitetura por features e composicao de telas via shells reutilizaveis.

## Comandos

```bash
npm run dev
npm run build
npm run start
```

## Arquitetura da Fase 2 - Telas Atualizadas

**Todas as telas agora utilizam 100% das ferramentas implementadas:**

### Componentes Estruturais (Shells)
- `DetailShell`: Layout principal com título, descrição e erro global
- `SideShell`: Painel lateral para formulários e sidebars
- `PainelSearchShell`: Seção com filtros, títulos e ações
- `RelationShell`: Container para visualizar relações entre entidades

### Componentes de Dados
- `TypeView`: Renderização flexível em modo table ou grid
- `DataTable`: Tabela com Tanstack React Table, loading states e mensagens vazias

### Navegação e Autorização
- `components/app-sidebar.tsx`: Navegação derivada de metadados (listRouteRules)
- `lib/authz.ts`: Regras de acesso por rota e por ação
- `contexts/auth-context.tsx`: Gerenciamento de sessão e tenant

### Telas Atualizadas (Junho 2026)
Ver [SCREENS_UPDATES.md](./SCREENS_UPDATES.md) para detalhes completos:
- ✅ Dashboard (/main/page.tsx)
- ✅ Login (/auth/login/page.tsx)
- ✅ Registro (/auth/register/page.tsx)
- ✅ Usuários (/main/users/page.tsx)
- ✅ Papéis (/main/roles/page.tsx)
- ✅ Permissões (/main/permissions/page.tsx)
- ✅ Tenants (/main/tenants/page.tsx)
- ✅ Auditoria (/main/audit/page.tsx)

## Padrao de Microcopy

Para manter consistencia entre modulos:

- `loading`: iniciar com verbo no gerundio, por dominio (`Carregando usuarios...`).
- `empty`: mensagem direta por dominio (`Nenhum usuario encontrado.`).
- `tenant ausente`: orientar acao em frase unica (`Selecione um tenant no modulo de tenants...`).
- `erro de permissao`: iniciar com `Sem permissao` e descrever a acao.

## Critérios de Smoke Visual (PR)

Validar manualmente em desktop e mobile:

1. `/main/users`
2. `/main/roles`
3. `/main/permissions`
4. `/main/tenants`
5. `/main/audit`

Checklist de smoke:

1. Header e shells com espacamento/contraste consistente.
2. Estados de carregamento/vazio renderizando mensagem esperada.
3. Acoes bloqueadas corretamente sem permissao ou sem tenant.
4. Tabelas sem corte visual e com overflow horizontal funcional.
5. Sem regressao de CRUD basico e vinculos de roles.

## Matriz Minima de Testes Criticos (Fase 3)

1. `auth`: login, logout, restauracao de sessao.
2. `tenant scope`: mudanca de tenant refletindo nos modulos dependentes.
3. `rbac`: rotas e botoes respeitando permissoes por usuario.

## Validacao Rapida

```bash
npm run build
```

Build sem erro de tipagem e smoke visual aprovado sao pre-condicoes para merge.

## Testes (Fase 3)

Testes de fluxos criticos estao em `frontend/tests/`:

```bash
# Rodar todos os testes
npm test

# Rodar teste especifico
npm test -- auth-flow.spec.ts
npm test -- tenant-scope.spec.ts
npm test -- rbac-guards.spec.ts

# Watch mode
npm test -- --watch
```

### Cobertura por teste

- **auth-flow.spec.ts**: Sessao persistente, ciclo de vida do token, multi-aba, erros.
- **tenant-scope.spec.ts**: Isolamento de tenant, troca de contexto, persistencia, casos extremos.
- **rbac-guards.spec.ts**: Validacao de acesso por rota, verificacao de permissoes, hierarquia de roles.

### Adicionando novos testes

Siga o template em `features/_template/README.md` e use os padroes:

1. Use `@jest-environment jsdom` para testes que precisam DOM/localStorage.
2. Mock localStorage para sessao e contexto de tenant.
3. Teste ambos os caminhos: com permissao e sem permissao.
4. Use nomes semanticos: "deve X quando Y" (pt-br).
