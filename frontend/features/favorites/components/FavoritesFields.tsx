'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FavoritesFieldsProps {
    defaultTitle?: string;
    defaultUrl?: string;
    disabled?: boolean;
}

/**
 * Campos compartilhados entre FavoritesCreateForm e FavoritesEditForm.
 * Sem lógica de submit — é responsabilidade do form pai.
 */
export function FavoritesFields({
    defaultTitle = '',
    defaultUrl = '',
    disabled = false,
}: FavoritesFieldsProps) {
    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="Título do favorito"
                    defaultValue={defaultTitle}
                    required
                    disabled={disabled}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                    id="url"
                    name="url"
                    type="url"
                    placeholder="https://exemplo.com"
                    defaultValue={defaultUrl}
                    required
                    disabled={disabled}
                />
            </div>
        </>
    );
}
