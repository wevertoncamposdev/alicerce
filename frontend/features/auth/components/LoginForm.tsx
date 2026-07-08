'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@/components/ui/index';
import { login } from '../actions/login.action';

const initialState = { error: null as string | null };

export function LoginForm() {
    const [state, formAction, isPending] = useActionState(login, initialState);

    return (
        <>
            <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                        E-mail
                    </label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="voce@exemplo.com"
                        required
                        disabled={isPending}
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                        Senha
                    </label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Sua senha"
                        required
                        disabled={isPending}
                    />
                </div>

                {state.error ? (
                    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {state.error}
                    </div>
                ) : null}

                <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? "Entrando..." : "Entrar"}
                </Button>
            </form>

            <div className="mt-6 border-t pt-4">
                <p className="text-center text-sm text-zinc-600">
                    Não tem conta?{" "}
                    <Link href="/auth/register" className="font-medium text-zinc-900 hover:underline">
                        Registre-se aqui
                    </Link>
                </p>
            </div>
        </>
    );
}