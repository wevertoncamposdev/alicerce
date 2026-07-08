
import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from '@core/prisma/prisma.module';
import { AuditInterceptor } from '@core/common/interceptors/audit.interceptor';

@Module({
  imports: [PrismaModule],
  providers: [AuditService, AuditInterceptor],
  controllers: [AuditController],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
