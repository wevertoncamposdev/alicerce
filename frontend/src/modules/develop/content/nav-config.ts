// modules/develop/content/nav-config.ts
import type { DocNavGroup } from "@modules/develop/components/DevelopDocsNav";

export const DEVELOP_DOC_NAV: DocNavGroup[] = [
    {
        title: "Fundamentos",
        items: [
            { id: "visao-geral", label: "Visão geral" },
            { id: "multi-tenant", label: "Multi-tenant" },
            { id: "auth-jwt", label: "Auth & JWT" },
            { id: "rbac", label: "Users, Roles, Permissions" },
        ],
    },
    {
        title: "Módulos",
        items: [
            { id: "taxonomia", label: "Taxonomia de entidade" },
            { id: "guia-modulo", label: "Criando um módulo" },
            { id: "checklist", label: "Checklist" },
        ],
    },
    {
        title: "Referência",
        items: [
            { id: "armadilhas", label: "Armadilhas conhecidas" },
            { id: "estado-atual", label: "Estado atual / pendências" },
            { id: "glossario", label: "Glossário" },
        ],
    },
];
