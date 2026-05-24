# Manual Base de Modelagem no Prisma

## Objetivo

Este manual serve como referência rápida para escrever relacionamentos no schema.prisma usando Prisma ORM, com exemplos práticos e regras para cada tipo de relação. Não trata de modelagem de negócio, mas sim de sintaxe, padrões e melhores práticas.

---

## 1. Regras Gerais

- Sempre defina quem é o dono da relação (quem guarda a FK)
- Use nomes consistentes: `userId`, `tenantId`, `roleId`, etc.
- Campos de relação (relation fields) usam o nome do model no singular
- Campos de coleção usam plural
- Prefira listas no lado "pai" e FK no lado "filho"
- Nomeie relações ambíguas com `@relation("Nome")`

---

## 2. Relacionamento 1:N

**No model pai:**
```prisma
model X {
  id    String @id @default(uuid()) @db.Uuid
  ys    Y[]
}
```

**No model filho:**
```prisma
model Y {
  id   String @id @default(uuid()) @db.Uuid
  xId  String @db.Uuid
  x    X @relation(fields: [xId], references: [id])
}
```

**Resumo:**
- O lado "pai" tem uma lista do filho
- O lado "filho" tem a FK e a relation field

**Exemplo:**
- model Usuário tem uma lista de livros
- model Livro tem a FK e a relation field (Usuário dono desse livro)

```prisma
model Usuario {
  id     String @id @default(uuid()) @db.Uuid
  livros Livro[]
}

model Livro {
  id        String @id @default(uuid()) @db.Uuid
  usuarioId String @db.Uuid
  usuario   Usuario @relation(fields: [usuarioId], references: [id])
}
```

---

## 3. Relacionamento 1:1

**No model dependente (guarda a FK):**
```prisma
model Y {
  id    String @id @default(uuid()) @db.Uuid
  xId   String @unique @db.Uuid
  x     X @relation(fields: [xId], references: [id])
}
```

**No model principal:**
```prisma
model X {
  id    String @id @default(uuid()) @db.Uuid
  y     Y?
}
```

**Resumo:**
- O lado dependente tem a FK com `@unique`
- O lado principal tem o campo opcional ou obrigatório

**Exemplo:**
- model Pessoa tem um Perfil
- model Perfil tem a FK única e a relation field (Pessoa dona do perfil)

```prisma
model Pessoa {
  id     String @id @default(uuid()) @db.Uuid
  perfil Perfil?
}

model Perfil {
  id       String @id @default(uuid()) @db.Uuid
  pessoaId String @unique @db.Uuid
  pessoa   Pessoa @relation(fields: [pessoaId], references: [id])
}
```

---

## 4. Relacionamento N:N Implícito

**Em ambos os models:**
```prisma
model X {
  id   String @id @default(uuid()) @db.Uuid
  ys   Y[]
}

model Y {
  id   String @id @default(uuid()) @db.Uuid
  xs   X[]
}
```

**Resumo:**
- Não existe model intermediário
- Não é possível adicionar metadados

**Exemplo:**
- model Aluno pode participar de várias Turmas
- model Turma pode ter vários Alunos

```prisma
model Aluno {
  id     String @id @default(uuid()) @db.Uuid
  turmas Turma[]
}

model Turma {
  id     String @id @default(uuid()) @db.Uuid
  alunos Aluno[]
}
```

---

## 5. Relacionamento N:N Explícito

**Model intermediário:**
```prisma
model X {
  id   String @id @default(uuid()) @db.Uuid
  xys  XY[]
}

model Y {
  id   String @id @default(uuid()) @db.Uuid
  xys  XY[]
}

model XY {
  id   String @id @default(uuid()) @db.Uuid
  xId  String @db.Uuid
  yId  String @db.Uuid

  x    X @relation(fields: [xId], references: [id])
  y    Y @relation(fields: [yId], references: [id])

  @@unique([xId, yId])
}
```

**Resumo:**
- Use quando precisa de metadados ou unicidade composta

**Exemplo:**
- model Professor pode lecionar várias Disciplinas
- model Disciplina pode ter vários Professores
- model ProfessorDisciplina faz a ligação e pode ter metadados (ex: ano letivo)

```prisma
model Professor {
  id        String @id @default(uuid()) @db.Uuid
  disciplinas ProfessorDisciplina[]
}

model Disciplina {
  id         String @id @default(uuid()) @db.Uuid
  professores ProfessorDisciplina[]
}

model ProfessorDisciplina {
  id             String @id @default(uuid()) @db.Uuid
  professorId    String @db.Uuid
  disciplinaId   String @db.Uuid
  anoLetivo      Int

  professor   Professor @relation(fields: [professorId], references: [id])
  disciplina  Disciplina @relation(fields: [disciplinaId], references: [id])

  @@unique([professorId, disciplinaId, anoLetivo])
}
```

---

## 6. Self-Relation (Auto-relacionamento)

```prisma
model X {
  id       String @id @default(uuid()) @db.Uuid
  parentId String? @db.Uuid
  parent   X? @relation("XHierarchy", fields: [parentId], references: [id])
  children X[] @relation("XHierarchy")
}
```

**Resumo:**
- Sempre nomeie a relação com `@relation("Nome")`

**Exemplo:**
- model Categoria pode ter uma categoria pai e várias categorias filhas

```prisma
model Categoria {
  id         String @id @default(uuid()) @db.Uuid
  nome       String
  categoriaPaiId String? @db.Uuid
  categoriaPai   Categoria? @relation("HierarquiaCategoria", fields: [categoriaPaiId], references: [id])
  categoriasFilhas Categoria[] @relation("HierarquiaCategoria")
}
```

---

## 7. Relações Ambíguas

Quando há mais de uma relação entre os mesmos models, nomeie explicitamente:

```prisma
model X {
  id    String @id @default(uuid()) @db.Uuid
  ys1   Y[] @relation("Rel1")
  ys2   Y[] @relation("Rel2")
}

model Y {
  id    String @id @default(uuid()) @db.Uuid
  x1Id  String @db.Uuid
  x2Id  String @db.Uuid
  x1    X @relation("Rel1", fields: [x1Id], references: [id])
  x2    X @relation("Rel2", fields: [x2Id], references: [id])
}
```

**Exemplo:**
- model Documento tem um usuário criador e um usuário aprovador
- model Usuario pode ter documentos criados e documentos aprovados

```prisma
model Usuario {
  id              String @id @default(uuid()) @db.Uuid
  documentosCriados   Documento[] @relation("Criador")
  documentosAprovados Documento[] @relation("Aprovador")
}

model Documento {
  id           String @id @default(uuid()) @db.Uuid
  criadorId    String @db.Uuid
  aprovadorId  String? @db.Uuid
  criador      Usuario @relation("Criador", fields: [criadorId], references: [id])
  aprovador    Usuario? @relation("Aprovador", fields: [aprovadorId], references: [id])
}
```

---

## 8. Melhores Práticas

- Use nomes claros e consistentes
- Sempre defina FKs no lado "filho"
- Use `@@unique` para unicidade composta
- Use listas no lado "pai" e FK no lado "filho"
- Prefira N:N explícito para relações com metadados
- Nomeie relações ambíguas
- Use `?` para campos opcionais
- Sempre revise se a relação está no sentido correto

---

## 9. Checklist Rápido

- [ ] FK está no lado certo?
- [ ] Campos de relação têm nomes claros?
- [ ] Relações N:N precisam de model intermediário?
- [ ] Relações ambíguas estão nomeadas?
- [ ] Unicidade composta está com `@@unique`?
- [ ] Campos opcionais usam `?`?
- [ ] Está usando listas no lado "pai"?

---

> Este manual cobre apenas a escrita de relacionamentos no Prisma. Para modelagem de negócio, consulte o manual de domínio do projeto.