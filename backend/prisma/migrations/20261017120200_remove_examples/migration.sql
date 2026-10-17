/*
  Warnings:

  - You are about to drop the `example_notes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `examples` table. If the table is not empty, all the data it contains will be lost.

  Módulo de exemplo (`examples`/`example_notes`) removido — substituído pelo
  módulo `feedback` como exemplo canônico da base (ver FECHAMENTO.md, Bloco
  A). As policies de RLS das duas tabelas (add_rls_to_examples) são
  removidas junto com as tabelas, sem necessidade de DROP POLICY explícito.
*/
-- DropForeignKey
ALTER TABLE "example_notes" DROP CONSTRAINT "example_notes_exampleId_fkey";

-- DropForeignKey
ALTER TABLE "example_notes" DROP CONSTRAINT "example_notes_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "example_notes" DROP CONSTRAINT "example_notes_userId_fkey";

-- DropForeignKey
ALTER TABLE "examples" DROP CONSTRAINT "examples_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "examples" DROP CONSTRAINT "examples_userId_fkey";

-- DropTable
DROP TABLE "example_notes";

-- DropTable
DROP TABLE "examples";
