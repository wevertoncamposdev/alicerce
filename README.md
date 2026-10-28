# Alicerce

Projeto desenvolvido para estudar e aplicar práticas de engenharia de software em um ambiente próximo ao de um projeto real.

O objetivo não é apenas implementar funcionalidades, mas evoluir continuamente em:

- Arquitetura de Software
- Clean Architecture
- DDD
- Design Patterns
- Versionamento Semântico (SemVer)
- Git Flow
- Conventional Commits
- Documentação
- Testes
- CI/CD
- Boas práticas de desenvolvimento

## Objetivo

Construir uma base reutilizável de arquitetura e processos que possa ser aplicada em projetos futuros, como o TerceiroGestor.

## Tecnologias

- React
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Node.js
- NestJS
- PostgreSQL
- Docker

> *(Atualize conforme o projeto evoluir.)*

## Como rodar localmente

Requer Node 26 (`.nvmrc` na raiz) e Docker.

```bash
nvm use
cp .env.example .env
docker compose up -d --build
curl http://localhost:5000/api/health
```

Depois, abra `http://localhost:3000` e faça login com o usuário do seed:
`admin@exemplo.com` / `admin123`.

`docker compose up` sobe Postgres, Redis, aplica as migrations e
sincroniza o catálogo de permissões (serviço `migrate`) antes do backend
e do frontend subirem — ver `docs/deploy.md` para produção.

## Estrutura do Projeto

Em construção.

## Fluxo de Desenvolvimento

- Cada funcionalidade possui uma branch `feat/*`
- Correções são realizadas em `fix/*`
- Refatorações em `refactor/*`
- Commits seguem Conventional Commits
- Versionamento utilizando SemVer

## Roadmap

- [ ] Estruturar arquitetura base
- [ ] Implementar autenticação
- [ ] Sistema de favoritos
- [ ] Testes automatizados
- [ ] CI/CD

## Documentação

- CHANGELOG.md
- ADRs (futuro)
- Issues
