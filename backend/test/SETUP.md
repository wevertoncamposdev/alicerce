# Setup - Projeto Study

## Visão Geral

Este projeto é uma aplicação NestJS + Prisma + PostgreSQL pronta para escalar. A estrutura foi cuidadosamente organizada para suportar projetos pequenos e grandes com padrões consistentes.

---

## Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/study?schema=public
PORT=3000
```

### 3. Setup do Banco de Dados

```bash
# Criar o banco e executar migrações
npx prisma migrate deploy

# Gerar o Prisma Client
npx prisma generate

# (Opcional) Abrir o Prisma Studio
npx prisma studio
```

---

## Comandos Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor em modo watch
npm run start:dev

# Iniciar servidor em modo debug
npm run start:debug

# Iniciar servidor em produção
npm run start:prod
```

### Testes

```bash
# Rodar testes unitários
npm run test

# Rodar testes em modo watch
npm run test:watch

# Rodar testes com cobertura
npm run test:cov

# Rodar testes e2e
npm run test:e2e
```

### Outros

```bash
# Build do projeto
npm build

# Formato de código (Prettier)
npm run format

# Lint com fix automático
npm run lint
```

---

## Estrutura do Projeto

```
src/
├── core/
│   ├── prisma/              # Configuração do Prisma
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts
│   │   └── generated/       # Arquivos gerados automaticamente
│   └── auth/                # (Futuro) Autenticação e autorização
├── modules/
│   ├── users/               # Módulo de Usuários (referência)
│   │   ├── dto/
│   │   ├── mappers/
│   │   ├── validators/
│   │   └── utils/
│   └── teams/               # Módulo de Times
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts
```

---

## Padrões e Convenções

### Aliases de Imports

```typescript
// ✅ USE ALWAYS
import { UsersService } from '@modules/users/users.service';
import { PrismaService } from '@core/prisma/prisma.service';

// ❌ AVOID
import { UsersService } from '../../modules/users/users.service';
import { PrismaService } from '../prisma/prisma.service';
```

**Aliases configurados:**
- `@src/*` → `./src/*`
- `@core/*` → `./src/core/*`
- `@modules/*` → `./src/modules/*`

### DTOs (Data Transfer Objects)

Todos os módulos devem ter DTOs:

```typescript
// create-user.dto.ts
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;
}
```

### Mappers

Use mappers para transformar dados do Prisma em DTOs de resposta:

```typescript
export class UserMapper {
  mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      isAdult: calculateAge(user.birthDate) >= 18,
    };
  }
}
```

### Soft Delete

Quando aplicável, use soft delete com `deletedAt`:

```typescript
async remove(id: string) {
  return this.prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });
}
```

---

## Testes

### Executar Testes

```bash
npm run test
```

**Status Atual:** ✅ Todos os testes passando (48 testes)

### Estrutura de Testes

Veja [TEST_PATTERN.md](./TEST_PATTERN.md) para o padrão completo de testes.

**Resumo:**
- Service tests: Mock do `PrismaService`
- Controller tests: Mock do service
- Cada módulo deve ter `.service.spec.ts` e `.controller.spec.ts`

---

## Dados de Referência

### Models Prisma

- **User**: Usuários com suporte a soft delete, birthDate para cálculo de idade
- **Team**: Times com relação N:N com usuários

### Endpoints Principales (Users)

```
POST   /users                    # Criar usuário
GET    /users                    # Listar usuários
GET    /users/:id                # Obter usuário específico
PATCH  /users/:id                # Atualizar usuário
DELETE /users/:id                # Soft delete

GET    /users/stats/overview     # Estatísticas gerais
GET    /users/stats/active-count # Contagem de usuários ativos
GET    /users/adult-stats        # Filtro de adultos
GET    /users/filters/by-age     # Filtro por faixa etária
```

---

## Recursos

- **Documentação do Prisma:** https://www.prisma.io/docs/
- **Documentação do NestJS:** https://docs.nestjs.com/
- **Jest Testing:** https://jestjs.io/docs/getting-started

---

## Próximos Passos

- [ ] Implementar autenticação (JWT) em `src/core/auth`
- [ ] Adicionar validação de permissões
- [ ] Implementar rate limiting
- [ ] Adicionar logging centralizado
- [ ] Documentação API com Swagger
- [ ] Testes e2e completos

---

## Suporte

Para dúvidas ou problemas:
1. Verifique o [TEST_PATTERN.md](./TEST_PATTERN.md) para padrões de teste
2. Consulte os módulos `users` e `teams` como referência
3. Rode `npm run test` para validar mudanças
