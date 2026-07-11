import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Prisma } from '@core/prisma/generated/client';
import { TenantBusinessRules } from './domain/rules/tenant-business-rules';
import { TenantErrorCode } from './domain/errors/tenant-error-codes';
import { TenantErrorMapper } from './mappers/tenant-error.mapper';
import { TenantRepository } from './persistence/repository/tenant.repository';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantBusinessRules: TenantBusinessRules,
    private readonly tenantErrorMapper: TenantErrorMapper,
  ) { }

  async create(createTenantDto: CreateTenantDto) {
    try {
      const {
        foundedAt: foundedAtRaw,
        closedAt: closedAtRaw,
        ...rest
      } = createTenantDto;

      const foundedAt = this.tenantBusinessRules.parseDate(foundedAtRaw);
      const closedAt = this.tenantBusinessRules.parseDate(closedAtRaw);

      this.tenantBusinessRules.validateDateRange(foundedAt, closedAt);

      const data: Prisma.TenantCreateInput = {
        ...rest,
        foundedAt,
        closedAt,
      };

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

  async findOne(id: string) {
    this.tenantBusinessRules.validateTenantId(id);

    try {
      const tenant = await this.tenantRepository.findById(id);

      if (!tenant) {
        throw new NotFoundException({
          message: 'Tenant não encontrado',
          code: TenantErrorCode.NOT_FOUND,
          details: { id },
        });
      }

      return tenant;
    } catch (error) {
      this.tenantErrorMapper.mapAndThrow(error, 'findOne');
    }
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    this.tenantBusinessRules.validateTenantId(id);

    try {
      const {
        foundedAt: foundedAtRaw,
        closedAt: closedAtRaw,
        ...rest
      } = updateTenantDto;

      const foundedAt = this.tenantBusinessRules.parseDate(foundedAtRaw);
      const closedAt = this.tenantBusinessRules.parseDate(closedAtRaw);

      this.tenantBusinessRules.validateDateRange(foundedAt, closedAt);

      const data: Prisma.TenantUpdateInput = {
        ...rest,
        foundedAt,
        closedAt,
      };

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
}
