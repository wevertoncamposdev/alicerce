import { SideShell } from "@core/components/Layout/SideShell";

// Conteúdo placeholder — o Alicerce é um template: cada produto substitui
// este texto pelos seus Termos de Uso e Política de Privacidade reais
// antes de ir pra produção (ver Plano Base.md, etapa 9.1).
export default function TermsPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <SideShell
          title="Termos de Uso e Política de Privacidade"
          description="Conteúdo de exemplo — substitua pelo texto real do seu produto antes de ir pra produção."
        >
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Este é um texto placeholder. Ao criar sua conta, você concorda com os
              termos que a sua instituição definir para o uso desta plataforma e com o
              tratamento dos seus dados pessoais conforme a Lei Geral de Proteção de
              Dados (LGPD).
            </p>
            <p>
              Substitua este conteúdo pelos Termos de Uso e pela Política de
              Privacidade reais do seu produto.
            </p>
          </div>
        </SideShell>
      </div>
    </div>
  );
}
