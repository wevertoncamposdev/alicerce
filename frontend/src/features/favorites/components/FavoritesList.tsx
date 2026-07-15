'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { FavoriteEntity } from '@/features/favorites/favorite.types';
import { FavoritesDeleteButton } from '@/features/favorites/components/FavoritesDeleteButton';


interface FavoritesListProps {
    favorites: FavoriteEntity[];
}

/**
 * Lista de favoritos com suporte a edição inline e deleção por item.
 * Recebe os dados via props do Server Component pai (page.tsx).
 *
 * O estado de edição (editingId) é local — só controla qual item
 * exibe o form de edição. Após salvar, revalidatePath na action
 * rebusca os dados sem precisar de reload() manual aqui.
 */
export function FavoritesList({ favorites }: FavoritesListProps) {
    const [editingId, setEditingId] = useState<string | null>(null);

    if (favorites.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                        Nenhum favorito cadastrado ainda.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Lista de favoritos</CardTitle>
            </CardHeader>

            <CardContent>
                <div className="space-y-3">
                    {favorites.map((fav) =>
                        editingId === fav.id ? (
                            <div
                                key={fav.id}
                                className="rounded-lg border border-blue-200 bg-blue-50/40 p-4"
                            >

                            </div>
                        ) : (
                            <div
                                key={fav.id}
                                className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/40 transition"
                            >
                                <div className="flex flex-col gap-1 min-w-0">
                                    <p className="font-medium truncate">{fav.title}</p>
                                    <a
                                        href={fav.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-500 hover:underline break-all"
                                    >
                                        {fav.url}
                                    </a>
                                </div>

                                <div className="flex gap-2 ml-4 shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingId(fav.id)}
                                    >
                                        Editar
                                    </Button>
                                    <FavoritesDeleteButton id={fav.id} />
                                </div>
                            </div>
                        ),
                    )}
                </div>
            </CardContent>
        </Card>
    );
}