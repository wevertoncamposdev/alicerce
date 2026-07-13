import { NextResponse } from 'next/server';
import { getFavorites } from '@/features/favorites/server/favorites.queries';
import { CreateFavoritePayload } from '@/features/favorites/favorite.types';
import { apiServer } from '@/lib/api-server';

export async function GET() {
    const favorites = await getFavorites();
    return NextResponse.json(favorites);
}

export async function POST(request: Request) {
    const body: CreateFavoritePayload = await request.json();
    const response = await apiServer.post<CreateFavoritePayload>('favorites', body);
    return NextResponse.json(response);
}