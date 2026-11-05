# Repo

1. Criar o repositório (uma vez)
No GitHub: criar terceirogestor vazio (sem README/.gitignore/license — para não ter um commit inicial estranho ao histórico do Alicerce).

No clone atual do Alicerce (c:\development\study):

git remote add terceirogestor <https://github.com/wevertoncamposdev/terceirogestor.git>
git push terceirogestor v1.1.0:main    # cria "main" no novo repo, já na tag v1.1.0
git push terceirogestor v1.1.0:develop # mesma base em "develop" (ver branch strategy, passo 3)
git push terceirogestor v1.1.0         # leva a tag também, por referência
git remote remove terceirogestor       # não precisa ficar no clone do Alicerce
2. Clonar o novo repositório como working copy própria

git clone <https://github.com/wevertoncamposdev/terceirogestor.git> C:\development\terceirogestor
cd C:\development\terceirogestor
git remote add upstream <https://github.com/wevertoncamposdev/alicerce.git>
git fetch upstream
Esse upstream é o "cano" por onde as atualizações futuras do Alicerce vão entrar.

1. Replicar a estratégia de branches do Alicerce (ADR 0001)
Mesmo papel, mesmas regras: main = produção, só recebe merge de develop via PR, com checkpoint verde; develop = integração, todo trabalho de módulo novo acontece aqui. Já criei as duas acima, apontando pra v1.1.0. Trabalhe em develop (ou branches feat/<escopo> a partir dela) — nunca commit direto em main.

2. Day 1 — ajustes cosméticos (fazer antes de criar o 1º módulo)
Mesmo checklist que o Alicerce fez ao nascer (docs/historico/Alicerce v1.0.md):

package.json (raiz, backend/, frontend/): campo name.
README.md, título/descrição.
.env.example: placeholders específicos (nada de segredo real).
AGENTS.md/CLAUDE.md: adaptar a seção 1 ("O que é") pro domínio real (ONG), mantendo intactas as seções 2–7 (elas descrevem a base do Alicerce, que aqui também vale).
Fazer isso em um commit só, pequeno e isolado — assim, merges futuros do upstream quase nunca tocam essas linhas de novo.

1. Fluxo de atualização (o "pacote atualiza" de verdade)
Quando o Alicerce evoluir e você quiser trazer pro TerceiroGestor — recomendo por tag, não pela ponta de develop/main, pra cada atualização ser um evento deliberado e revisável (mesmo espírito da "janela mensal" do AGENTS.md §2):

cd C:\development\terceirogestor
git checkout develop
git fetch upstream
git merge upstream/v1.2.0        # ou a tag que o Alicerce tiver lançado
Resolva conflitos se houver (raro, se core/ nunca foi editado aqui), rode o checkpoint completo, e só então git push origin develop → PR pra main.

1. A regra que faz isso funcionar
Nunca editar core/ nem scripts/new-module.mjs no TerceiroGestor (a mesma regra do AGENTS.md §2, agora valendo entre repositórios, não só dentro de um). Se algo de lá não serve, é motivo pra voltar e editar no Alicerce primeiro, dar merge pra main/tag nova, e só depois trazer pro TerceiroGestor — assim o merge futuro nunca tem conflito de verdade, só arquivos novos chegando.

Quer que eu já prepare esse commit "Day 1" de rename aqui no Alicerce como um exemplo/checklist em docs/, ou isso já resolve?
