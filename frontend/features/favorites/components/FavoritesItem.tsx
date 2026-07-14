import { Favorite } from '@/features/favorites/favorite.types';
import { FavoriteDetailButton } from './FavoriteDetailButton';
import { FavoritesDeleteButton } from './FavoritesDeleteButton';
import Link from 'next/link';
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
        <Item variant="outline" className="mb-2 hover:bg-gray-100" >
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
    );
}