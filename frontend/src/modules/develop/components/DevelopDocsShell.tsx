// modules/develop/components/DevelopDocsShell.tsx
// Composição da página de documentação. Server Component — todo o conteúdo é estático
// e renderiza no servidor; apenas a navegação lateral (scroll-spy) é client.

import { AppTopbar } from "@/components/Layout/AppTopbar";
import { DevelopDocsNav } from "@modules/develop/components/DevelopDocsNav";
import { DEVELOP_DOC_NAV } from "@modules/develop/content/nav-config";
import {
    VisaoGeralSection,
    MultiTenantSection,
    AuthJwtSection,
} from "@modules/develop/content/part1-fundamentos";
import { RbacSection } from "@modules/develop/content/part2-rbac";
import {
    TaxonomiaSection,
    GuiaCriarModuloSection,
    ChecklistSection,
} from "@modules/develop/content/part3-modulos";
import {
    ArmadilhasSection,
    EstadoAtualSection,
    GlossarioSection,
} from "@modules/develop/content/part4-referencia";

export function DevelopDocsShell() {
    return (
        <>
            <AppTopbar title="Documentação para desenvolvedores" />
            <div className="mx-auto flex max-w-6xl gap-10 px-4 py-6 lg:px-8">
                <DevelopDocsNav groups={DEVELOP_DOC_NAV} />
                <div className="min-w-0 flex-1">
                    <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
                        Guia de manutenção e evolução do Alicerce: como o framework funciona por baixo dos
                        panos (tenant, autenticação, RBAC) e como estender o sistema com módulos novos
                        seguindo os mesmos padrões do módulo <code>favorites</code>.
                    </p>

                    <VisaoGeralSection />
                    <MultiTenantSection />
                    <AuthJwtSection />
                    <RbacSection />

                    <TaxonomiaSection />
                    <GuiaCriarModuloSection />
                    <ChecklistSection />

                    <ArmadilhasSection />
                    <EstadoAtualSection />
                    <GlossarioSection />
                </div>
            </div>
        </>
    );
}
