import { Module } from '@nestjs/common';
import { NotesModule } from './notes/notes.module';
import { TagsModule } from './tags/tags.module';

// U6 (docs/PLAN-fundacao-ux.md, ADR 0014) — barrel dos dois submódulos
// de metadados genéricos. Anexos não entram aqui: reusam `core/files`
// (ver `file.controller.ts`/`file.service.ts`).
@Module({
  imports: [NotesModule, TagsModule],
  exports: [NotesModule, TagsModule],
})
export class MetadataModule {}
