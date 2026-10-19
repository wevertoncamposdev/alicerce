import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from '@core/auth/auth.guard';
import { verifyLocalKeySignature } from '@core/storage/local-signed-url.util';

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

// Só existe pro driver "local" (ver LocalDiskStorageProvider.getSignedUrl)
// — com STORAGE_DRIVER=s3 a URL assinada aponta direto pro provedor,
// nunca passa por aqui. @Public(): a autorização é a própria assinatura
// HMAC na query string, não um Bearer token (um <img src> não manda header).
@Controller('storage/local')
export class LocalStorageController {
  @Public()
  @Get(':key')
  download(
    @Param('key') key: string,
    @Query('exp') expRaw: string,
    @Query('sig') sig: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const exp = Number(expRaw);
    if (!verifyLocalKeySignature(key, exp, sig)) {
      throw new ForbiddenException('Link expirado ou inválido');
    }

    const basePath = path.resolve(
      process.env.STORAGE_LOCAL_PATH ?? './storage',
    );
    const filePath = path.resolve(basePath, key);

    // `key` só é gerado por este backend (randomUUID + extensão fixa, nunca
    // input de usuário) — path.resolve não deveria escapar de basePath aqui,
    // mas confere mesmo assim: defesa em profundidade.
    if (!filePath.startsWith(basePath)) {
      throw new BadRequestException('Chave inválida');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Arquivo não encontrado');
    }

    const extension = key.split('.').pop() ?? '';
    res.type(MIME_BY_EXTENSION[extension] ?? 'application/octet-stream');

    return fs.createReadStream(filePath);
  }
}
