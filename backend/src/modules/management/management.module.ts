import { Module } from '@nestjs/common';
import { PlatformAuthModule } from '@core/platform-auth/platform-auth.module';
import { ManagementService } from './management.service';
import { ManagementController } from './management.controller';

@Module({
  imports: [PlatformAuthModule],
  providers: [ManagementService],
  controllers: [ManagementController],
})
export class ManagementModule {}
