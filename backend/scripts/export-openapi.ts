import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';

async function exportOpenApi() {
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'development';

  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Study API')
    .setDescription('Documentação da API do projeto')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  try {
    const document = SwaggerModule.createDocument(app, config);
    const out = JSON.stringify(document, null, 2);
    writeFileSync('openapi.json', out, { encoding: 'utf-8' });
    console.log('openapi.json exported');
  } catch (err: any) {
    const payload = { error: String(err?.message ?? err) };
    writeFileSync('openapi.error.json', JSON.stringify(payload, null, 2), { encoding: 'utf-8' });
    console.error('failed to export openapi', err);
  }

  await app.close();
}

exportOpenApi().catch((err) => {
  console.error('failed to export openapi', err);
  process.exit(1);
});
