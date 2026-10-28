import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
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
  getUrl(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.filesService.getSignedUrl(id, tenantId);
  }

  // D6 (docs/PLAN-fundacao-ux.md): servido same-origin via proxy BFF
  // (buildFileContentUrl), nunca a URL direta do storage provider.
  // `@Res()` sem passthrough — controle manual total, mais simples que
  // misturar redirect com o pipeline normal de resposta do Nest.
  @Get(':id/content')
  async getContent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
    @Res() res: FastifyReply,
  ) {
    const content = await this.filesService.getContent(id, tenantId);

    if (content.kind === 'redirect') {
      res.redirect(content.url, 302);
      return;
    }

    res.type(content.mime);
    res.send(content.data);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    await this.filesService.remove(id, tenantId, userId);
  }
}
