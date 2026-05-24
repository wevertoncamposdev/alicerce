-- CreateEnum
CREATE TYPE "TenantCategory" AS ENUM ('ASSOCIATION', 'FOUNDATION', 'RELIGIOUS_ORGANIZATION', 'SOCIAL_COOPERATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "TenantServiceArea" AS ENUM ('SOCIAL_ASSISTANCE', 'EDUCATION', 'HEALTH', 'RIGHTS_ADVOCACY', 'CULTURE', 'ENVIRONMENT', 'ADVISORY_SUPPORT', 'ECONOMIC_DEVELOPMENT', 'PROFESSIONAL_TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "PartnershipType" AS ENUM ('NONE', 'COLLABORATION_TERM', 'FOMENT_TERM', 'COOPERATION_AGREEMENT');

-- CreateEnum
CREATE TYPE "CoverageArea" AS ENUM ('NEIGHBORHOOD', 'MUNICIPAL', 'INTERCITY', 'STATE', 'REGIONAL', 'NATIONAL', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "OrganizationSize" AS ENUM ('MICRO', 'SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "BoardRoleType" AS ENUM ('PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'VICE_SECRETARY', 'TREASURER', 'VICE_TREASURER', 'BOARD_MEMBER', 'FISCAL_COUNCIL_MEMBER', 'LEGAL_REPRESENTATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "TenantDocumentType" AS ENUM ('BYLAWS', 'MEETING_MINUTES', 'ELECTION_MINUTES', 'APPOINTMENT_TERM', 'REGISTRATION_CERTIFICATE', 'TAX_DOCUMENT', 'FINANCIAL_STATEMENT', 'ACCOUNTABILITY_REPORT', 'ANNUAL_REPORT', 'INTERNAL_REGULATION', 'OTHER');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('ADMIN', 'USER', 'GUEST');

-- CreateEnum
CREATE TYPE "PermissionType" AS ENUM ('READ', 'WRITE', 'DELETE');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('EMAIL', 'PHONE', 'SOCIAL');

-- CreateEnum
CREATE TYPE "AuditType" AS ENUM ('LOGIN', 'LOGOUT', 'DATA_CHANGE', 'PERMISSION_CHANGE');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('BUG', 'FEATURE_REQUEST', 'OTHER', 'REPORT', 'ANALYTICS', 'QUALITY', 'QUANTITY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CPF', 'RG', 'CNH', 'NIS', 'PIS', 'PASEP', 'TITULO_ELEITOR', 'CERTIDAO_NASCIMENTO', 'CERTIDAO_CASAMENTO', 'PASSAPORTE', 'CARTEIRA_TRABALHO', 'RESERVISTA', 'RNE', 'CPF_RESPONSAVEL');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'WORK');

-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "socialname" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "userId" UUID,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_addresses" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "addressId" UUID NOT NULL,
    "type" "AddressType" NOT NULL DEFAULT 'HOME',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "person_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "complement" TEXT,
    "reference" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "main" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_documents" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "value" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "person_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "assignedTo" UUID,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "legalName" VARCHAR(255) NOT NULL,
    "tradeName" VARCHAR(255),
    "registrationNumber" VARCHAR(20) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "values" TEXT,
    "category" "TenantCategory" NOT NULL,
    "primaryServiceArea" "TenantServiceArea" NOT NULL,
    "partnershipType" "PartnershipType" NOT NULL DEFAULT 'NONE',
    "coverageArea" "CoverageArea",
    "organizationSize" "OrganizationSize",
    "foundedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "street" VARCHAR(255),
    "number" VARCHAR(50),
    "district" VARCHAR(150),
    "city" VARCHAR(150),
    "state" VARCHAR(100),
    "zipCode" VARCHAR(20),
    "country" VARCHAR(100),
    "complement" VARCHAR(255),
    "reference" VARCHAR(255),
    "phone" VARCHAR(20),
    "mobilePhone" VARCHAR(20),
    "email" VARCHAR(255),
    "website" VARCHAR(255),
    "instagram" VARCHAR(255),
    "facebook" VARCHAR(255),
    "linkedin" VARCHAR(255),
    "usesVolunteers" BOOLEAN NOT NULL DEFAULT false,
    "acceptsDonations" BOOLEAN NOT NULL DEFAULT false,
    "hasGovernmentPartnership" BOOLEAN NOT NULL DEFAULT false,
    "isNonProfit" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_areas" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "area" "TenantServiceArea" NOT NULL,

    CONSTRAINT "tenant_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_board_members" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "boardTermId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "role" "BoardRoleType" NOT NULL,
    "title" VARCHAR(150),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_board_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_board_terms" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(150),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_board_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_documents" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "boardTermId" UUID,
    "type" "TenantDocumentType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "fileUrl" VARCHAR(500) NOT NULL,
    "fileName" VARCHAR(255),
    "mimeType" VARCHAR(100),
    "documentDate" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(100) NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RoleType" NOT NULL,
    "description" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedBy" UUID,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permission" "PermissionType" NOT NULL,
    "resource" TEXT,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audits" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "AuditType" NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "people_userId_key" ON "people"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_legalName_key" ON "tenants"("legalName");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_registrationNumber_key" ON "tenants"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_registrationNumber_idx" ON "tenants"("registrationNumber");

-- CreateIndex
CREATE INDEX "tenants_category_idx" ON "tenants"("category");

-- CreateIndex
CREATE INDEX "tenants_primaryServiceArea_idx" ON "tenants"("primaryServiceArea");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenant_areas_area_idx" ON "tenant_areas"("area");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_areas_tenantId_area_key" ON "tenant_areas"("tenantId", "area");

-- CreateIndex
CREATE INDEX "tenant_board_members_tenantId_role_idx" ON "tenant_board_members"("tenantId", "role");

-- CreateIndex
CREATE INDEX "tenant_board_members_boardTermId_idx" ON "tenant_board_members"("boardTermId");

-- CreateIndex
CREATE INDEX "tenant_board_members_personId_idx" ON "tenant_board_members"("personId");

-- CreateIndex
CREATE INDEX "tenant_board_terms_tenantId_startDate_endDate_idx" ON "tenant_board_terms"("tenantId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "tenant_documents_tenantId_type_idx" ON "tenant_documents"("tenantId", "type");

-- CreateIndex
CREATE INDEX "tenant_documents_boardTermId_idx" ON "tenant_documents"("boardTermId");

-- CreateIndex
CREATE INDEX "tenant_documents_isPublic_idx" ON "tenant_documents"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permission_resource_key" ON "role_permissions"("roleId", "permission", "resource");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_addresses" ADD CONSTRAINT "person_addresses_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_addresses" ADD CONSTRAINT "person_addresses_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_documents" ADD CONSTRAINT "person_documents_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_areas" ADD CONSTRAINT "tenant_areas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_board_members" ADD CONSTRAINT "tenant_board_members_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_board_members" ADD CONSTRAINT "tenant_board_members_boardTermId_fkey" FOREIGN KEY ("boardTermId") REFERENCES "tenant_board_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_board_members" ADD CONSTRAINT "tenant_board_members_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_board_terms" ADD CONSTRAINT "tenant_board_terms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_documents" ADD CONSTRAINT "tenant_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_documents" ADD CONSTRAINT "tenant_documents_boardTermId_fkey" FOREIGN KEY ("boardTermId") REFERENCES "tenant_board_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
