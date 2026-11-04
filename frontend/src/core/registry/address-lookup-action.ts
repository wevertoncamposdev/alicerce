'use server';
// core/registry/address-lookup-action.ts
//
// U4 (docs/PLAN-fundacao-ux.md): busca de endereço opcional do tipo `cep`
// (FormView.tsx, CepFieldInput). Roda como Server Action — o fetch pro
// ViaCEP acontece no servidor, nunca no browser, então não precisa entrar
// no `connect-src` da CSP (`proxy.ts`, fora do escopo de `core/` autorizado
// pro U4 pelo ADR 0014). Serviço público, sem chave/autenticação.

export type CepAddress = {
    street: string;
    neighborhood: string;
    city: string;
    state: string;
};

export async function lookupCepAction(cep: string): Promise<CepAddress | null> {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return null;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (!response.ok) return null;

        const data = (await response.json()) as {
            erro?: boolean;
            logradouro?: string;
            bairro?: string;
            localidade?: string;
            uf?: string;
        };
        if (data.erro) return null;

        return {
            street: data.logradouro ?? "",
            neighborhood: data.bairro ?? "",
            city: data.localidade ?? "",
            state: data.uf ?? "",
        };
    } catch (err) {
        console.error("[lookupCepAction]", err);
        return null;
    }
}
