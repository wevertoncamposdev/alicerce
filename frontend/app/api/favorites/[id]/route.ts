import { NextResponse } from 'next/server';
import { getFavorites } from '@/features/favorites/server/favorites.queries';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const favorites = await getFavorites();
  const favorite = favorites.find((f) => f.id === id);

  if (!favorite) {
    return NextResponse.json({ message: 'Não encontrado' }, { status: 404 });
  }

  return NextResponse.json(favorite);
}