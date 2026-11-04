#!/usr/bin/env node
// scripts/new-module.mjs
//
// Gerador de módulo (Etapa 7.G do PLAN.md / Fase 4 do AGENTS.md). Script
// Node puro, sem template engine — o volume de arquivo gerado não justifica
// a dependência. Cobre Módulo independente, Extensão 1:1 (`--extends`, U7/
// ADR 0014) e Feature filha (`--feature-of`, U9/ADR 0014).
//
// Uso: npm run new:module <nome-singular-kebab-case>
// Ex.:  npm run new:module widget
//       npm run new:module perfil-institucional -- --extends=tenant
//       npm run new:module comentario -- --feature-of=feedbacks

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BACKEND = join(ROOT, "backend");
const FRONTEND = join(ROOT, "frontend");

// ---------------------------------------------------------------- naming

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function pluralizeWord(word) {
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/i.test(word)) return word + "es";
  return word + "s";
}

function pluralizeKebab(kebabSingular) {
  const parts = kebabSingular.split("-");
  parts[parts.length - 1] = pluralizeWord(parts[parts.length - 1]);
  return parts.join("-");
}

function toPascalCase(kebab) {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
}

function toCamelCase(kebab) {
  const pascal = toPascalCase(kebab);
  return pascal[0].toLowerCase() + pascal.slice(1);
}

const rawInput = process.argv[2];

if (!rawInput) {
  fail(
    "Uso: npm run new:module <nome-singular-kebab-case>\n  Ex.: npm run new:module widget\n  Ex.: npm run new:module task-item",
  );
}

if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(rawInput)) {
  fail(
    `Nome inválido: "${rawInput}". Use singular, kebab-case, minúsculo (ex.: "widget", "task-item").`,
  );
}

const kebabSingular = rawInput;
const kebabPlural = pluralizeKebab(kebabSingular);
const pascalSingular = toPascalCase(kebabSingular);
const pascalPlural = toPascalCase(kebabPlural);
const camelSingular = toCamelCase(kebabSingular);
const camelPlural = toCamelCase(kebabPlural);
const snakeCasePlural = kebabPlural.replace(/-/g, "_");
const label = pascalPlural.replace(/([a-z])([A-Z])/g, "$1 $2");

// --extends=<modulo> (U7, ADR 0014) — Extensão 1:1: em vez de um módulo
// independente, gera um model cujo `id` É o id do módulo pai (sem lista, sem
// create/delete) e registra uma seção extra no detail do pai. `<modulo>` é o
// nome exato da pasta em backend/src/modules/.
const EXTENDS_FLAG_PREFIX = "--extends=";
const extendsFlagRaw = process.argv.slice(3).find((arg) => arg.startsWith(EXTENDS_FLAG_PREFIX));
const extendsModule = extendsFlagRaw ? extendsFlagRaw.slice(EXTENDS_FLAG_PREFIX.length) : null;

// --feature-of=<modulo-pai> (U9, ADR 0014) — Feature filha: sub-recurso 1:N
// com cascade delete (AGENTS.md §4.3), ganha `id` própria (diferente da
// Extensão, que reusa o id do pai) e vive dentro de backend/src/modules/
// <pai>/features/<kebabPlural>/, sem controller/module próprio — registra
// direto no .module.ts do pai. `<modulo>` é o nome exato da pasta em
// backend/src/modules/ (mesma convenção do --extends).
const FEATURE_OF_FLAG_PREFIX = "--feature-of=";
const featureOfFlagRaw = process.argv.slice(3).find((arg) => arg.startsWith(FEATURE_OF_FLAG_PREFIX));
const featureOfModule = featureOfFlagRaw ? featureOfFlagRaw.slice(FEATURE_OF_FLAG_PREFIX.length) : null;

if (extendsModule && featureOfModule) {
  fail("--extends e --feature-of são exclusivos — escolha um dos dois.");
}

// Única exceção conhecida: o módulo frontend de configurações do tenant se
// chama "instituicao", não "tenant" (não existe um módulo frontend "tenant").
// Para qualquer outro `--extends`/`--feature-of`, o nome da pasta em
// frontend/src/modules/ é o mesmo da pasta em backend/src/modules/.
const FRONTEND_PARENT_OVERRIDES = { tenant: "instituicao" };

console.log(
  extendsModule
    ? `\nGerando Extensão 1:1 "${kebabSingular}" (--extends=${extendsModule})...\n`
    : featureOfModule
      ? `\nGerando Feature filha "${kebabSingular}" (--feature-of=${featureOfModule})...\n`
      : `\nGerando módulo "${kebabSingular}" (plural "${kebabPlural}", model Prisma "${pascalSingular}")...\n`,
);

// ------------------------------------------------------------- utilities

function writeNew(path, content) {
  if (existsSync(path)) {
    fail(`Já existe um arquivo em ${path} — escolha outro nome ou remova o arquivo antes de gerar de novo.`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`  + ${path.replace(ROOT, "").replace(/\\/g, "/")}`);
}

function editExisting(path, anchor, insertion, mode = "after") {
  const content = readFileSync(path, "utf8");
  // Linha de final mista no repo (ex.: app.module.ts é CRLF, tenant.prisma é
  // LF) — normaliza o anchor/insertion pro estilo real do arquivo antes de
  // procurar, em vez de assumir LF.
  const usesCRLF = content.includes("\r\n");
  const normalize = (s) => (usesCRLF ? s.replace(/\n/g, "\r\n") : s);
  const normalizedAnchor = normalize(anchor);
  const normalizedInsertion = normalize(insertion);

  if (!content.includes(normalizedAnchor)) {
    fail(`Não achei o ponto de inserção esperado em ${path}. O arquivo mudou desde que este gerador foi escrito? Anchor:\n${anchor}`);
  }
  const replacement =
    mode === "after" ? normalizedAnchor + normalizedInsertion : normalizedInsertion + normalizedAnchor;
  writeFileSync(path, content.replace(normalizedAnchor, replacement));
  console.log(`  ~ ${path.replace(ROOT, "").replace(/\\/g, "/")}`);
}

// Acrescenta `content` no final de um arquivo já existente — usado pra
// colocar o model da Feature filha no MESMO .prisma do pai (mesmo arquivo
// que Feedback/FeedbackComment já compartilham hoje), sem precisar achar
// nenhum ponto de inserção.
function appendToFile(path, content) {
  const existing = readFileSync(path, "utf8");
  const usesCRLF = existing.includes("\r\n");
  const normalized = usesCRLF ? content.replace(/\n/g, "\r\n") : content;
  const separator = existing.endsWith(usesCRLF ? "\r\n" : "\n") ? "" : usesCRLF ? "\r\n" : "\n";
  writeFileSync(path, existing + separator + normalized);
  console.log(`  ~ ${path.replace(ROOT, "").replace(/\\/g, "/")} (model novo)`);
}

// Insere mais um item no final de um array de classes de um `@Module({...})`
// (ex. `controllers: [FeedbacksController]` -> inclui a nova classe) — usado
// pela Feature filha pra se registrar no módulo do PAI em vez de criar um
// `.module.ts` próprio (mesmo padrão do `FeedbackCommentsController` dentro
// de `FeedbacksModule`).
function insertIntoModuleArray(path, arrayName, itemName) {
  const content = readFileSync(path, "utf8");
  const regex = new RegExp(`(${arrayName}:\\s*\\[)([^\\]]*)(\\])`);
  const match = content.match(regex);
  if (!match) {
    fail(`Não achei "${arrayName}: [...]" em ${path.replace(ROOT, "").replace(/\\/g, "/")}.`);
  }
  const itemsRaw = match[2].trim();
  const updatedItems = itemsRaw ? `${itemsRaw}, ${itemName}` : itemName;
  writeFileSync(path, content.replace(regex, `$1${updatedItems}$3`));
  console.log(`  ~ ${path.replace(ROOT, "").replace(/\\/g, "/")} (${arrayName})`);
}

function run(command, args, cwd) {
  console.log(`\n$ ${command} ${args.join(" ")}  (em ${cwd.replace(ROOT, "").replace(/\\/g, "/")})`);
  // `shell: true` + args array é desencorajado pelo próprio Node (os args não
  // são escapados) — no Windows o binário real do npx é `npx.cmd`, então
  // resolvemos a extensão certa em vez de depender da shell pra achá-lo.
  const resolvedCommand = process.platform === "win32" ? `${command}.cmd` : command;
  execFileSync(resolvedCommand, args, { cwd, stdio: "inherit" });
}

// ---------------------------------------------------- --extends (U7) utils

// Acha o model Prisma real do módulo pai contando ocorrências de
// "this.prisma.<model>." em todo o diretório do módulo (recursivo) — não só
// no service. Alguns módulos (tenant, user) delegam pra um Repository
// (persistence/repository/*.ts) e só tocam o Prisma ali; outros (feedbacks)
// chamam o Prisma direto no service, mas também podem referenciar modelos
// relacionados (ex. UsersService chama `this.prisma.tenant.` dentro de
// `sendInviteEmail`) — por isso conta o mais frequente em vez de usar só a
// primeira ocorrência, que pegaria o modelo errado em qualquer um dos dois
// casos.
function findDominantPrismaModel(dir) {
  const counts = new Map();

  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".ts")) {
        const content = readFileSync(full, "utf8");
        for (const match of content.matchAll(/this\.prisma\.(\w+)\./g)) {
          counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
        }
      }
    }
  }
  walk(dir);

  let best = null;
  for (const [model, count] of counts) {
    if (!best || count > best.count) best = { model, count };
  }
  return best?.model ?? null;
}

// Acha o arquivo .prisma onde "model <pascalModel> {" está declarado —
// introspecção em vez de assumir o nome do arquivo (o model do pai pode
// estar em qualquer lugar de prisma/models/).
function findPrismaModelFile(dir, pascalModel) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findPrismaModelFile(full, pascalModel);
      if (found) return found;
    } else if (entry.name.endsWith(".prisma")) {
      const content = readFileSync(full, "utf8");
      if (content.includes(`model ${pascalModel} {`)) return full;
    }
  }
  return null;
}

// Insere o campo de relação reversa (lado sem `@relation(fields:...)`) no
// model do pai, logo antes do bloco de diretivas (@@index/@@map) — mesmo
// estilo de `editExisting`, mas escopado ao bloco do model certo (o pai pode
// estar num arquivo com outros models, ex. access.prisma).
function insertParentReverseRelation(path, parentPascal, relationLineRaw) {
  const content = readFileSync(path, "utf8");
  const usesCRLF = content.includes("\r\n");
  const relationLine = usesCRLF ? relationLineRaw.replace(/\n/g, "\r\n") : relationLineRaw;

  const modelStart = content.indexOf(`model ${parentPascal} {`);
  if (modelStart === -1) {
    fail(`Não achei "model ${parentPascal} {" em ${path} na hora de inserir a relação reversa.`);
  }
  const modelEnd = content.indexOf(usesCRLF ? "\r\n}" : "\n}", modelStart);
  if (modelEnd === -1) {
    fail(`Não achei o fim do model ${parentPascal} em ${path}.`);
  }

  const block = content.slice(modelStart, modelEnd);
  const directiveMarker = usesCRLF ? "\r\n\r\n    @@" : "\n\n    @@";
  const directiveIdx = block.lastIndexOf(directiveMarker);
  if (directiveIdx === -1) {
    fail(
      `Não achei o bloco de diretivas (@@index/@@map) do model ${parentPascal} em ${path} — insira a relação reversa manualmente: ${relationLineRaw}`,
    );
  }

  const insertAt = modelStart + directiveIdx + (usesCRLF ? 2 : 1);
  writeFileSync(path, content.slice(0, insertAt) + relationLine + content.slice(insertAt));
  console.log(`  ~ ${path.replace(ROOT, "").replace(/\\/g, "/")} (relação reversa)`);
}

// =============================================================== BACKEND

function generateBackend() {
  const dir = join(BACKEND, "src", "modules", kebabPlural);

  writeNew(
    join(BACKEND, "prisma", "models", "features", `${kebabSingular}.prisma`),
    `model ${pascalSingular} {
    id        String   @id @default(uuid(7)) @db.Uuid
    tenantId  String   @db.Uuid
    title     String
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    tenant Tenant @relation(fields: [tenantId], references: [id])

    @@index([tenantId])
    @@map("${snakeCasePlural}")
}
`,
  );

  writeNew(
    join(dir, "dto", `create-${kebabSingular}.dto.ts`),
    `import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Create${pascalSingular}Dto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title!: string;
}
`,
  );

  writeNew(
    join(dir, "dto", `update-${kebabSingular}.dto.ts`),
    `import { PartialType } from '@nestjs/swagger';
import { Create${pascalSingular}Dto } from './create-${kebabSingular}.dto';

export class Update${pascalSingular}Dto extends PartialType(Create${pascalSingular}Dto) {}
`,
  );

  writeNew(
    join(dir, "dto", `search-${kebabSingular}.dto.ts`),
    `import { SearchBaseDto } from '@core/common/dto/search-base.dto';

export class Search${pascalPlural}Dto extends SearchBaseDto {}
`,
  );

  writeNew(
    join(dir, `${kebabPlural}.service.ts`),
    `import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { Create${pascalSingular}Dto } from './dto/create-${kebabSingular}.dto';
import { Update${pascalSingular}Dto } from './dto/update-${kebabSingular}.dto';
import { Search${pascalPlural}Dto } from './dto/search-${kebabSingular}.dto';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';
import {
  resolvePagination,
  buildSearchTextWhere,
  buildWhitelistedFilters,
  buildWhitelistedOrderBy,
} from '@core/common/utils/tenant-search.util';

// Ver PLAN.md, Etapa 7.C ("whitelist por módulo") — ajuste conforme os
// campos reais do seu model depois de editar o schema Prisma.
const SEARCHABLE_FIELDS = ['title'] as const;
const FILTERABLE_FIELDS = ['title'] as const;
const SORTABLE_FIELDS = ['title', 'createdAt'] as const;

@Injectable()
export class ${pascalPlural}Service {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: Create${pascalSingular}Dto, tenantId: string) {
    return this.prisma.${camelSingular}.create({
      data: { ...dto, tenantId },
    });
  }

  async findOne(id: string, tenantId: string) {
    return findOneOrThrow(
      await this.prisma.${camelSingular}.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId,
      '${pascalSingular} não encontrado',
    );
  }

  async update(id: string, dto: Update${pascalSingular}Dto, tenantId: string) {
    const existing = findOneOrThrow(
      await this.prisma.${camelSingular}.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId,
      '${pascalSingular} não encontrado',
    );

    return this.prisma.${camelSingular}.update({
      where: { id: existing.id },
      data: { ...dto },
    });
  }

  async remove(id: string, tenantId: string) {
    const existing = findOneOrThrow(
      await this.prisma.${camelSingular}.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId,
      '${pascalSingular} não encontrado',
    );

    return this.prisma.${camelSingular}.delete({ where: { id: existing.id } });
  }

  async search(query: Search${pascalPlural}Dto, tenantId: string) {
    const { page, limit, skip, take } = resolvePagination(query.pagination);

    const where = {
      tenantId,
      ...buildSearchTextWhere(query.searchText, SEARCHABLE_FIELDS),
      ...buildWhitelistedFilters(query.filters, FILTERABLE_FIELDS),
    };
    const orderBy = buildWhitelistedOrderBy(query.sort, SORTABLE_FIELDS);

    const [items, total] = await Promise.all([
      this.prisma.${camelSingular}.findMany({
        where,
        skip,
        take,
        orderBy: orderBy.length ? orderBy : undefined,
      }),
      this.prisma.${camelSingular}.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
`,
  );

  writeNew(
    join(dir, `${kebabPlural}.controller.ts`),
    `import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Delete,
  UseGuards,
  Search,
} from '@nestjs/common';
import { Search${pascalPlural}Dto } from './dto/search-${kebabSingular}.dto';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { ${pascalPlural}Service } from './${kebabPlural}.service';
import { Create${pascalSingular}Dto } from './dto/create-${kebabSingular}.dto';
import { Update${pascalSingular}Dto } from './dto/update-${kebabSingular}.dto';

@Controller('${kebabPlural}')
@UseGuards(RolesPermissionsGuard)
export class ${pascalPlural}Controller {
  constructor(private readonly ${camelPlural}Service: ${pascalPlural}Service) {}

  @Post()
  @Permissions('${kebabSingular}.create')
  create(@Body() dto: Create${pascalSingular}Dto, @TenantId() tenantId: string) {
    return this.${camelPlural}Service.create(dto, tenantId);
  }

  @Get(':id')
  @Permissions('${kebabSingular}.read')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.${camelPlural}Service.findOne(id, tenantId);
  }

  @Patch(':id')
  @Permissions('${kebabSingular}.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: Update${pascalSingular}Dto,
    @TenantId() tenantId: string,
  ) {
    return this.${camelPlural}Service.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Permissions('${kebabSingular}.delete')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.${camelPlural}Service.remove(id, tenantId);
  }

  @Search()
  @Permissions('${kebabSingular}.read')
  search(@Body() query: Search${pascalPlural}Dto, @TenantId() tenantId: string) {
    return this.${camelPlural}Service.search(query, tenantId);
  }
}
`,
  );

  writeNew(
    join(dir, `${kebabPlural}.module.ts`),
    `import { Module } from '@nestjs/common';
import { ${pascalPlural}Service } from './${kebabPlural}.service';
import { ${pascalPlural}Controller } from './${kebabPlural}.controller';

@Module({
  controllers: [${pascalPlural}Controller],
  providers: [${pascalPlural}Service],
})
export class ${pascalPlural}Module {}
`,
  );

  writeNew(
    join(dir, `${kebabPlural}.service.spec.ts`),
    `import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@core/prisma/prisma.service';
import { ${pascalPlural}Service } from './${kebabPlural}.service';

describe('${pascalPlural}Service', () => {
  let service: ${pascalPlural}Service;

  const prismaMock = {
    ${camelSingular}: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${pascalPlural}Service,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<${pascalPlural}Service>(${pascalPlural}Service);
  });

  it('deve criar um ${camelSingular} com o tenantId do contexto', async () => {
    const created = { id: '1', tenantId: 'tenant-1', title: 'Teste' };
    prismaMock.${camelSingular}.create.mockResolvedValueOnce(created);

    const result = await service.create({ title: 'Teste' }, 'tenant-1');

    expect(prismaMock.${camelSingular}.create).toHaveBeenCalledWith({
      data: { title: 'Teste', tenantId: 'tenant-1' },
    });
    expect(result).toEqual(created);
  });

  it('search filtra por tenantId', async () => {
    prismaMock.${camelSingular}.findMany.mockResolvedValueOnce([]);
    prismaMock.${camelSingular}.count.mockResolvedValueOnce(0);

    await service.search({}, 'tenant-1');

    expect(prismaMock.${camelSingular}.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // \`expect.objectContaining\` é tipado como \`any\` pelo @types/jest —
        // não tem como tipar isso de forma mais estrita sem reescrever o
        // matcher (mesmo padrão de roles.service.spec.ts).
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({ tenantId: 'tenant-1' }),
      }),
    );
  });
});
`,
  );

  // --- edições em arquivo existente ---

  editExisting(
    join(BACKEND, "prisma", "models", "main", "tenant.prisma"),
    "    feedbackComments FeedbackComment[]\n",
    `    ${camelPlural}        ${pascalSingular}[]\n`,
  );

  editExisting(
    join(BACKEND, "src", "app.module.ts"),
    "import { FeedbacksModule } from './modules/feedbacks/feedbacks.module';\n",
    `import { ${pascalPlural}Module } from './modules/${kebabPlural}/${kebabPlural}.module';\n`,
  );
  editExisting(
    join(BACKEND, "src", "app.module.ts"),
    "    FeedbacksModule,\n",
    `    ${pascalPlural}Module,\n`,
  );

  editExisting(
    join(BACKEND, "src", "core", "authorization", "permission-catalog.ts"),
    "  {\n    name: 'audit.read',",
    `  {
    name: '${kebabSingular}.create',
    type: 'WRITE',
    resource: '${kebabPlural}',
    description: 'Criar ${kebabPlural}',
  },
  {
    name: '${kebabSingular}.read',
    type: 'READ',
    resource: '${kebabPlural}',
    description: 'Consultar ${kebabPlural}',
  },
  {
    name: '${kebabSingular}.update',
    type: 'WRITE',
    resource: '${kebabPlural}',
    description: 'Atualizar ${kebabPlural}',
  },
  {
    name: '${kebabSingular}.delete',
    type: 'DELETE',
    resource: '${kebabPlural}',
    description: 'Remover ${kebabPlural}',
  },
`,
    "before",
  );

  editExisting(
    join(BACKEND, "src", "core", "prisma", "extensions", "tenant-rls.extension.ts"),
    "  'FeedbackComment',\n",
    `  '${pascalSingular}',\n`,
  );
}

// ============================================================== FRONTEND

function generateFrontend() {
  const dir = join(FRONTEND, "src", "modules", kebabPlural);

  writeNew(
    join(dir, "types", "types.ts"),
    `export type ${pascalSingular}Entity = {
    id: string;
    tenantId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
};
`,
  );

  writeNew(
    join(dir, "config", "provider.ts"),
    `import { createRestDataHandlers } from "@core/data-provider/rest-handlers";
import type { ${pascalSingular}Entity } from "../types/types";

export const {
    search: search${pascalPlural},
    read: read${pascalSingular},
    create: create${pascalSingular},
    update: update${pascalSingular},
    delete: delete${pascalSingular},
} = createRestDataHandlers<${pascalSingular}Entity>("${kebabPlural}");
`,
  );

  writeNew(
    join(dir, "components", "columns.ts"),
    `import type { ColumnConfig } from "@core/registry/types";
import { buildColumns } from "@core/components/Layout/column-builder";
import type { ${pascalSingular}Entity } from "@modules/${kebabPlural}/types/types";

// Colunas tipadas (U3, docs/PLAN-fundacao-ux.md) — ver
// docs/guia-novo-modulo.md §"Tipos de coluna" pra badge/date/money/
// relation/tags/count. Ajuste conforme os campos reais do seu model.
const ${camelSingular}ColumnConfig: ColumnConfig<${pascalSingular}Entity>[] = [
    { key: "title", label: "Título", type: "title", href: (record) => \`/${kebabPlural}/\${record.id}\` },
    { key: "createdAt", label: "Criado em", type: "date" },
];

export const ${camelSingular}Columns = buildColumns(${camelSingular}ColumnConfig);
`,
  );

  writeNew(
    join(dir, "components", `${pascalPlural}ListView.tsx`),
    `"use client";

import { ListView } from "@components/TypeView/ListView/ListView";
import { ${camelSingular}Columns } from "@modules/${kebabPlural}/components/columns";
import type { ${pascalSingular}Entity } from "@modules/${kebabPlural}/types/types";
import type { SearchResult, SortSpec } from "@core/data-provider/types";

type ${pascalPlural}ListViewProps = {
    data: ${pascalSingular}Entity[];
    pagination: SearchResult<${pascalSingular}Entity>["pagination"];
    sort?: SortSpec[];
};

export function ${pascalPlural}ListView({ data, pagination, sort }: ${pascalPlural}ListViewProps) {
    return (
        <ListView
            data={data}
            columns={${camelSingular}Columns}
            detail="/${kebabPlural}"
            pagination={pagination}
            sort={sort}
        />
    );
}
`,
  );

  writeNew(
    join(dir, "config", "contract.tsx"),
    `import { FileText } from "lucide-react";
import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@core/registry/actions";

import { FormView } from "@components/TypeView/FormView/FormView";
import { ${pascalPlural}ListView } from "@modules/${kebabPlural}/components/${pascalPlural}ListView";

import {
    search${pascalPlural}, read${pascalSingular}, create${pascalSingular}, update${pascalSingular}, delete${pascalSingular},
} from "./provider";
import type { ${pascalSingular}Entity } from "../types/types";

// \`primary: true\` dispara a criação pelo Detail (createMode: "detail" abaixo, ver
// docs/ui/detail-page.md §5) — um campo por módulo, geralmente o mesmo que vira o
// título no header.
const formFields = [
    {
        name: "title" as const,
        label: "Título",
        placeholder: "Digite o título",
        type: "text" as const,
        required: true,
        primary: true,
    },
];

const { parseListState, serializeListState } = createListQueryState();

// Sem uso enquanto createMode for "detail" (listLayout.form fica pronto caso você
// volte pro fluxo de Sheet depois — não precisa remover).
const create${pascalSingular}Action = createRecordFormAction.bind(
    null,
    "${kebabPlural}",
    formFields,
);

const ${camelPlural}ListLayout: ListLayout<${pascalSingular}Entity> = {
    list: ({ data, pagination, searchArgs }) => (
        <${pascalPlural}ListView data={data} pagination={pagination} sort={searchArgs.sort} />
    ),
    form: () => (
        <FormView<${pascalSingular}Entity>
            mode="create"
            fields={formFields}
            createAction={create${pascalSingular}Action}
        />
    ),
};

const ${camelPlural}DetailLayout: DetailLayout<${pascalSingular}Entity> = {
    header: ({ record }) => ({
        title: record.title,
        subtitle: ["Criado em " + new Date(record.createdAt).toLocaleDateString("pt-BR")],
    }),
    sections: [
        {
            key: "details",
            title: "Detalhes",
            icon: FileText,
            column: 1,
            editable: true,
            fields: ["title"],
        },
    ],
};

export const ${camelPlural}Module = defineRecordModule<${pascalSingular}Entity>({
    model: "${kebabPlural}",
    label: "${label}",
    views: ["list"],
    defaultView: "list",
    // "Novo" abre o Detail em rascunho (docs/ui/detail-page.md §5) — troque pra
    // "sheet" (ou remova a linha, é o default) se o módulo não tolerar um registro
    // incompleto até o campo primary ser preenchido.
    createMode: "detail",
    dataHandlers: {
        search: search${pascalPlural},
        read: read${pascalSingular},
        create: create${pascalSingular},
        update: update${pascalSingular},
        delete: delete${pascalSingular},
    },
    formFields,
    parseListState,
    serializeListState,
    listLayout: ${camelPlural}ListLayout,
    detailLayout: ${camelPlural}DetailLayout,
    // Drawer de metadados (U6, docs/PLAN-fundacao-ux.md): "criado em" já vem
    // do próprio Histórico (auditEnabled) — sem precisar de loadContext.
    detailConfig: {
        auditEnabled: true,
        metadata: { notes: true, tags: true, attachments: true, history: true },
    },
});

registerModule(${camelPlural}Module);
`,
  );

  writeNew(
    join(FRONTEND, "src", "app", "(app)", kebabPlural, "page.tsx"),
    `// app/(app)/${kebabPlural}/page.tsx
import { TypeViewScreen } from "@core/screens/TypeViewScreen";

export default function ${pascalPlural}Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TypeViewScreen moduleName="${kebabPlural}" searchParams={searchParams} />;
}
`,
  );

  writeNew(
    join(FRONTEND, "src", "app", "(app)", kebabPlural, "[id]", "page.tsx"),
    `// app/(app)/${kebabPlural}/[id]/page.tsx
import { DetailViewScreen } from "@core/screens/DetailViewScreen";

export default async function ${pascalSingular}DetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DetailViewScreen moduleName="${kebabPlural}" id={id} />;
}
`,
  );

  writeNew(
    join(FRONTEND, "src", "app", "(app)", kebabPlural, "new", "page.tsx"),
    `// app/(app)/${kebabPlural}/new/page.tsx
import { DetailCreateScreen } from "@core/screens/DetailCreateScreen";

export default function New${pascalSingular}Page() {
    return <DetailCreateScreen moduleName="${kebabPlural}" />;
}
`,
  );

  // --- edições em arquivo existente ---

  editExisting(
    join(FRONTEND, "src", "bootstrap.ts"),
    'import "@modules/audit/config/contract";',
    `\nimport "@modules/${kebabPlural}/config/contract";`,
  );

  const configPath = join(FRONTEND, "src", "alicerce.config.ts");
  const configContent = readFileSync(configPath, "utf8");
  const importLineMatch = configContent.match(/^import \{([^}]+)\} from "lucide-react";$/m);
  if (!importLineMatch) {
    fail(`Não achei a linha de import de ícones do lucide-react em ${configPath}.`);
  }
  if (!importLineMatch[1].includes("Package")) {
    const updated = configContent.replace(
      importLineMatch[0],
      `import {${importLineMatch[1].trimEnd()}, Package } from "lucide-react";`,
    );
    writeFileSync(configPath, updated);
    console.log(`  ~ ${configPath.replace(ROOT, "").replace(/\\/g, "/")} (ícone Package)`);
  }
  editExisting(
    configPath,
    "] as const);",
    `    {
        key: "${kebabPlural}",
        title: "${label}",
        icon: Package,
        basePath: "/${kebabPlural}",
        permission: "${kebabSingular}.read",
        // "geral" é o default certo pra um módulo de domínio novo — fica
        // ao lado do Dashboard. Troque pra "configuracoes" se este módulo
        // for uma tela administrativa (ex.: ao lado de Usuários/Papéis/
        // Auditoria), ou "hidden" se não deve aparecer no menu (rota
        // continua protegida, só não vira item de navegação — ver
        // Plano Base.md 8.4/permissions pra um exemplo).
        navGroup: "geral",
        actionPermissions: { create: "${kebabSingular}.create", update: "${kebabSingular}.update", delete: "${kebabSingular}.delete" },
    },
`,
    "before",
  );
}

// ==================================================== EXTENSÃO 1:1 (--extends)

// Lê o service/controller/module do pai pra descobrir (sem chutar nomes):
// a classe do service, o model Prisma real (via `this.prisma.<model>.`), e
// as permissões de leitura/escrita que o pai já declara (reaproveitadas —
// Extensão e Feature filha não entram no catálogo de permissões, mesmo
// raciocínio do U6 pra notas/tags). `parentModule` é o nome exato da pasta
// em backend/src/modules/ — recebido como argumento (em vez de ler a global
// `extendsModule` direto) pra servir tanto `--extends` quanto `--feature-of`.
function readParentInfo(parentModule) {
  const parentDir = join(BACKEND, "src", "modules", parentModule);
  const parentServicePath = join(parentDir, `${parentModule}.service.ts`);
  const parentControllerPath = join(parentDir, `${parentModule}.controller.ts`);
  const parentModulePath = join(parentDir, `${parentModule}.module.ts`);

  if (!existsSync(parentServicePath)) {
    fail(
      `Não achei ${parentServicePath.replace(ROOT, "").replace(/\\/g, "/")} — --extends/--feature-of esperam o nome exato da pasta em backend/src/modules/.`,
    );
  }

  const serviceContent = readFileSync(parentServicePath, "utf8");
  const serviceClassMatch = serviceContent.match(/export class (\w+Service)/);
  if (!serviceClassMatch) {
    fail(`Não achei "export class <Nome>Service" em ${parentServicePath}.`);
  }
  const prismaCamel = findDominantPrismaModel(parentDir);
  if (!prismaCamel) {
    fail(`Não achei nenhum "this.prisma.<model>." em ${parentDir.replace(ROOT, "").replace(/\\/g, "/")} — preciso do model Prisma do pai.`);
  }

  const controllerContent = readFileSync(parentControllerPath, "utf8");
  // Nome do recurso é sempre o kebab-singular do módulo (ver `label`/
  // `kebabSingular` no topo do arquivo) — pode ter hífen (ex.
  // "task-item.read"), por isso a classe de caracteres inclui "-".
  const readPermMatch = controllerContent.match(/@Permissions\('([a-zA-Z0-9_.-]+)\.read'\)/);
  const updatePermMatch = controllerContent.match(/@Permissions\('([a-zA-Z0-9_.-]+)\.update'\)/);
  if (!readPermMatch || !updatePermMatch) {
    fail(
      `Não achei @Permissions('<recurso>.read'/'<recurso>.update') em ${parentControllerPath} — a Extensão reaproveita a permissão do pai, não dá pra inferir sem elas.`,
    );
  }

  const moduleContent = readFileSync(parentModulePath, "utf8");
  const moduleClassMatch = moduleContent.match(/export class (\w+Module)/);
  if (!moduleClassMatch) {
    fail(`Não achei "export class <Nome>Module" em ${parentModulePath}.`);
  }

  return {
    serviceClassName: serviceClassMatch[1],
    modulePath: `../${parentModule}/${parentModule}.service`,
    moduleClassName: moduleClassMatch[1],
    moduleImportPath: `../${parentModule}/${parentModule}.module`,
    parentModulePath,
    prismaCamel,
    prismaPascal: prismaCamel[0].toUpperCase() + prismaCamel.slice(1),
    readPermission: `${readPermMatch[1]}.read`,
    updatePermission: `${updatePermMatch[1]}.update`,
  };
}

function generateExtensionBackend(parent) {
  const dir = join(BACKEND, "src", "modules", kebabPlural);

  const parentPrismaFile = findPrismaModelFile(join(BACKEND, "prisma", "models"), parent.prismaPascal);
  if (!parentPrismaFile) {
    fail(`Não achei "model ${parent.prismaPascal} {" em nenhum .prisma de backend/prisma/models/.`);
  }

  writeNew(
    join(BACKEND, "prisma", "models", "features", `${kebabSingular}.prisma`),
    `// Extensão 1:1 de ${parent.prismaPascal} (--extends=${extendsModule}, gerador — U7/ADR 0014).
// \`id\` é a MESMA chave do ${parent.prismaCamel} pai: nunca tem vida própria,
// existe no máximo uma linha por ${parent.prismaCamel}, removida em cascata com ele.
model ${pascalSingular} {
    id        String   @id @db.Uuid
    tenantId  String   @db.Uuid
    title     String?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    ${parent.prismaCamel} ${parent.prismaPascal} @relation(fields: [id], references: [id], onDelete: Cascade)

    @@map("${snakeCasePlural}")
}
`,
  );

  writeNew(
    join(dir, "dto", `update-${kebabSingular}.dto.ts`),
    `import { IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimToNull } from '@core/common/transformers/trim-to-null';

export class Update${pascalSingular}Dto {
  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(255)
  title?: string;
}
`,
  );

  writeNew(
    join(dir, `${kebabPlural}.service.ts`),
    `import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { ${parent.serviceClassName} } from '${parent.modulePath}';
import { Update${pascalSingular}Dto } from './dto/update-${kebabSingular}.dto';

// Extensão 1:1 (--extends=${extendsModule}): sem create/search/delete — a
// linha nasce (upsert) na primeira leitura ou escrita, nunca por POST.
// \`parentService.findOne\` garante que o ${parent.prismaCamel} existe e
// pertence ao tenant antes de qualquer upsert — sem isso, um id de outro
// tenant passaria pela RLS da própria extensão por engano.
@Injectable()
export class ${pascalPlural}Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parentService: ${parent.serviceClassName},
  ) {}

  async findOne(parentId: string, tenantId: string) {
    await this.parentService.findOne(parentId, tenantId);

    return this.prisma.${camelSingular}.upsert({
      where: { id: parentId },
      update: {},
      create: { id: parentId, tenantId },
    });
  }

  async update(parentId: string, dto: Update${pascalSingular}Dto, tenantId: string) {
    await this.parentService.findOne(parentId, tenantId);

    return this.prisma.${camelSingular}.upsert({
      where: { id: parentId },
      update: dto,
      create: { id: parentId, tenantId, ...dto },
    });
  }
}
`,
  );

  writeNew(
    join(dir, `${kebabPlural}.controller.ts`),
    `import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { ${pascalPlural}Service } from './${kebabPlural}.service';
import { Update${pascalSingular}Dto } from './dto/update-${kebabSingular}.dto';

// Extensão 1:1 de ${parent.prismaPascal} — sem lista, sem create, sem delete
// (ciclo de vida preso ao pai via onDelete: Cascade no schema). Permissão
// reaproveitada do pai: sem entrada própria em permission-catalog.ts.
@Controller('${kebabPlural}')
@UseGuards(RolesPermissionsGuard)
export class ${pascalPlural}Controller {
  constructor(private readonly ${camelPlural}Service: ${pascalPlural}Service) {}

  @Get(':id')
  @Permissions('${parent.readPermission}')
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @TenantId() tenantId: string) {
    return this.${camelPlural}Service.findOne(id, tenantId);
  }

  @Patch(':id')
  @Permissions('${parent.updatePermission}')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: Update${pascalSingular}Dto,
    @TenantId() tenantId: string,
  ) {
    return this.${camelPlural}Service.update(id, dto, tenantId);
  }
}
`,
  );

  writeNew(
    join(dir, `${kebabPlural}.module.ts`),
    `import { Module } from '@nestjs/common';
import { ${parent.moduleClassName} } from '${parent.moduleImportPath}';
import { ${pascalPlural}Service } from './${kebabPlural}.service';
import { ${pascalPlural}Controller } from './${kebabPlural}.controller';

@Module({
  imports: [${parent.moduleClassName}],
  controllers: [${pascalPlural}Controller],
  providers: [${pascalPlural}Service],
})
export class ${pascalPlural}Module {}
`,
  );

  // --- edições em arquivo existente ---

  insertParentReverseRelation(parentPrismaFile, parent.prismaPascal, `    ${camelSingular} ${pascalSingular}?\n`);

  editExisting(
    join(BACKEND, "src", "app.module.ts"),
    "import { FeedbacksModule } from './modules/feedbacks/feedbacks.module';\n",
    `import { ${pascalPlural}Module } from './modules/${kebabPlural}/${kebabPlural}.module';\n`,
  );
  editExisting(
    join(BACKEND, "src", "app.module.ts"),
    "    FeedbacksModule,\n",
    `    ${pascalPlural}Module,\n`,
  );

  editExisting(
    join(BACKEND, "src", "core", "prisma", "extensions", "tenant-rls.extension.ts"),
    "  'FeedbackComment',\n",
    `  '${pascalSingular}',\n`,
  );
}

function generateExtensionFrontend(parent) {
  const frontendParentKey = FRONTEND_PARENT_OVERRIDES[extendsModule] ?? extendsModule;
  const parentContractPath = join(FRONTEND, "src", "modules", frontendParentKey, "config", "contract.tsx");
  if (!existsSync(parentContractPath)) {
    fail(
      `Não achei ${parentContractPath.replace(ROOT, "").replace(/\\/g, "/")} — confirme o módulo frontend do pai (ajuste FRONTEND_PARENT_OVERRIDES no gerador se o nome da pasta for diferente de "${extendsModule}").`,
    );
  }

  const dir = join(FRONTEND, "src", "modules", kebabPlural);

  writeNew(
    join(dir, "types", "types.ts"),
    `// Extensão 1:1 (--extends=${extendsModule}) — "id" é o id do próprio ${extendsModule} pai.
export type ${pascalSingular}Entity = {
    id: string;
    title?: string | null;
    createdAt: string;
    updatedAt: string;
};
`,
  );

  writeNew(
    join(dir, "config", "provider.ts"),
    `import { createRestDataHandlers } from "@core/data-provider/rest-handlers";
import type { SearchResult } from "@core/data-provider/types";
import type { ${pascalSingular}Entity } from "../types/types";

// Sem lista/criação — "id" é sempre o id do registro pai (ver backend).
export const {
    read: read${pascalSingular},
    update: update${pascalSingular},
} = createRestDataHandlers<${pascalSingular}Entity>("${kebabPlural}");

// Stub exigido pelo contrato de RecordModuleDataHandlers (mesmo padrão de
// modules/instituicao e modules/perfil) — nunca exercitado, pois não existe
// rota de lista pra esta Extensão.
export async function search${pascalSingular}Stub(): Promise<SearchResult<${pascalSingular}Entity>> {
    return { data: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } };
}
`,
  );

  writeNew(
    join(dir, "components", `${pascalSingular}FormSection.tsx`),
    `"use client";

import { useAuth } from "@/contexts/auth-context";
import { FormView } from "@components/TypeView/FormView/FormView";
import { FieldList } from "@core/components/DetailView/FieldList";
import type { FormFieldConfig } from "@core/registry/types";
import type { ${pascalSingular}Entity } from "@modules/${kebabPlural}/types/types";

// Mesma razão do InstitutionFormSection (ver modules/instituicao): gate
// único por "${parent.updatePermission}" (permissão do pai — a Extensão não
// tem catálogo próprio), não por campo. \`formFields\` vem de contract.tsx
// (fonte única), não duplicado aqui.
export function ${pascalSingular}FormSection({
    record,
    formFields,
}: {
    record: ${pascalSingular}Entity;
    formFields: FormFieldConfig<${pascalSingular}Entity>[];
}) {
    const { hasPermission } = useAuth();

    if (!hasPermission("${parent.updatePermission}")) {
        return <FieldList record={record} fields={["title"]} formFields={formFields} />;
    }

    return (
        <FormView<${pascalSingular}Entity>
            mode="edit"
            layout="inline"
            model="${kebabPlural}"
            recordId={record.id}
            fields={formFields}
            initialValues={record}
        />
    );
}
`,
  );

  writeNew(
    join(dir, "components", `${pascalSingular}Section.tsx`),
    `import { read${pascalSingular} } from "@modules/${kebabPlural}/config/provider";
import { ${pascalSingular}FormSection } from "@modules/${kebabPlural}/components/${pascalSingular}FormSection";
import { ${camelSingular}FormFields } from "@modules/${kebabPlural}/config/contract";

// Seção do detail do pai (--extends=${extendsModule}) — busca a própria
// extensão pelo id do registro pai; sem Detail/TypeView próprios.
export async function ${pascalSingular}Section({ parentId }: { parentId: string }) {
    const record = await read${pascalSingular}(parentId);
    return <${pascalSingular}FormSection record={record} formFields={${camelSingular}FormFields} />;
}
`,
  );

  // Precisa estar registrada no core/registry mesmo sem rota própria — o
  // autosave do FormView (useAutoSaveController) resolve `update` via
  // `getModule(model)`, não recebe a função direto (mesmo motivo de
  // "perfil"/"instituicao" chamarem `registerModule` com `views: []`).
  writeNew(
    join(dir, "config", "contract.tsx"),
    `import { defineRecordModule, registerModule } from "@core/registry";
import type { FormFieldConfig, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";

import { read${pascalSingular}, update${pascalSingular}, search${pascalSingular}Stub } from "./provider";
import type { ${pascalSingular}Entity } from "../types/types";

export const ${camelSingular}FormFields: FormFieldConfig<${pascalSingular}Entity>[] = [
    { name: "title", label: "Título", type: "text" },
];

const { parseListState, serializeListState } = createListQueryState();

// Extensão 1:1 (--extends=${extendsModule}): sem tela própria (\`views: []\`) —
// só existe pra o \`update\` do autosave ser resolvido via \`getModule\`
// quando a seção é renderizada dentro do detail do pai.
export const ${camelSingular}Module = defineRecordModule<${pascalSingular}Entity>({
    model: "${kebabPlural}",
    label: "${label}",
    views: [],
    defaultView: "detail",
    dataHandlers: {
        search: search${pascalSingular}Stub,
        read: read${pascalSingular},
        update: update${pascalSingular},
    },
    formFields: ${camelSingular}FormFields,
    parseListState,
    serializeListState,
    listLayout: {} as ListLayout<${pascalSingular}Entity>,
});

registerModule(${camelSingular}Module);
`,
  );

  editExisting(
    join(FRONTEND, "src", "bootstrap.ts"),
    'import "@modules/audit/config/contract";',
    `\nimport "@modules/${kebabPlural}/config/contract";`,
  );

  // --- edição mecânica no contract.tsx do pai ---

  editExisting(
    parentContractPath,
    'import { defineRecordModule, registerModule } from "@core/registry";\n',
    `import { ${pascalSingular}Section } from "@modules/${kebabPlural}/components/${pascalSingular}Section";\n`,
  );

  editExisting(
    parentContractPath,
    "    sections: [\n",
    `        {
            key: "${kebabSingular}",
            title: "${label}",
            icon: Puzzle,
            column: 2,
            render: ({ record }) => <${pascalSingular}Section parentId={record.id} />,
        },
`,
    "after",
  );

  const contractContent = readFileSync(parentContractPath, "utf8");
  const iconImportMatch = contractContent.match(/^import \{([^}]+)\} from "lucide-react";$/m);
  if (iconImportMatch && !iconImportMatch[1].includes("Puzzle")) {
    const updated = contractContent.replace(
      iconImportMatch[0],
      `import {${iconImportMatch[1].trimEnd()}, Puzzle } from "lucide-react";`,
    );
    writeFileSync(parentContractPath, updated);
    console.log(`  ~ ${parentContractPath.replace(ROOT, "").replace(/\\/g, "/")} (ícone Puzzle)`);
  }

  return frontendParentKey;
}

// =============================================================== FEATURE FILHA (--feature-of)

// Gera a Feature no backend: model com `id` própria (diferente da Extensão,
// que reusa o id do pai) acrescentado no MESMO .prisma do pai (mesmo arquivo
// que Feedback/FeedbackComment já compartilham hoje — ver
// backend/prisma/models/features/feedback.prisma), sem controller/module
// próprio — registra direto no `.module.ts` do pai, igual
// FeedbackCommentsController dentro de FeedbacksModule.
function generateFeatureBackend(parent, parentModule) {
  const dir = join(BACKEND, "src", "modules", parentModule, "features", kebabPlural);
  const parentFkField = `${parent.prismaCamel}Id`;

  const parentPrismaFile = findPrismaModelFile(join(BACKEND, "prisma", "models"), parent.prismaPascal);
  if (!parentPrismaFile) {
    fail(`Não achei "model ${parent.prismaPascal} {" em nenhum .prisma de backend/prisma/models/.`);
  }

  insertParentReverseRelation(parentPrismaFile, parent.prismaPascal, `    ${camelPlural} ${pascalSingular}[]\n`);

  appendToFile(
    parentPrismaFile,
    `
// Feature filha de ${parent.prismaPascal} (--feature-of=${parentModule}, gerador — U9/
// ADR 0014). \`id\` própria (diferente da Extensão 1:1, que reusa o id do
// pai) — vive e morre com o ${parent.prismaCamel} pai via onDelete: Cascade.
model ${pascalSingular} {
    id        String   @id @default(uuid(7)) @db.Uuid
    tenantId  String   @db.Uuid
    ${parentFkField} String @db.Uuid
    userId    String   @db.Uuid
    content   String
    createdAt DateTime @default(now())

    ${parent.prismaCamel} ${parent.prismaPascal} @relation(fields: [${parentFkField}], references: [id], onDelete: Cascade)
    user   User   @relation(fields: [userId], references: [id])
    tenant Tenant @relation(fields: [tenantId], references: [id])

    @@index([${parentFkField}])
    @@index([tenantId])
    @@index([userId])
    @@map("${snakeCasePlural}")
}
`,
  );

  // Relação reversa em Tenant e User — mesmo anchor literal que o fluxo de
  // módulo independente já usa em tenant.prisma (existe igual em
  // access.prisma, onde FeedbackComment também aparece hoje).
  editExisting(
    join(BACKEND, "prisma", "models", "main", "tenant.prisma"),
    "    feedbackComments FeedbackComment[]\n",
    `    ${camelPlural}        ${pascalSingular}[]\n`,
  );
  editExisting(
    join(BACKEND, "prisma", "models", "main", "access.prisma"),
    "    feedbackComments FeedbackComment[]\n",
    `    ${camelPlural}        ${pascalSingular}[]\n`,
  );

  writeNew(
    join(dir, "dto", `create-${kebabSingular}.dto.ts`),
    `import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Create${pascalSingular}Dto {
  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  content!: string;
}
`,
  );

  writeNew(
    join(dir, `${kebabPlural}.service.ts`),
    `import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { Create${pascalSingular}Dto } from './dto/create-${kebabSingular}.dto';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';

@Injectable()
export class ${pascalPlural}Service {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(${parentFkField}: string, tenantId: string) {
    return this.prisma.${camelSingular}.findMany({
      where: { ${parentFkField}, tenantId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async create(
    ${parentFkField}: string,
    dto: Create${pascalSingular}Dto,
    tenantId: string,
    userSub: string,
  ) {
    return this.prisma.${camelSingular}.create({
      data: {
        content: dto.content,
        ${parentFkField},
        tenantId,
        userId: userSub,
      },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async remove(id: string, tenantId: string) {
    const entry = findOneOrThrow(
      await this.prisma.${camelSingular}.findUnique({ where: { id } }),
      (candidate) => candidate.tenantId === tenantId,
      '${pascalSingular} não encontrado ou acesso negado',
    );

    return this.prisma.${camelSingular}.delete({ where: { id: entry.id } });
  }
}
`,
  );

  writeNew(
    join(dir, `${kebabPlural}.controller.ts`),
    `import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { Permissions } from '@core/common/decorators/permissions.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { ${pascalPlural}Service } from './${kebabPlural}.service';
import { Create${pascalSingular}Dto } from './dto/create-${kebabSingular}.dto';

// Feature filha de ${parent.prismaPascal} (--feature-of=${parentModule}) — reaproveita
// as permissões do pai, sem entrada própria em permission-catalog.ts.
@Controller('${parentModule}/:${parentFkField}/${kebabPlural}')
@UseGuards(RolesPermissionsGuard)
export class ${pascalPlural}Controller {
  constructor(private readonly ${camelPlural}Service: ${pascalPlural}Service) {}

  @Get()
  @Permissions('${parent.readPermission}')
  findAll(
    @Param('${parentFkField}', new ParseUUIDPipe()) ${parentFkField}: string,
    @TenantId() tenantId: string,
  ) {
    return this.${camelPlural}Service.findAll(${parentFkField}, tenantId);
  }

  @Post()
  @Permissions('${parent.updatePermission}')
  create(
    @Param('${parentFkField}', new ParseUUIDPipe()) ${parentFkField}: string,
    @Body() dto: Create${pascalSingular}Dto,
    @TenantId() tenantId: string,
    @CurrentUserId() userSub: string,
  ) {
    return this.${camelPlural}Service.create(${parentFkField}, dto, tenantId, userSub);
  }

  @Delete(':id')
  @Permissions('${parent.updatePermission}')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.${camelPlural}Service.remove(id, tenantId);
  }
}
`,
  );

  writeNew(
    join(dir, `${kebabPlural}.service.spec.ts`),
    `import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@core/prisma/prisma.service';
import { ${pascalPlural}Service } from './${kebabPlural}.service';

describe('${pascalPlural}Service', () => {
  let service: ${pascalPlural}Service;

  const prismaMock = {
    ${camelSingular}: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${pascalPlural}Service,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<${pascalPlural}Service>(${pascalPlural}Service);
  });

  it('cria com o tenantId e o autor do contexto', async () => {
    const created = { id: '1', tenantId: 'tenant-1', ${parentFkField}: 'parent-1', userId: 'user-1', content: 'Teste' };
    prismaMock.${camelSingular}.create.mockResolvedValueOnce(created);

    const result = await service.create('parent-1', { content: 'Teste' }, 'tenant-1', 'user-1');

    expect(prismaMock.${camelSingular}.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
      }),
    );
    expect(result).toEqual(created);
  });

  it('findAll filtra pelo pai e pelo tenantId', async () => {
    prismaMock.${camelSingular}.findMany.mockResolvedValueOnce([]);

    await service.findAll('parent-1', 'tenant-1');

    expect(prismaMock.${camelSingular}.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({ ${parentFkField}: 'parent-1', tenantId: 'tenant-1' }),
      }),
    );
  });
});
`,
  );

  // --- edição no .module.ts do PAI (sem .module.ts próprio) ---

  editExisting(
    parent.parentModulePath,
    "@Module({",
    `import { ${pascalPlural}Controller } from './features/${kebabPlural}/${kebabPlural}.controller';
import { ${pascalPlural}Service } from './features/${kebabPlural}/${kebabPlural}.service';

`,
    "before",
  );
  insertIntoModuleArray(parent.parentModulePath, "controllers", `${pascalPlural}Controller`);
  insertIntoModuleArray(parent.parentModulePath, "providers", `${pascalPlural}Service`);

  editExisting(
    join(BACKEND, "src", "core", "prisma", "extensions", "tenant-rls.extension.ts"),
    "  'FeedbackComment',\n",
    `  '${pascalSingular}',\n`,
  );
}

// Insere a propriedade `relations: async ({ record }) => {...}` no objeto
// `detailLayout` do pai — ou, se o pai já tiver uma (outra Feature, ou
// escrita à mão como feedbacks), insere só a nova aba dentro do `return [`
// já existente. Ancora só na ABERTURA do array (mesmo truque do `sections:
// [` da Extensão), nunca no conteúdo — sobrevive a edição de campo/seção.
function insertDetailLayoutRelation(path, { fetchLine, fullProperty, tabItem }) {
  const content = readFileSync(path, "utf8");
  const usesCRLF = content.includes("\r\n");
  const nl = usesCRLF ? "\r\n" : "\n";
  const normalize = (s) => (usesCRLF ? s.replace(/\n/g, "\r\n") : s);

  const varMatch = content.match(/detailLayout:\s*(\w+)/);
  if (!varMatch) {
    fail(
      `Não achei "detailLayout: <nome>" em ${path.replace(ROOT, "").replace(/\\/g, "/")} — adicione a aba de relação à mão (ver docs/guia-novo-modulo.md, Feature filha).`,
    );
  }
  const declMarker = `const ${varMatch[1]}`;
  const declStart = content.indexOf(declMarker);
  if (declStart === -1) {
    fail(`Não achei "${declMarker}" em ${path.replace(ROOT, "").replace(/\\/g, "/")}.`);
  }
  const closeMarker = `${nl}};${nl}`;
  const declCloseIdx = content.indexOf(closeMarker, declStart);
  if (declCloseIdx === -1) {
    fail(`Não achei o fim de "${declMarker}" em ${path.replace(ROOT, "").replace(/\\/g, "/")}.`);
  }

  const relationsKeyIdx = content.indexOf("relations:", declStart);
  const hasRelationsAlready = relationsKeyIdx !== -1 && relationsKeyIdx < declCloseIdx;

  if (!hasRelationsAlready) {
    // `declCloseIdx` é a posição do \n que ANTECEDE "};" (início do
    // `closeMarker`) — inserir ali no meio quebraria a linha anterior
    // ("    ]," + propriedade nova, sem quebra de linha entre as duas).
    // Insere depois desse \n, logo antes de "};".
    const insertAt = declCloseIdx + nl.length;
    writeFileSync(path, content.slice(0, insertAt) + normalize(fullProperty) + content.slice(insertAt));
    console.log(`  ~ ${path.replace(ROOT, "").replace(/\\/g, "/")} (relations novo)`);
    return;
  }

  const returnMarker = `return [${nl}`;
  const returnIdx = content.indexOf(returnMarker, relationsKeyIdx);
  if (returnIdx === -1) {
    fail(
      `Achei "relations:" mas não "return [" em ${path.replace(ROOT, "").replace(/\\/g, "/")} — insira a aba à mão.`,
    );
  }

  // Insere a linha do fetch no INÍCIO da linha de "return [" (não no meio do
  // token) — senão a indentação de "return [" vira sufixo da linha inserida
  // e "return [" fica sem indentação nenhuma.
  const lineStartIdx = content.lastIndexOf(nl, returnIdx);
  const insertAt = lineStartIdx === -1 ? 0 : lineStartIdx + nl.length;

  const withFetch = content.slice(0, insertAt) + normalize(fetchLine) + content.slice(insertAt);
  const afterReturnOpen = returnIdx + normalize(fetchLine).length + returnMarker.length;
  writeFileSync(path, withFetch.slice(0, afterReturnOpen) + normalize(tabItem) + withFetch.slice(afterReturnOpen));
  console.log(`  ~ ${path.replace(ROOT, "").replace(/\\/g, "/")} (nova aba em relations)`);
}

// Gera a Feature no frontend — bem mais leve que a Extensão: sem rota
// própria, sem `registerModule`. Mesmo padrão de `frontend/src/modules/
// feedbacks/config/comments-provider.ts` (Server Actions com `apiServer`
// direto na rota nested) + `RelationTablePanel` (já existe) na aba do pai.
function generateFeatureFrontend(parent, parentModule) {
  const frontendParentKey = FRONTEND_PARENT_OVERRIDES[parentModule] ?? parentModule;
  const parentModuleDir = join(FRONTEND, "src", "modules", frontendParentKey);
  const parentContractPath = join(parentModuleDir, "config", "contract.tsx");
  const parentTypesPath = join(parentModuleDir, "types", "types.ts");
  if (!existsSync(parentContractPath)) {
    fail(
      `Não achei ${parentContractPath.replace(ROOT, "").replace(/\\/g, "/")} — confirme o módulo frontend do pai (ajuste FRONTEND_PARENT_OVERRIDES no gerador se o nome da pasta for diferente de "${parentModule}").`,
    );
  }

  // O tipo entra no MESMO types.ts do pai — mesmo padrão de FeedbackComment
  // dentro de modules/feedbacks/types/types.ts, em vez de um arquivo novo.
  appendToFile(
    parentTypesPath,
    `
export type ${pascalSingular}Entity = {
    id: string;
    content: string;
    createdAt: string;
    user?: { id: string; email?: string | null } | null;
};
`,
  );

  writeNew(
    join(parentModuleDir, "config", `${kebabPlural}-provider.ts`),
    `'use server';

import { apiServer } from "@lib/api-server";
import type { ${pascalSingular}Entity } from "@modules/${frontendParentKey}/types/types";

export async function list${pascalPlural}(parentId: string): Promise<${pascalSingular}Entity[]> {
    return apiServer.get<${pascalSingular}Entity[]>(\`${parentModule}/\${parentId}/${kebabPlural}\`);
}

export async function create${pascalSingular}(parentId: string, content: string): Promise<${pascalSingular}Entity> {
    return apiServer.post<${pascalSingular}Entity>(\`${parentModule}/\${parentId}/${kebabPlural}\`, { content });
}

export async function delete${pascalSingular}(parentId: string, ${camelSingular}Id: string): Promise<void> {
    await apiServer.delete(\`${parentModule}/\${parentId}/${kebabPlural}/\${${camelSingular}Id}\`);
}
`,
  );

  // --- edição mecânica no contract.tsx do pai ---

  const contractContent = readFileSync(parentContractPath, "utf8");

  editExisting(
    parentContractPath,
    'import { defineRecordModule, registerModule } from "@core/registry";\n',
    `import { list${pascalPlural}, create${pascalSingular}, delete${pascalSingular} } from "@modules/${frontendParentKey}/config/${kebabPlural}-provider";\n`,
  );

  if (!contractContent.includes("RelationTablePanel")) {
    editExisting(
      parentContractPath,
      'import { defineRecordModule, registerModule } from "@core/registry";\n',
      `import { RelationTablePanel } from "@core/components/DetailView/RelationView/RelationTablePanel";\n`,
    );
  }

  const iconImportMatch = contractContent.match(/^import \{([^}]+)\} from "lucide-react";$/m);
  if (!iconImportMatch) {
    fail(`Não achei a linha de import de ícones do lucide-react em ${parentContractPath}.`);
  }
  if (!iconImportMatch[1].includes("List")) {
    const updated = readFileSync(parentContractPath, "utf8").replace(
      iconImportMatch[0],
      `import {${iconImportMatch[1].trimEnd()}, List } from "lucide-react";`,
    );
    writeFileSync(parentContractPath, updated);
    console.log(`  ~ ${parentContractPath.replace(ROOT, "").replace(/\\/g, "/")} (ícone List)`);
  }

  const tabItem = `            {
                key: "${kebabPlural}",
                label: "${label}",
                icon: List,
                count: ${camelSingular}Items.length,
                content: (
                    <RelationTablePanel
                        favoriteId={record.id}
                        initialNotes={${camelSingular}Items}
                        createNoteFn={create${pascalSingular}}
                        deleteNoteFn={delete${pascalSingular}}
                        searchPlaceholder="Pesquisar ${label.toLowerCase()}"
                        addLabel="Novo registro"
                        emptyMessage="Nenhum registro encontrado."
                    />
                ),
            },
`;

  insertDetailLayoutRelation(parentContractPath, {
    fetchLine: `        const ${camelSingular}Items = await list${pascalPlural}(record.id);\n`,
    fullProperty: `    relations: async ({ record }) => {
        const ${camelSingular}Items = await list${pascalPlural}(record.id);
        return [
${tabItem}        ];
    },
`,
    tabItem,
  });

  return frontendParentKey;
}

// ============================================================ MIGRATIONS

function generateMigrations() {
  console.log("\nRodando migrations do Prisma (precisa do Postgres de dev acessível)...");

  try {
    run("npx", ["prisma", "migrate", "dev", "--name", `add_${kebabPlural}`], BACKEND);
  } catch (err) {
    console.warn(
      `\n⚠ Não consegui rodar a migration do model automaticamente (${err.message}).\n` +
        `  Rode manualmente:\n    cd backend\n    npx prisma migrate dev --name add_${kebabPlural}\n`,
    );
    return false;
  }

  try {
    run(
      "npx",
      ["prisma", "migrate", "dev", "--create-only", "--name", `add_rls_to_${kebabPlural}`],
      BACKEND,
    );
  } catch (err) {
    console.warn(`\n⚠ Não consegui criar a migration de RLS automaticamente (${err.message}).`);
    return false;
  }

  // Acha a pasta recém-criada (nome com timestamp, não previsível de antemão).
  const migrationsDir = join(BACKEND, "prisma", "migrations");
  const folder = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(`add_rls_to_${kebabPlural}`))
    .sort()
    .pop();

  if (!folder) {
    console.warn("\n⚠ Não achei a pasta da migration de RLS recém-criada — escreva o SQL manualmente.");
    return false;
  }

  const rlsSql = `-- RLS pra "${kebabPlural}" — mesmo padrão de add_tenant_rls/add_rls_to_feedbacks.
DO $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', '${snakeCasePlural}');
  EXECUTE format(
    $f$CREATE POLICY tenant_isolation ON %I
       USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
       WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid)$f$,
    '${snakeCasePlural}'
  );
END
$$;
`;

  writeFileSync(join(migrationsDir, folder, "migration.sql"), rlsSql);
  console.log(`  + backend/prisma/migrations/${folder}/migration.sql`);

  try {
    run("npx", ["prisma", "migrate", "dev"], BACKEND);
  } catch (err) {
    console.warn(
      `\n⚠ Escrevi a migration de RLS mas não consegui aplicá-la (${err.message}).\n` +
        `  Rode manualmente:\n    cd backend\n    npx prisma migrate dev\n`,
    );
    return false;
  }

  return true;
}

// =================================================================== RUN

if (extendsModule) {
  const parent = readParentInfo(extendsModule);
  generateExtensionBackend(parent);
  const frontendParentKey = generateExtensionFrontend(parent);
  const migrationsOk = generateMigrations();

  console.log(`\n✔ Extensão 1:1 "${kebabPlural}" gerada (--extends=${extendsModule}).\n`);
  console.log("Próximos passos:");
  console.log(`  1. Edite backend/prisma/models/features/${kebabSingular}.prisma com os campos reais da extensão.`);
  console.log(`  2. Ajuste formFields em frontend/src/modules/${kebabPlural}/components/${pascalSingular}FormSection.tsx.`);
  if (!migrationsOk) {
    console.log("  3. Finalize a migration manualmente (ver avisos acima).");
  }
  console.log(`  4. npx tsc --noEmit + lint + testes nos dois projetos.`);
  console.log(`  5. npm run dev (raiz) e confirme a seção "${label}" no detail de ${frontendParentKey}.\n`);
} else if (featureOfModule) {
  const parent = readParentInfo(featureOfModule);
  generateFeatureBackend(parent, featureOfModule);
  const frontendParentKey = generateFeatureFrontend(parent, featureOfModule);
  const migrationsOk = generateMigrations();

  console.log(`\n✔ Feature filha "${kebabPlural}" gerada (--feature-of=${featureOfModule}).\n`);
  console.log("Próximos passos:");
  console.log(`  1. Revise o model novo em backend/prisma/models/features/ (acrescentado no .prisma do pai) — ajuste os campos reais além de "content".`);
  console.log(`  2. Revise a edição em backend/src/modules/${featureOfModule}/${featureOfModule}.module.ts (controller/service novos registrados).`);
  console.log(`  3. Revise a aba nova em frontend/src/modules/${frontendParentKey}/config/contract.tsx (ícone, label, textos de ${label}).`);
  if (!migrationsOk) {
    console.log("  4. Finalize a migration manualmente (ver avisos acima).");
  }
  console.log(`  5. npx tsc --noEmit + lint + testes nos dois projetos.`);
  console.log(`  6. npm run dev (raiz) e confirme a aba "${label}" no detail de ${frontendParentKey}.\n`);
} else {
  generateBackend();
  generateFrontend();
  const migrationsOk = generateMigrations();

  console.log(`\n✔ Módulo "${kebabPlural}" gerado.\n`);
  console.log("Próximos passos:");
  console.log(`  1. Edite backend/prisma/models/features/${kebabSingular}.prisma com os campos reais do seu domínio.`);
  console.log(`  2. Ajuste SEARCHABLE_FIELDS/FILTERABLE_FIELDS/SORTABLE_FIELDS em ${kebabPlural}.service.ts.`);
  console.log(`  3. Ajuste formFields/columns.ts no frontend com os campos reais.`);
  if (!migrationsOk) {
    console.log("  4. Finalize a migration manualmente (ver avisos acima).");
  }
  console.log(`  5. npx tsc --noEmit + lint + testes nos dois projetos.`);
  console.log(`  6. npm run dev (raiz) e confirme "${label}" no menu lateral.\n`);
}
