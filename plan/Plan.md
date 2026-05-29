# Plano de Implementação Base - Projeto Multi-Tenant

## Backend (NestJS + Prisma)

### 1. Estrutura Multi-Tenant
- [x] Garantir que todas as entidades principais possuem TenantId
- [x] Middleware/interceptor para extrair TenantId do contexto (header/token)
- [x] Validação de escopo de Tenant em todos os endpoints

### 2. Usuários, Papéis e Permissões
- [x] Modelar entidades User, Role, Permission no Prisma
- [x] Relacionamento N:N entre User <-> Role e Role <-> Permission
- [x] CRUD completo para User, Role, Permission
- [x] Associação de usuários a tenants

### 3. Autenticação e Autorização
- [x] Implementar autenticação JWT (login, refresh, logout)
- [x] Implementar AuthGuard customizado (verifica JWT, permissões e Tenant)
- [x] Estratégia de roles e permissions baseada em decorators
- [x] Endpoint para registro de usuário

### 4. Auditoria
- [x] Criar entidade AuditLog no Prisma
- [x] Middleware/interceptor para registrar ações relevantes (CRUD, login, etc)
- [x] Endpoints para consulta de logs de auditoria

### 5. Padronização e Boas Práticas
- [x] DTOs, mappers, validators para cada módulo
- [x] Filtros globais de exceção
- [x] Testes unitários e e2e para todos os módulos
- [x] Documentação Swagger/OpenAPI
- [ ] Scripts de seed para dados iniciais (roles, permissions, admin)

---

## Frontend (Next.js)

### 1. Estrutura Base
- [ ] Configuração inicial do projeto Next.js
- [ ] Estrutura de pastas para pages, components, hooks, services
- [ ] Configuração de ambiente (env, axios, etc)

### 2. Autenticação e Sessão
- [ ] Tela de login
- [ ] Tela de registro
- [ ] Fluxo de autenticação JWT (armazenamento seguro do token)
- [ ] Proteção de rotas (HOC ou middleware)
- [ ] Recuperação de senha

### 3. Gestão de Usuário
- [ ] Tela de perfil do usuário
- [ ] Edição de dados do usuário
- [ ] Listagem de usuários (admin)
- [ ] Cadastro/edição de usuários (admin)

### 4. Gestão de Tenant
- [ ] Tela de seleção/cadastro de tenant
- [ ] Listagem de tenants (admin)

### 5. Gestão de Papéis e Permissões
- [ ] Tela de listagem/criação/edição de roles
- [ ] Tela de listagem/criação/edição de permissions
- [ ] Associação de roles a usuários
- [ ] Associação de permissions a roles

### 6. Auditoria
- [ ] Tela de consulta de logs de auditoria (admin)

### 7. Padronização e Boas Práticas
- [ ] Componentização e reutilização de UI
- [ ] Validação de formulários
- [ ] Testes automatizados (unitários e e2e)
- [ ] Documentação de uso e arquitetura

---

## Observações Gerais
- [ ] Garantir modularização e separação de responsabilidades
- [ ] Documentar endpoints, fluxos e decisões arquiteturais
- [ ] Preparar scripts de deploy e setup para novos ambientes

---

Este plano serve como guia para implementação e validação de uma base reutilizável para projetos SaaS multi-tenant com autenticação, autorização e auditoria.
