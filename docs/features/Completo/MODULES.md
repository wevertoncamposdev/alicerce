Faz todo sentido — com o endpoint `SEARCH` de verdade, dá pra manter os 5 módulos **exatamente no mesmo padrão de `favorites`**, sem o adapter em memória (que era workaround, não arquitetura). Antes de escrever, achei um detalhe que precisa de atenção: o `TenantController` atual tem uma rota mal desenhada (`@Controller('tenant/:tenantId')`) que quebraria mesmo sem `SEARCH` — vou corrigir isso junto, já que estamos mexendo.

## 0. Peça compartilhada no backend: `SearchBaseDto`

Em vez de repetir os mesmos 5 campos (`searchText`, `groupBy`, `sort`, `pagination`, `filters`) em 5 DTOs diferentes — isso sim seria a "gambiarra" (duplicação disfarçada de padrão) — extraio uma base:```ts
// core/common/dto/search-base.dto.ts
import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SortSpecDto {
  field!: string;
  direction!: 'asc' | 'desc';
}

export class PaginationSpecDto {
  pageIndex!: number;
  pageSize!: number;
}

/**

* Base reaproveitável para todo DTO de SEARCH do projeto — o mesmo shape
* que o frontend já manda em `SearchArgs` (lib/data-provider/types.ts).
* Cada módulo estende isso e, se precisar, adiciona campos de filtro
* próprios tipados (ver SearchAuditDto como exemplo).
 */
export class SearchBaseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() searchText?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() groupBy?: string[];

  @ApiPropertyOptional({ type: [SortSpecDto] }) @IsOptional() sort?: SortSpecDto[];

  @ApiPropertyOptional({ type: PaginationSpecDto }) @IsOptional() pagination?: PaginationSpecDto;

  @ApiPropertyOptional() @IsOptional() filters?: Record<string, unknown>;
}

```

Também extraio a resposta padrão de paginação, pra bater 1:1 com o `SearchResult<T>` do frontend:

```ts
// core/common/dto/search-result.dto.ts
export interface SearchResultDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## 1. `tenants` — corrigindo a rota + adicionando `SEARCH`

**Bug pré-existente que corrigi:** `@Controller('tenant/:tenantId')` fazia **todas** as rotas (inclusive `findAll`) exigirem um segmento `:tenantId` na URL sem uso real — `findAll()` nem lê esse parâmetro. Isso deixaria `GET /tenant` (o que o frontend chamaria) sem rota correspondente. Corrigi pro padrão simples, igual `favorites`:

```ts
// modules/tenant/tenant.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Search } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SearchTenantsDto } from './dto/search-tenant.dto';
import { Public } from '@core/auth/auth.guard';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }

  @Search()
  @ApiOperation({ summary: 'Buscar tenants' })
  @ApiResponse({ status: 200, description: 'Tenants encontrados com sucesso.' })
  search(@Body() query: SearchTenantsDto) {
    return this.tenantService.search(query);
  }
}
```

> Removi `findAll()` cru — o `SEARCH` sem `searchText` já cobre "listar tudo, paginado". Se algum outro lugar do app ainda depender de `GET /tenant` sem body, me avisa que eu mantenho os dois convivendo.

**`modules/tenant/dto/search-tenant.dto.ts`**

```ts
import { SearchBaseDto } from '@core/common/dto/search-base.dto';

export class SearchTenantsDto extends SearchBaseDto {}
```

**Adicionar `search` no repositório e no serviço:**

```ts
// tenant/persistence/repository/tenant.repository.ts (adicionar)
search(where: Prisma.TenantWhereInput, skip: number, take: number) {
    return this.prisma.tenant.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } });
}

count(where: Prisma.TenantWhereInput) {
    return this.prisma.tenant.count({ where });
}
```

```ts
// tenant/tenant.service.ts (adicionar)
async search(query: SearchTenantsDto) {
    const page = query.pagination?.pageIndex !== undefined ? query.pagination.pageIndex + 1 : 1;
    const limit = query.pagination?.pageSize ?? 20;

    const where: Prisma.TenantWhereInput = query.searchText
        ? {
              OR: [
                  { legalName: { contains: query.searchText, mode: 'insensitive' } },
                  { tradeName: { contains: query.searchText, mode: 'insensitive' } },
                  { slug: { contains: query.searchText, mode: 'insensitive' } },
              ],
          }
        : {};

    const [items, total] = await Promise.all([
        this.tenantRepository.search(where, (page - 1) * limit, limit),
        this.tenantRepository.count(where),
    ]);

    return { items, total, page, limit };
}
```

**Frontend — `modules/tenants/config/provider.ts` (agora sem adapter em memória):**

```ts
import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { TenantEntity, CreateTenantPayload, UpdateTenantPayload } from "../types/types";

export async function searchTenants(args: SearchArgs): Promise<SearchResult<TenantEntity>> {
    const response = await apiServer.search<{ items: TenantEntity[]; total: number; page: number; limit: number }>(
        "tenant",
        {
            searchText: args.searchText,
            sort: args.sort,
            pagination: { pageIndex: args.pagination?.pageIndex ?? 0, pageSize: args.pagination?.pageSize ?? 20 },
            filters: args.filters,
        },
    );

    return {
        data: response.items,
        pagination: {
            total: response.total,
            page: response.page,
            limit: response.limit,
            pages: Math.ceil(response.total / response.limit),
        },
    };
}

export async function readTenant(id: string): Promise<TenantEntity> {
    return apiServer.get<TenantEntity>(`tenant/${id}`);
}

export async function createTenant(payload: unknown): Promise<TenantEntity> {
    return apiServer.post<TenantEntity>("tenant", payload as CreateTenantPayload);
}

export async function updateTenant(id: string, payload: unknown): Promise<TenantEntity> {
    return apiServer.patch<TenantEntity>(`tenant/${id}`, payload as UpdateTenantPayload);
}

export async function deleteTenant(id: string): Promise<void> {
    await apiServer.delete(`tenant/${id}`);
}
```

O `contract.tsx` de `tenants` que te mostrei antes **não muda nada** — só o `provider.ts` trocou de estratégia. Essa é a prova de que a arquitetura de screens/contrato estava certa desde o início: o jeito de buscar dado é um detalhe encapsulado, o resto (UI, registry, `TypeView`) nem sabe que mudou.

---

## 2. `users` — mesmo padrão, com `tenantId` no `where`

**`modules/user/dto/search-user.dto.ts`**

```ts
import { SearchBaseDto } from '@core/common/dto/search-base.dto';

export class SearchUsersDto extends SearchBaseDto {}
```

**Controller** (adicionar ao `UsersController` existente):

```ts
@Search()
@Roles('ADMIN', 'USER')
@Permissions('user.read')
search(@Body() query: SearchUsersDto, @TenantId() tenantId: string) {
    return this.usersService.search(query, tenantId);
}
```

> Reparei que `UsersController` hoje lê `tenantId` de `@Query('tenantId')` manualmente no `findAll`, mas o resto do projeto (`favorites`) usa `@TenantId()` (que lê do header/contexto de sessão, sem o cliente precisar mandar explícito). Troquei pro `@TenantId()` aqui também — mais seguro (não depende do frontend "lembrar" de mandar `tenantId`) e consistente com o padrão do resto da API. Isso também simplifica o `searchUsers` do frontend, que não precisa mais buscar `getSessionTenantId()` manualmente.

**Repository + Service:**

```ts
// user/persistence/repository/user.repository.ts (adicionar)
search(where: Prisma.UserWhereInput, skip: number, take: number) {
    return this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } });
}

count(where: Prisma.UserWhereInput) {
    return this.prisma.user.count({ where });
}
```

```ts
// user/user.service.ts (adicionar)
async search(query: SearchUsersDto, tenantId: string) {
    const page = query.pagination?.pageIndex !== undefined ? query.pagination.pageIndex + 1 : 1;
    const limit = query.pagination?.pageSize ?? 20;

    const where: Prisma.UserWhereInput = {
        tenantId,
        deletedAt: null,
        ...(query.searchText ? { email: { contains: query.searchText, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
        this.userRepository.search(where, (page - 1) * limit, limit),
        this.userRepository.count(where),
    ]);

    return { items: items.map((u) => this.userMapper.mapToResponseDto(u)), total, page, limit };
}
```

**Frontend — `modules/users/config/provider.ts`:**

```ts
import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { UserEntity, CreateUserPayload, UpdateUserPayload } from "../types/types";

export async function searchUsers(args: SearchArgs): Promise<SearchResult<UserEntity>> {
    const response = await apiServer.search<{ items: UserEntity[]; total: number; page: number; limit: number }>(
        "user",
        {
            searchText: args.searchText,
            sort: args.sort,
            pagination: { pageIndex: args.pagination?.pageIndex ?? 0, pageSize: args.pagination?.pageSize ?? 20 },
            filters: args.filters,
        },
    );
    return {
        data: response.items,
        pagination: { total: response.total, page: response.page, limit: response.limit, pages: Math.ceil(response.total / response.limit) },
    };
}

export async function readUser(id: string): Promise<UserEntity> {
    return apiServer.get<UserEntity>(`user/${id}`);
}

export async function createUser(payload: unknown): Promise<UserEntity> {
    // tenantId não vem mais daqui — o backend agora resolve via @TenantId() no create também,
    // se você aplicar o mesmo ajuste no endpoint de create (ver observação abaixo).
    return apiServer.post<UserEntity>("user", payload as CreateUserPayload);
}

export async function updateUser(id: string, payload: unknown): Promise<UserEntity> {
    return apiServer.patch<UserEntity>(`user/${id}`, payload as UpdateUserPayload);
}

export async function deleteUser(id: string): Promise<void> {
    await apiServer.delete(`user/${id}`);
}
```

> **Atenção**: `createUser` no backend hoje exige `tenantId` no `body` (`CreateUserDto.tenantId`), não vem de header. Se quiser que o `create` também pare de depender do cliente mandar `tenantId`, precisa ajustar `UsersController.create` pra injetar via `@TenantId()` igual fiz no `search` — isso é uma mudança de contrato do `create`, então avalie se algo mais no seu app já depende do formato atual antes de mudar.

---

## 3. `roles` — ganhando `GET /:id` **e** `SEARCH` (as duas peças que faltavam)

**`modules/user/dto/search-role.dto.ts`**

```ts
import { SearchBaseDto } from '@core/common/dto/search-base.dto';

export class SearchRolesDto extends SearchBaseDto {}
```

**Controller** (adicionar ao `RolesController`):

```ts
@Get(':id')
@Roles('ADMIN')
@Permissions('role.read')
findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
}

@Search()
@Roles('ADMIN')
@Permissions('role.read')
search(@Body() query: SearchRolesDto, @TenantId() tenantId: string) {
    return this.rolesService.search(query, tenantId);
}
```

**Service** (adicionar ao `RolesService`):

```ts
async findOne(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role || role.deletedAt) {
        throw new NotFoundException('Role não encontrada');
    }
    return role;
}

async search(query: SearchRolesDto, tenantId: string) {
    const page = query.pagination?.pageIndex !== undefined ? query.pagination.pageIndex + 1 : 1;
    const limit = query.pagination?.pageSize ?? 20;

    const where: Prisma.RoleWhereInput = {
        tenantId,
        deletedAt: null,
        ...(query.searchText ? { name: { contains: query.searchText, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
        this.prisma.role.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
        this.prisma.role.count({ where }),
    ]);

    return { items, total, page, limit };
}
```

**Frontend — `modules/roles/config/provider.ts` (sem `findByIdInList`, `read` de verdade agora):**

```ts
import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { RoleEntity, CreateRolePayload, UpdateRolePayload } from "../types/types";

export async function searchRoles(args: SearchArgs): Promise<SearchResult<RoleEntity>> {
    const response = await apiServer.search<{ items: RoleEntity[]; total: number; page: number; limit: number }>(
        "roles",
        {
            searchText: args.searchText,
            sort: args.sort,
            pagination: { pageIndex: args.pagination?.pageIndex ?? 0, pageSize: args.pagination?.pageSize ?? 20 },
            filters: args.filters,
        },
    );
    return {
        data: response.items,
        pagination: { total: response.total, page: response.page, limit: response.limit, pages: Math.ceil(response.total / response.limit) },
    };
}

export async function readRole(id: string): Promise<RoleEntity> {
    return apiServer.get<RoleEntity>(`roles/${id}`);   // agora é GET real, não findByIdInList
}

export async function createRole(payload: unknown): Promise<RoleEntity> {
    return apiServer.post<RoleEntity>("roles", payload as CreateRolePayload);
}

export async function updateRole(id: string, payload: unknown): Promise<RoleEntity> {
    return apiServer.patch<RoleEntity>(`roles/${id}`, payload as UpdateRolePayload);
}

export async function deleteRole(id: string): Promise<void> {
    await apiServer.delete(`roles/${id}`);
}
```

No `contract.tsx` de `roles`, agora dá pra ativar `detailConfig.auditEnabled: true` de verdade (antes eu tinha deixado comentado justamente porque o `read` era sintetizado e frágil).

---

## 4. `permissions` — idêntico a `roles`

Mesma receita: `SearchPermissionsDto extends SearchBaseDto`, `@Get(':id')` + `@Search()` no `PermissionsController`, `findOne`/`search` no `PermissionsService` (campo de busca textual: `name`, e opcionalmente `resource`), e o `provider.ts` do frontend igual ao de `roles`, trocando o endpoint pra `permissions`.

---

## 5. `audit` — `SEARCH` opcional, mas útil pra manter o mesmo contrato

Audit continua **sem** `create/update/delete` (é log, não se edita), mas ganhar `SEARCH` deixa a busca textual de verdade (hoje só filtra por `entity`/`entityId` exatos):

**`modules/audit/dto/search-audit.dto.ts`**

```ts
import { SearchBaseDto } from '@core/common/dto/search-base.dto';
import { IsOptional, IsString } from 'class-validator';

// único módulo que precisa de campos de filtro PRÓPRIOS além da base —
// por isso extends em vez de usar SearchBaseDto puro (igual os outros).
export class SearchAuditDto extends SearchBaseDto {
    @IsOptional() @IsString() entity?: string;
    @IsOptional() @IsString() entityId?: string;
}
```

**Controller:**

```ts
@Search()
search(@Body() query: SearchAuditDto, @TenantId() tenantId: string) {
    return this.auditService.search(query, tenantId);
}
```

**Service:**

```ts
async search(query: SearchAuditDto, tenantId: string) {
    const page = query.pagination?.pageIndex !== undefined ? query.pagination.pageIndex + 1 : 1;
    const limit = query.pagination?.pageSize ?? 20;

    const where: Prisma.AuditWhereInput = {
        tenantId,
        ...(query.entity ? { entity: query.entity } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
        ...(query.searchText ? { action: { contains: query.searchText, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
        this.prisma.audit.findMany({
            where, skip: (page - 1) * limit, take: limit,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, email: true } }, tenant: { select: { id: true, legalName: true } } },
        }),
        this.prisma.audit.count({ where }),
    ]);

    return { items, total, page, limit };
}
```

**Frontend — `modules/audit/config/provider.ts`:**

```ts
import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { AuditLogEntity } from "../types/types";

export async function searchAuditLog(args: SearchArgs): Promise<SearchResult<AuditLogEntity>> {
    const response = await apiServer.search<{ items: AuditLogEntity[]; total: number; page: number; limit: number }>(
        "tenant/audit", // ajuste pro path real que o AuditController expuser após a mudança
        {
            searchText: args.searchText,
            sort: args.sort,
            pagination: { pageIndex: args.pagination?.pageIndex ?? 0, pageSize: args.pagination?.pageSize ?? 20 },
            filters: args.filters,
            entity: args.filters?.entity,
            entityId: args.filters?.entityId,
        },
    );
    return {
        data: response.items,
        pagination: { total: response.total, page: response.page, limit: response.limit, pages: Math.ceil(response.total / response.limit) },
    };
}

export async function readAuditEntry(): Promise<AuditLogEntity> {
    throw new Error("O módulo audit não expõe leitura individual — use a listagem.");
}
```

> Nota: o `AuditController` hoje está em `@Controller('tenant/:tenantId/audit')` — mesmo problema de path do `TenantController` original. Se você aplicar a mesma correção (tirar o `:tenantId` da rota e usar `@TenantId()` internamente, já que `getEntityAuditTrail` no frontend também usa esse path), ajuste o endpoint acima pra `"audit"` simples. Recomendo alinhar os dois de uma vez, já que estamos limpando esse padrão.

---

## O que sobra pra fazer

1. Aplicar essas mudanças de backend (posso já editar os arquivos aqui se você confirmar, ou você aplica no seu ambiente).
2. **`lib/data-provider/rest/in-memory-search.ts` fica órfão** — não é mais usado por nenhum dos 5 módulos. Pode deletar (o `knip` provavelmente vai flagar isso na próxima limpeza).
3. Rodar `npx tsc --noEmit` depois de trocar os `provider.ts` — os `contract.tsx` que já te mostrei na resposta anterior **não precisam mudar**, só ativar `detailConfig.auditEnabled: true` em `roles`/`permissions` agora que o `read` é real.
4. Testar cada `SEARCH` novo com Swagger/Insomnia antes de plugar no frontend — mais rápido pra pegar erro de `where`/Prisma isolado do fluxo de UI.

Quer que eu aplique essas mudanças diretamente no repositório clonado aqui (backend + frontend), pra você revisar o diff completo de uma vez?
