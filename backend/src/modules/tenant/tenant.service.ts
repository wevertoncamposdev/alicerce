import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Prisma } from '@core/prisma/generated/client';
import { TenantBusinessRules } from './domain/rules/tenant-business-rules';
import { TenantErrorCode } from './domain/errors/tenant-error-codes';
import { TenantErrorMapper } from './mappers/tenant-error.mapper';
import { TenantRepository } from './persistence/repository/tenant.repository';
import { SearchTenantsDto } from './dto/search-tenant.dto';
import { FilesService } from '@core/files/file.service';
import { isValidDocumentForType } from '@core/common/validators/is-document.validator';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantBusinessRules: TenantBusinessRules,
    private readonly tenantErrorMapper: TenantErrorMapper,
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async create(createTenantDto: CreateTenantDto) {
    try {
      const data: Prisma.TenantCreateInput = { ...createTenantDto };

      return await this.tenantRepository.create(data);
    } catch (error) {
      this.tenantErrorMapper.mapAndThrow(error, 'create');
    }
  }

  async findAll() {
    try {
      return await this.tenantRepository.findMany();
    } catch (error) {
      this.tenantErrorMapper.mapAndThrow(error, 'findAll');
    }
  }

  private assertOwnTenant(id: string, requestTenantId: string) {
    if (id !== requestTenantId) {
      throw new NotFoundException({
        message: 'Tenant não encontrado',
        code: TenantErrorCode.NOT_FOUND,
        details: { id },
      });
    }
  }

  async findOne(id: string, requestTenantId: string) {
    this.tenantBusinessRules.validateTenantId(id);
    this.assertOwnTenant(id, requestTenantId);

    try {
      const tenant = await this.tenantRepository.findById(id);

      if (!tenant) {
        throw new NotFoundException({
          message: 'Tenant não encontrado',
          code: TenantErrorCode.NOT_FOUND,
          details: { id },
        });
      }

      const logoUrl = tenant.logoFileId
        ? await this.filesService.getSignedUrlOrNull(
            tenant.logoFileId,
            requestTenantId,
          )
        : null;

      return { ...tenant, logoUrl };
    } catch (error) {
      this.tenantErrorMapper.mapAndThrow(error, 'findOne');
    }
  }

  // `requesterId` só vem de /tenant/current (ver TenantController) — a
  // checagem de posse do `logoFileId` (ver ADR 0010) só se aplica ao
  // self-service; a rota admin /tenant/:id (reservada pro management
  // futuro, Fase 11) não passa esse parâmetro.
  async update(
    id: string,
    updateTenantDto: UpdateTenantDto,
    requestTenantId: string,
    requesterId?: string,
  ) {
    this.tenantBusinessRules.validateTenantId(id);
    this.assertOwnTenant(id, requestTenantId);

    if (updateTenantDto.logoFileId && requesterId) {
      await this.filesService.assertUploadedBy(
        updateTenantDto.logoFileId,
        requestTenantId,
        requesterId,
      );
    }

    try {
      const existing = await this.tenantRepository.findById(id);
      if (!existing) {
        throw new NotFoundException({
          message: 'Tenant não encontrado',
          code: TenantErrorCode.NOT_FOUND,
          details: { id },
        });
      }

      // D4 (docs/PLAN-fundacao-ux.md): o DTO só vê o payload parcial deste
      // PATCH — um PATCH que manda só `document` (sem `documentType`) não
      // tem como validar o dígito verificador sozinho. Mescla com o
      // registro já salvo antes de validar, pra cobrir exatamente esse caso.
      const merged = { ...existing, ...updateTenantDto };
      if (!isValidDocumentForType(merged.documentType, merged.document)) {
        throw new BadRequestException({
          message: 'Documento inválido para o tipo selecionado.',
          code: TenantErrorCode.DOCUMENT_INVALID,
          details: {
            errors: [
              {
                field: 'document',
                message: 'Documento inválido para o tipo selecionado.',
              },
            ],
          },
        });
      }

      const data: Prisma.TenantUpdateInput = { ...updateTenantDto };

      return await this.tenantRepository.updateById(id, data);
    } catch (error) {
      this.tenantErrorMapper.mapAndThrow(error, 'update');
    }
  }

  async remove(id: string) {
    this.tenantBusinessRules.validateTenantId(id);

    try {
      await this.tenantRepository.deleteById(id);
      return {
        message: 'Tenant removido com sucesso',
        code: TenantErrorCode.REMOVED,
      };
    } catch (error) {
      this.tenantErrorMapper.mapAndThrow(error, 'remove');
    }
  }

  async search(query: SearchTenantsDto) {
    const page =
      query.pagination?.pageIndex !== undefined
        ? query.pagination.pageIndex + 1
        : 1;
    const limit = query.pagination?.pageSize ?? 20;

    const where: Prisma.TenantWhereInput = query.searchText
      ? {
          OR: [
            { legalName: { contains: query.searchText, mode: 'insensitive' } },
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

  async findUsersOfTenant(tenantId: string, requestTenantId: string) {
    this.assertOwnTenant(tenantId, requestTenantId);

    return this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRolesOfTenant(tenantId: string, requestTenantId: string) {
    this.assertOwnTenant(tenantId, requestTenantId);

    return this.prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }
}
