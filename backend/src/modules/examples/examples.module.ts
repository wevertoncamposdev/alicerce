import { Module } from '@nestjs/common';
import { ExamplesService } from './examples.service';
import { ExamplesController } from './examples.controller';
import { ExampleNotesController } from './features/notes/example-notes.controller';
import { ExampleNotesService } from './features/notes/example-notes.service';

@Module({
  controllers: [ExamplesController, ExampleNotesController],
  providers: [ExamplesService, ExampleNotesService],
})
export class ExamplesModule {}
