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
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { MultipartFields } from '@fastify/multipart';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { FilesService } from './file.service';

function readMultipartField(
  fields: MultipartFields,
  name: string,
): string | undefined {
  const field = fields[name];
  const entry = Array.isArray(field) ? field[0] : field;
  return entry && entry.type === 'field' ? String(entry.value) : undefined;
}

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
    // `ownerType`/`ownerId` precisam vir ANTES do arquivo no multipart (ver
    // FormView.tsx/ImageFieldInput.tsx) — @fastify/multipart só acumula em
    // `.fields` os campos lidos antes do primeiro arquivo encontrado.
    const ownerType = readMultipartField(part.fields, 'ownerType') ?? 'generic';
    // U6 (docs/PLAN-fundacao-ux.md): anexo de registro (aba Anexos do
    // drawer) manda `ownerId` — avatar/logo não mandam (a posse é
    // resolvida do outro lado, User.avatarFileId/Tenant.logoFileId).
    const ownerId = readMultipartField(part.fields, 'ownerId');

    return this.filesService.upload({
      data,
      mime: part.mimetype,
      originalName: part.filename,
      ownerType,
      ownerId,
      tenantId,
      uploadedById: userId,
    });
  }

  // U6: aba Anexos do drawer de metadados — ver `FilesService.listForOwner`.
  @Get()
  listForOwner(
    @Query('ownerType') ownerType: string,
    @Query('ownerId', new ParseUUIDPipe()) ownerId: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.filesService.listForOwner(ownerType, ownerId, tenantId, userId);
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

    // Mitiga MIME-sniffing do navegador se os bytes não baterem exatamente
    // com `content.mime` — relevante ao servir same-origin (buildFileContentUrl).
    res.header('X-Content-Type-Options', 'nosniff');
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
