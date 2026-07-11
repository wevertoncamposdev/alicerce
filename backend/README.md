# Projeto de Estudo: Arquitetura com NestJS

Este repositório é dedicado ao estudo e prática de arquitetura de software utilizando o framework [NestJS](https://docs.nestjs.com/). O objetivo é experimentar padrões, organização de código, integração com banco de dados via Prisma e boas práticas de desenvolvimento backend.

## Comandos úteis

### Instalar dependências

```bash
npm install
```

### Migrations e geração de client Prisma

```bash
npx prisma migrate reset
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

### Inicializar o servidor NestJS

```bash
copy .env_exemple .env
npm run build
npm run start
```

## Requisitos

- Node.js
- Banco de dados configurado no arquivo `.env`
- Dependências instaladas (`npm install`)

## Recomendações

- Consulte a documentação oficial do [NestJS](https://docs.nestjs.com/) e do [Prisma](https://www.prisma.io/docs/).
- Use o VS Code com extensões de GitHub e Project Manager para facilitar o gerenciamento do projeto.

---

Sinta-se à vontade para explorar, modificar e testar diferentes abordagens!
