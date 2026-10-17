import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaBootstrapService } from './prisma-bootstrap.service';

@Global()
@Module({
  providers: [PrismaService, PrismaBootstrapService],
  exports: [PrismaService, PrismaBootstrapService],
})
export class PrismaModule {}
