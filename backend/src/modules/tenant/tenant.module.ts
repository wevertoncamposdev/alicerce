import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantBusinessRules } from './domain/rules/tenant-business-rules';
import { TenantErrorMapper } from './mappers/tenant-error.mapper';
import { TenantRepository } from './persistence/repository/tenant.repository';
import { FileModule } from '@core/files/file.module';

@Module({
  imports: [FileModule],
  controllers: [TenantController],
  providers: [
    TenantService,
    TenantBusinessRules,
    TenantRepository,
    TenantErrorMapper,
  ],
  exports: [TenantService],
})
export class TenantModule {}
