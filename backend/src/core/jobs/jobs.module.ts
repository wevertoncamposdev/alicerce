import { Module } from '@nestjs/common';
import { CleanupJobsService } from './cleanup-jobs.service';

@Module({
  providers: [CleanupJobsService],
})
export class JobsModule {}
