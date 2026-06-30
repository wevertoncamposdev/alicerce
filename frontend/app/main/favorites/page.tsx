'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Favorite = {
    id: string;
    title: string;
    url: string;
    createdAt: string;
};

export default function FavoritesPage() {
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);

    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [saving, setSaving] = useState(false);

    // LISTAR
    async function loadFavorites() {
        try {
            const data = await apiRequest<Favorite[]>('/favorites', {
                headers: {
                    'X-Source': 'favorites/list',
                },
                method: 'GET',
            });

            setFavorites(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Erro ao carregar favoritos', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!title.trim() || !url.trim()) return;

        try {
            setSaving(true);

            await apiRequest('/favorites', {
                method: 'POST',
                body: {
                    title,
                    url,
                },
            });

            setTitle('');
            setUrl('');

            await loadFavorites();
        } catch (err) {
            console.error('Erro ao criar favorito', err);
        } finally {
            setSaving(false);
        }
    }

    useEffect(() => {
        loadFavorites();
    }, []);

    if (loading) {
        return (
            <div className="p-6 text-sm text-muted-foreground">
                Carregando favoritos...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* HEADER */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Meus Favoritos
                </h1>
                <p className="text-muted-foreground">
                    Gerencie seus links salvos no sistema
                </p>
            </div>

            {/* FORM */}
            <Card>
                <CardHeader>
                    <CardTitle>Novo favorito</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Documentação NestJS"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>URL</Label>
                            <Input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>

                        <Button type="submit" disabled={saving}>
                            {saving ? 'Salvando...' : 'Adicionar favorito'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* LISTA */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de favoritos</CardTitle>
                </CardHeader>

                <CardContent>
                    {favorites.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Nenhum favorito cadastrado ainda.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {favorites.map((fav) => (
                                <div
                                    key={fav.id}
                                    className="p-4 border rounded-lg hover:bg-muted/40 transition"
                                >
                                    <div className="flex flex-col gap-1">
                                        <p className="font-medium">{fav.title}</p>

                                        <a
                                            href={fav.url}
                                            target="_blank"
                                            className="text-sm text-blue-500 hover:underline break-all"
                                        >
                                            {fav.url}
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}