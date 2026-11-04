# Guia — iniciar e manter um produto a partir do Alicerce

> Para quem está criando um **produto** novo (ex.: TerceiroGestor) usando esta
> base. Mecanismo, documentado uma vez aqui, reutilizável por qualquer produto
> futuro — **zero conteúdo de domínio** entra neste guia ou neste repositório.
> O conteúdo real do produto (nome, README, descrição do domínio) só existe
> no repositório do produto.

## 1. Por que um repositório separado, não um fork solto

O Alicerce é a base (auth, tenant, RBAC, auditoria, gerador, UI). Um produto
real evolui duas coisas que não cabem aqui: domínio (módulos) e identidade
(nome, README, deploy). Mas o produto precisa continuar recebendo correção/
evolução da base sem reescrever nada à mão — por isso o repositório do
produto nasce com o **mesmo histórico git** do Alicerce (não um fork do
GitHub, não "copiar a pasta"), e mantém esta base como um remoto (`upstream`)
pra sempre poder trazer atualização via `git merge`.

## 2. Criar o repositório do produto (uma vez)

No GitHub: criar o repositório do produto **vazio** (sem README/.gitignore/
license — evita um commit inicial estranho ao histórico do Alicerce).

Num clone deste repositório (Alicerce):

```bash
git remote add <produto> https://github.com/<org>/<produto>.git
git push <produto> <tag-de-release>:main
git push <produto> <tag-de-release>:develop
git push <produto> <tag-de-release>   # leva a tag, por referência
git remote remove <produto>           # não precisa ficar aqui
```

Troque `<tag-de-release>` pela tag que o produto deve usar como ponto de
partida (ex. `v1.1.0`) — nunca a ponta de `develop`/`main` direto, pra
começar num ponto conhecido e já validado pelo checkpoint completo.

**Cuidado com o refspec.** Sempre `<origem>:<destino>` completo — pushar só
pelo nome (`git push <produto> main`) pode virar **tag** em vez de **branch**
no destino se colidir com algo local. Confirme depois com
`git ls-remote <produto>` que apareceu `refs/heads/main` e
`refs/heads/develop` (não `refs/tags/main`/`refs/tags/develop`) — se vier
como tag, apague o tag errado e refaça o push com o refspec explícito.

Clonar o repositório do produto como working copy própria e registrar esta
base como `upstream`:

```bash
git clone https://github.com/<org>/<produto>.git <pasta>
cd <pasta>
git remote add upstream https://github.com/wevertoncamposdev/alicerce.git
git fetch upstream
git checkout develop
```

## 3. Mesma estratégia de branches do Alicerce (ADR 0001)

`main` = produção, só recebe merge de `develop` via PR, com checkpoint
completo verde. `develop` = integração, todo módulo novo entra aqui (ou por
branch `feat/<escopo>` a partir dela). **Nunca commit direto em `main`** —
nem no Alicerce, nem no produto.

## 4. Day 1 — identidade do produto (um commit só, isolado)

Isolar num commit único (ou PR único) ajuda os merges futuros a nunca mais
tocarem essas linhas:

- `package.json` (raiz e `backend/`): campo `name`.
- `README.md`: descrição real do produto.
- `AGENTS.md` §1 ("O que é"): trocar pela descrição do domínio real do
  produto — **manter §2–§7 sem alteração**, elas descrevem o mecanismo da
  base, que continua valendo igual aqui.
- `CLAUDE.md` (linha 1, título).
- `PLAN.md`: reiniciar — "Agora: nada em andamento".
- Opcional, baixo risco: `docker-compose.yml` (credenciais de dev) — mexer
  aqui cria um ponto pequeno de atrito em merges futuros que também tocarem
  esse arquivo; decisão do time do produto.

## 5. O que nunca editar no produto (fica só na base)

- Qualquer coisa em `backend/src/core/`, `frontend/src/core/`,
  `scripts/new-module.mjs`.
- `frontend/src/alicerce.config.ts` — é o manifesto central de módulos,
  importado pela UI inteira; renomear o arquivo exigiria editar `core/` pra
  sempre (quebra todo merge futuro).
- Auth, tenant, RBAC, auditoria — qualquer rota, guard ou service desses.

Isso não é regra nova — é a mesma do `AGENTS.md` §2 desta base, valendo
agora entre repositórios: o produto só cria/evolui módulo de domínio
(`npm run new:module`, editar model/campos/colunas — `AGENTS.md` §1), nunca
primitiva de UI, auth ou tenant novos.

## 6. Quando o produto precisa de algo que a base não oferece

Mesmo processo do `AGENTS.md` §2, só que a correção acontece **no Alicerce**,
nunca no produto:

1. Parar e registrar o que falta.
2. Editar a base aqui (plan mode se for mudança grande, ADR se for decisão
   difícil de desfazer), seguindo o processo normal do `CLAUDE.md`/
   `AGENTS.md` (checkpoint completo).
3. Merge em `main`, tag nova (ex. `v1.2.0`).
4. Só então trazer pro produto — ver §7.

## 7. Fluxo de atualização (trazer evolução da base pro produto)

```bash
cd <pasta-do-produto>
git checkout develop
git fetch upstream
git merge upstream/<tag-nova>    # ex.: v1.2.0 — por tag, não pela ponta de develop/main
```

Resolva conflito se houver (deve ser raro, se §5 foi respeitada), rode o
checkpoint completo, só então `git push origin develop` → PR pra `main`.
Recomendado fazer isso numa janela definida (mesmo espírito da "janela
mensal" de upgrade de dependência do `AGENTS.md` §2), não a cada commit da
base.
