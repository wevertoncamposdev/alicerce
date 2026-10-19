import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { FilesService } from './file.service';

// Sem `@Permissions` — upload é infraestrutura genérica disponível para
// qualquer usuário autenticado, não um recurso de domínio com permissão
// própria (ver ADR 0010). `RolesPermissionsGuard` ainda roda (resolve
// `request.user`), só não exige nenhuma permissão específica aqui.
@Controller('files')
@UseGuards(RolesPermissionsGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  async upload(
    @Req() req: FastifyRequest,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    const part = await req.file();
    if (!part) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const data = await part.toBuffer();
    // `ownerType` precisa vir ANTES do arquivo no multipart (ver
    // ImageFieldInput.tsx) — @fastify/multipart só acumula em `.fields` os
    // campos lidos antes do primeiro arquivo encontrado.
    const ownerTypeField = part.fields.ownerType;
    const ownerType =
      ownerTypeField &&
      !Array.isArray(ownerTypeField) &&
      ownerTypeField.type === 'field'
        ? String(ownerTypeField.value)
        : 'generic';

    return this.filesService.upload({
      data,
      mime: part.mimetype,
      ownerType,
      tenantId,
      uploadedById: userId,
    });
  }

  @Get(':id/url')
  getUrl(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.filesService.getSignedUrl(id, tenantId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    await this.filesService.remove(id, tenantId, userId);
  }
}
