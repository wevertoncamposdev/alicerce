// app/(app)/develop/detail-showcase/layout.tsx
//
// `registerModule` (core/registry) joga se chamado duas vezes com o mesmo `model` — com
// page.tsx e [id]/page.tsx cada um importando "@modules/develop/showcase/contract" direto,
// o Turbopack às vezes bundla os dois em módulos de rota separados e o side-effect roda
// duas vezes. Centralizar o import aqui (layout compartilhado pelas duas rotas) garante
// um registro só.
import "@modules/develop/showcase/contract";

export default function DetailShowcaseLayout({ children }: { children: React.ReactNode }) {
    return children;
}
