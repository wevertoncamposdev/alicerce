# Padrão de Testes Unitários - NestJS + Prisma

Este documento descreve o padrão de testes unitários utilizado no projeto. Use este padrão como referência ao criar novos módulos.

---

## 1. Estrutura Geral

### Arquivo Service.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';
import { PrismaService } from '@core/prisma/prisma.service';
import { CreateYourDto } from './dto/create-your.dto';
import { UpdateYourDto } from './dto/update-your.dto';

describe('YourService', () => {
  let service: YourService;
  const prismaMock = {
    // Mock do modelo Prisma com todos os métodos necessários
    yourModel: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Adicione seus testes aqui
});
```

### Arquivo Controller.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourController } from './your.controller';
import { YourService } from './your.service';

describe('YourController', () => {
  let controller: YourController;
  let service: jest.Mocked<YourService>;

  const yourServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [YourController],
      providers: [
        {
          provide: YourService,
          useValue: yourServiceMock,
        },
      ],
    }).compile();

    controller = module.get<YourController>(YourController);
    service = module.get(YourService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Adicione seus testes aqui
});
```

---

## 2. Testes para CRUD Básico

### Service - Teste CREATE

```typescript
it('should map dto and call prisma.create', async () => {
  const dto: CreateYourDto = { name: 'Test', /* outros campos */ };
  const prismaResult = { 
    id: 'uuid', 
    ...dto,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mappedResult = { id: 'uuid', name: 'Test' };

  prismaMock.yourModel.create.mockResolvedValueOnce(prismaResult);
  mapperMock.mapToResponseDto.mockReturnValueOnce(mappedResult);

  const result = await service.create(dto);

  expect(result).toEqual(mappedResult);
  expect(prismaMock.yourModel.create).toHaveBeenCalledWith({
    data: {
      name: dto.name,
      // Mapeamento correto de todos os campos
    },
  });
});
```

### Service - Teste UPDATE (com lógica condicional)

```typescript
it('should update only defined fields', async () => {
  const id = 'uuid';
  const dto: UpdateYourDto = { name: 'Updated' };
  
  prismaMock.yourModel.update.mockResolvedValueOnce({});

  await service.update(id, dto);

  // Verificar que APENAS os campos definidos são enviados
  expect(prismaMock.yourModel.update).toHaveBeenCalledWith({
    where: { id },
    data: {
      name: 'Updated',
      // Não deve incluir campos undefined
    },
  });
});
```

### Service - Teste DELETE (soft delete se aplicável)

```typescript
it('should perform soft delete', async () => {
  const id = 'uuid';
  
  prismaMock.yourModel.update.mockResolvedValueOnce({});

  await service.remove(id);

  expect(prismaMock.yourModel.update).toHaveBeenCalledWith({
    where: { id },
    data: {
      deletedAt: expect.any(Date),
      isActive: false,
    },
  });
});
```

### Controller - Teste básico

```typescript
it('should call create on service', async () => {
  const dto: CreateYourDto = { name: 'Test' };
  const expected = { id: 'uuid', name: 'Test' };
  
  service.create.mockResolvedValueOnce(expected as never);

  const result = await controller.create(dto);

  expect(result).toEqual(expected);
  expect(service.create).toHaveBeenCalledWith(dto);
});
```

---

## 3. Testes para Regras de Negócio

### Service - Teste com múltiplas chamadas ao Prisma

```typescript
it('should calculate statistics correctly', async () => {
  const users = [
    { id: '1', isActive: true, deletedAt: null },
    { id: '2', isActive: false, deletedAt: null },
  ];
  
  prismaMock.yourModel.findMany.mockResolvedValueOnce(users);

  const stats = await service.calculateStats();

  expect(stats.total).toBe(2);
  expect(stats.active).toBe(1);
});
```

### Service - Teste com filtros complexos

```typescript
it('should filter users by age range', async () => {
  const users = [
    { id: '1', birthDate: new Date('1990-01-15') },
    { id: '2', birthDate: new Date('2000-06-20') },
  ];
  
  prismaMock.yourModel.findMany.mockResolvedValueOnce(users);
  mapperMock.mapToResponseDtoArray.mockReturnValueOnce([...]);

  const result = await service.filterByAge(25, 35);

  expect(prismaMock.yourModel.findMany).toHaveBeenCalledWith({
    where: {
      deletedAt: null,
      birthDate: { not: null },
    },
  });
});
```

---

## 4. Boas Práticas

### ✅ DO's

- Use `jest.clearAllMocks()` em cada `beforeEach`
- Agrupe testes relacionados com `describe()`
- Use nomes descritivos para os testes
- Sempre verifique que o Prisma foi chamado com os argumentos corretos
- Teste casos extremos (null, empty arrays, undefined values)
- Mantenha os mocks simples e focados
- Use `jest.fn()` para criar mocks

### ❌ DON'Ts

- Não reutilize o mesmo mock entre testes sem `clearAllMocks`
- Não teste a implementação interna, teste o comportamento
- Não use `any` em tipos sem justificativa
- Não deixe mocks com comportamento padrão vago
- Não deixe testes com `skip` ou `only` no commit
- Não teste código de framework (NestJS, Prisma) diretamente

---

## 5. Checklist para Novos Módulos

- [ ] Implementar `XxxService.spec.ts` com mocks do `PrismaService`
- [ ] Implementar `XxxController.spec.ts` com mocks do service
- [ ] Cobrir todas as rotas principais (create, findAll, findOne, update, remove)
- [ ] Adicionar testes para regras de negócio específicas
- [ ] Testar casos extremos (null, empty arrays, etc)
- [ ] Usar `parseUUIDPipe` para validação de IDs nos controllers
- [ ] Manter aliases consistentes (`@core`, `@modules`, `@src`)
- [ ] Rodar `npm run test` antes de fazer commit

---

## 6. Estrutura de Diretórios do Módulo

```
modules/
├── your-module/
│   ├── your-module.controller.spec.ts
│   ├── your-module.controller.ts
│   ├── your-module.module.ts
│   ├── your-module.service.spec.ts
│   ├── your-module.service.ts
│   ├── dto/
│   │   ├── create-your.dto.ts
│   │   └── update-your.dto.ts
│   ├── entities/
│   │   └── your.entity.ts
│   ├── mappers/
│   │   └── your.mapper.ts
│   ├── validators/
│   │   └── your.validator.ts
│   └── utils/
│       └── your.util.ts
```

---

## 7. Exemplo Completo (Users Module)

Ver [users/users.service.spec.ts](../../modules/users/users.service.spec.ts) e [users/users.controller.spec.ts](../../modules/users/users.controller.spec.ts) como referência.
