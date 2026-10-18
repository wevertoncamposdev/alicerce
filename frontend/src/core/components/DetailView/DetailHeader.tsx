// components/DetailView/DetailHeader.tsx
import * as React from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";
import { Card } from "@components/ui/card";
import { Button } from "@components/ui/button";
import type { DetailHeaderConfig } from "@core/registry/types";

type DetailHeaderProps = {
    config: DetailHeaderConfig;
    moduleLabel: string;
    /** Quando presente, renderiza o botão "Editar" apontando pra cá (gate de permissão já resolvido pelo chamador). */
    editHref?: string;
    /** Trigger do MetaDataSidebar, já no formato ícone — entra depois de `actions`. */
    metadataSidebar?: React.ReactNode;
    /** `TabsList` pronto (Visão geral + abas do módulo) — o estado de aba é do Tabs que envolve este componente. */
    tabsList?: React.ReactNode;
};

export function DetailHeader({ config, moduleLabel, editHref, metadataSidebar, tabsList }: DetailHeaderProps) {
    const { title, subtitle, avatar, status, contacts, actions } = config;

    return (
        <div className="space-y-2">
            <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
                {moduleLabel}
                <span className="mx-2">/</span>
                {title}
            </nav>

            <Card className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                    {avatar ? (
                        <Avatar className="size-20">
                            {avatar.src ? <AvatarImage src={avatar.src} alt="" /> : null}
                            <AvatarFallback className="text-lg">{avatar.fallback}</AvatarFallback>
                        </Avatar>
                    ) : null}

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                            {status}
                        </div>

                        {subtitle?.length ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {subtitle.map((item, index) => (
                                    <React.Fragment key={index}>
                                        {index > 0 ? <span className="mx-2">•</span> : null}
                                        {item}
                                    </React.Fragment>
                                ))}
                            </p>
                        ) : null}

                        {contacts?.length ? (
                            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                {contacts.map((contact, index) => {
                                    const Icon = contact.icon;
                                    const inner = (
                                        <>
                                            <Icon className="size-4 text-muted-foreground" />
                                            {contact.text}
                                        </>
                                    );
                                    return contact.href ? (
                                        <a
                                            key={index}
                                            href={contact.href}
                                            className="inline-flex items-center gap-1.5 hover:underline"
                                        >
                                            {inner}
                                        </a>
                                    ) : (
                                        <span key={index} className="inline-flex items-center gap-1.5">
                                            {inner}
                                        </span>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:ml-auto sm:flex-row">
                        {editHref ? (
                            <Button asChild size="sm">
                                <Link href={editHref}>
                                    <Pencil className="size-3.5" />
                                    <span className="hidden sm:inline">Editar</span>
                                </Link>
                            </Button>
                        ) : null}
                        {actions}
                        {metadataSidebar}
                    </div>
                </div>

                {tabsList ? <div className="mt-6 -mb-6 border-t">{tabsList}</div> : null}
            </Card>
        </div>
    );
}
