#!/usr/bin/env node
// scripts/new-module.mjs
//
// Gerador de módulo (Etapa 7.G do PLAN.md / Fase 4 do AGENTS.md). Script
// Node puro, sem template engine — o volume de arquivo gerado não justifica
// a dependência. Cobre só Módulo independente (não Feature/`--feature-of`,
// deixado pra uma rodada futura, de propósito).
//
// Uso: npm run new:module <nome-singular-kebab-case>
// Ex.:  npm run new:module widget

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

console.log(
  `\nGerando módulo "${kebabSingular}" (plural "${kebabPlural}", model Prisma "${pascalSingular}")...\n`,
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

function run(command, args, cwd) {
  console.log(`\n$ ${command} ${args.join(" ")}  (em ${cwd.replace(ROOT, "").replace(/\\/g, "/")})`);
  // `shell: true` + args array é desencorajado pelo próprio Node (os args não
  // são escapados) — no Windows o binário real do npx é `npx.cmd`, então
  // resolvemos a extensão certa em vez de depender da shell pra achá-lo.
  const resolvedCommand = process.platform === "win32" ? `${command}.cmd` : command;
  execFileSync(resolvedCommand, args, { cwd, stdio: "inherit" });
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
  Delete,
  UseGuards,
  Search,
} from '@nestjs/common';
import { Search${pascalPlural}Dto } from './dto/search-${kebabSingular}.dto';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { Roles } from '@core/common/decorators/roles.decorator';
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
  @Roles('ADMIN', 'USER')
  @Permissions('${kebabSingular}.create')
  create(@Body() dto: Create${pascalSingular}Dto, @TenantId() tenantId: string) {
    return this.${camelPlural}Service.create(dto, tenantId);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('${kebabSingular}.read')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.${camelPlural}Service.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('${kebabSingular}.update')
  update(
    @Param('id') id: string,
    @Body() dto: Update${pascalSingular}Dto,
    @TenantId() tenantId: string,
  ) {
    return this.${camelPlural}Service.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'USER')
  @Permissions('${kebabSingular}.delete')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.${camelPlural}Service.remove(id, tenantId);
  }

  @Search()
  @Roles('ADMIN', 'USER')
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
    "    exampleNotes    ExampleNote[]\n",
    `    ${camelPlural}        ${pascalSingular}[]\n`,
  );

  editExisting(
    join(BACKEND, "src", "app.module.ts"),
    "import { ExamplesModule } from './modules/examples/examples.module';\n",
    `import { ${pascalPlural}Module } from './modules/${kebabPlural}/${kebabPlural}.module';\n`,
  );
  editExisting(
    join(BACKEND, "src", "app.module.ts"),
    "    ExamplesModule,\n",
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
    "  'ExampleNote',\n",
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

export type ContextItem = { key: string; label: string; value: string };
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
    `import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@core/table-features";
import type { ${pascalSingular}Entity } from "@modules/${kebabPlural}/types/types";

export const ${camelSingular}Columns: ColumnDef<AppTableFeatures, ${pascalSingular}Entity>[] = [
    { accessorKey: "title", header: "Título" },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("pt-BR"),
    },
];
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
    `import { defineRecordModule, registerModule } from "@core/registry";
import type { DetailLayout, ListLayout } from "@core/registry/types";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { createRecordFormAction } from "@core/registry/actions";

import { FormView } from "@components/TypeView/FormView/FormView";
import { ${pascalPlural}ListView } from "@modules/${kebabPlural}/components/${pascalPlural}ListView";

import {
    search${pascalPlural}, read${pascalSingular}, create${pascalSingular}, update${pascalSingular}, delete${pascalSingular},
} from "./provider";
import type { ${pascalSingular}Entity, ContextItem } from "../types/types";

const formFields = [
    { name: "title" as const, label: "Título", placeholder: "Digite o título", type: "text" as const, required: true },
];

const { parseListState, serializeListState } = createListQueryState();

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
    main: ({ record }) => (
        <FormView<${pascalSingular}Entity>
            mode="edit"
            model="${kebabPlural}"
            recordId={record.id}
            fields={formFields}
            initialValues={record}
        />
    ),
};

function load${pascalSingular}Context(record: ${pascalSingular}Entity): ContextItem[] {
    return [
        { key: "createdAt", label: "Criado em", value: record.createdAt.slice(0, 16).replace("T", ", ") },
    ];
}

export const ${camelPlural}Module = defineRecordModule<${pascalSingular}Entity>({
    model: "${kebabPlural}",
    label: "${label}",
    views: ["list"],
    defaultView: "list",
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
    detailConfig: { auditEnabled: true, loadContext: load${pascalSingular}Context },
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
        navGroup: "permissoes",
        actionPermissions: { create: "${kebabSingular}.create", update: "${kebabSingular}.update", delete: "${kebabSingular}.delete" },
    },
`,
    "before",
  );
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

  const rlsSql = `-- RLS pra "${kebabPlural}" — mesmo padrão de add_tenant_rls/add_rls_to_examples.
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
