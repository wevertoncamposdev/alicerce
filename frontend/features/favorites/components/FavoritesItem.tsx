import { Favorite } from '@/features/favorites/favorite.types';
import { FavoriteDetailButton } from './FavoriteDetailButton';
import { FavoritesDeleteButton } from './FavoritesDeleteButton';
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item"


export function FavoriteItem({ favorite }: { favorite: Favorite }) {

    return (

        <div className="flex w-full">
            <Item variant="outline">
                <ItemContent>
                    <ItemTitle>{favorite.title}</ItemTitle>
                    <ItemDescription>
                        <a href={favorite.url} target="_blank" >
                            {favorite.url}
                        </a>
                    </ItemDescription>
                </ItemContent>
                <ItemActions>
                    <FavoriteDetailButton id={favorite.id} />
                    <FavoritesDeleteButton id={favorite.id} />
                </ItemActions>
            </Item>

        </div>

    );
}