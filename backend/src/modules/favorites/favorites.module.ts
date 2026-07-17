import { Module } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { FavoriteNotesController } from './notes/favorite-notes.controller';
import { FavoriteNotesService } from './notes/favorite-notes.service';

@Module({
  controllers: [FavoritesController, FavoriteNotesController],
  providers: [FavoritesService, FavoriteNotesService],
})
export class FavoritesModule { }
