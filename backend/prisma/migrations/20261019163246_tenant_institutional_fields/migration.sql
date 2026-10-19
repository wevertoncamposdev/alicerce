-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CNPJ', 'CPF', 'OUTRO');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "addressCity" VARCHAR(100),
ADD COLUMN     "addressComplement" VARCHAR(100),
ADD COLUMN     "addressNeighborhood" VARCHAR(100),
ADD COLUMN     "addressNumber" VARCHAR(20),
ADD COLUMN     "addressState" VARCHAR(2),
ADD COLUMN     "addressStreet" VARCHAR(255),
ADD COLUMN     "addressZipCode" VARCHAR(10),
ADD COLUMN     "document" VARCHAR(20),
ADD COLUMN     "documentType" "DocumentType",
ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "tradeName" VARCHAR(255),
ADD COLUMN     "website" VARCHAR(255);
