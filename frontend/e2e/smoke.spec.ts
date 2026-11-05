import { test, expect, type Page } from '@playwright/test';
import { alicerceModules } from '../src/alicerce.config';

// Etapa 12.1 (ADR 0013) — smoke contra o build de produção, login pela
// tela (não injeção de cookie): é o único jeito de ver CSP e erros de
// Server→Client, que curl/Vitest não enxergam. `test.describe.serial` +
// uma única página compartilhada: registra UM tenant real no
// `beforeAll` e reusa a sessão em todas as rotas — mais fiel ao uso real
// do que logar de novo em cada teste.
test.describe.configure({ mode: 'serial' });

const SUFFIX = Date.now();
const EMAIL = `smoke-${SUFFIX}@example.com`;
const PASSWORD = 'SenhaForte123';

let sharedPage: Page;
let consoleErrors: string[] = [];
let pageErrors: string[] = [];

test.beforeAll(async ({ browser }) => {
  sharedPage = await browser.newPage();
  sharedPage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  sharedPage.on('pageerror', (err) => pageErrors.push(err.message));

  await sharedPage.goto('/auth/register');
  await sharedPage.fill('input[name="name"]', 'Smoke Test');
  await sharedPage.fill('input[name="tenantName"]', `Smoke ${SUFFIX}`);
  await sharedPage.fill('input[name="email"]', EMAIL);
  await sharedPage.fill('input[name="password"]', PASSWORD);
  await sharedPage.check('input[name="acceptedTerms"]');
  await sharedPage.click('button[type="submit"]');
  await sharedPage.waitForTimeout(2000); // dá tempo do redirect pós-cadastro antes do 1º goto de rota
});

test.afterAll(async () => {
  await sharedPage.close();
});

interface RouteCheck {
  path: string;
  label: string;
}

const moduleRoutes: RouteCheck[] = alicerceModules
  .filter((m) => m.navGroup !== 'hidden')
  .map((m) => ({ path: m.basePath, label: m.key }));

const extraRoutes: RouteCheck[] = [
  { path: '/perfil', label: 'perfil' },
  { path: '/configuracoes/instituicao', label: 'instituicao' },
  // feedbacks tem createMode: "detail" (ADR 0005) — único módulo hoje com
  // tela de criação pelo Detail; cobre esse caminho além da lista.
  { path: '/feedbacks/new', label: 'feedbacks-new-detail' },
];

const routes = [...moduleRoutes, ...extraRoutes];

for (const { path, label } of routes) {
  // C1 (12.2) + C2 (12.3): CSP com nonce por requisição e o campo
  // "image" serializável — nenhuma rota deve mais derrubar a hidratação
  // nem gerar violação de CSP.
  test(`rota ${label} (${path}) carrega sem violação de CSP/hidratação`, async () => {
    consoleErrors = [];
    pageErrors = [];

    await sharedPage.goto(path);
    await sharedPage.waitForLoadState('networkidle');

    const body = (await sharedPage.textContent('body')) ?? '';
    expect(body).not.toContain('Algo deu errado');

    const cspViolations = consoleErrors.filter(
      (msg) => /Content Security Policy|Refused to execute/.test(msg),
    );
    expect(cspViolations).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Separado do teste de CSP — rolagem horizontal é um problema de
  // layout isolado (12.10 item 6), não ligado a C1/C2. Ficou
  // `test.skip()` desde a fase 12 (overflow aparecia em /roles e
  // /users, não em /audit — não dava pra adivinhar por rota sem
  // investigar a causa). U3 (docs/PLAN-fundacao-ux.md) resolveu a
  // causa real: `ListView.tsx` não tinha container de rolagem próprio
  // (`overflow-x-auto` agora envolve só a `<Table>`, não a página) —
  // reativado aqui, critério de aceite da etapa.
  test(`rota ${label} (${path}) sem rolagem horizontal a 375px`, async () => {
    const viewport = sharedPage.viewportSize();
    if (viewport?.width !== 375) {
      test.skip(true, 'só relevante no projeto mobile-375');
    }

    await sharedPage.goto(path);
    await sharedPage.waitForLoadState('networkidle');
    const scrollWidth = await sharedPage.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });

  // U2 (docs/PLAN-fundacao-ux.md) — critério de aceite: nenhum verbo
  // HTTP cru nem UUID inteiro visível ao usuário. `innerText`, não
  // `innerHTML`: não pega `class`/`href`/atributo nenhum, só o que
  // renderiza na tela — `<option value="ACTIVE">` não entra aqui (value
  // não é texto renderizado), por isso "ACTIVE" não está no regex: com
  // defineEnum (core/registry/enum.ts) já tirando o enum cru das telas
  // que tinham esse status, incluir "ACTIVE" aqui só arriscaria falso
  // positivo em algum <select> nativo que ainda guarde o valor cru.
  test(`rota ${label} (${path}) sem verbo HTTP nem UUID visível ao usuário`, async () => {
    await sharedPage.goto(path);
    await sharedPage.waitForLoadState('networkidle');

    const text = await sharedPage.evaluate(() => document.body.innerText);

    const httpVerbs = text.match(/\b(POST|PATCH|PUT|DELETE)\b/g) ?? [];
    expect(httpVerbs).toEqual([]);

    // `/users`: a coluna "Tenant ID" ainda mostra o UUID cru de
    // propósito — remover coluna técnica é U3 (docs/PLAN-fundacao-ux.md
    // §4/U3), não U2 (rótulo/tom). Único ponto conhecido onde um UUID
    // inteiro ainda é esperado; qualquer outra rota não pode ter nenhum.
    if (label === 'users') return;

    const uuids = text.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi) ?? [];
    expect(uuids).toEqual([]);
  });
}

test('nonce da CSP muda a cada requisição', async () => {
  const first = await sharedPage.goto('/dashboard');
  const firstCsp = first?.headers()['content-security-policy'] ?? '';
  const second = await sharedPage.goto('/dashboard');
  const secondCsp = second?.headers()['content-security-policy'] ?? '';

  const firstNonce = firstCsp.match(/'nonce-([^']+)'/)?.[1];
  const secondNonce = secondCsp.match(/'nonce-([^']+)'/)?.[1];

  expect(firstNonce).toBeTruthy();
  expect(secondNonce).toBeTruthy();
  expect(firstNonce).not.toBe(secondNonce);
});

test('usuário já logado que abre /auth/login é redirecionado pro dashboard', async () => {
  // Confirma a sessão antes de testar o redirect — evita falso negativo
  // se o cookie ainda não tiver propagado da navegação anterior.
  await sharedPage.goto('/dashboard');
  await expect(sharedPage).toHaveURL(/\/dashboard/);

  await sharedPage.goto('/auth/login');
  await sharedPage.waitForURL('**/dashboard', { timeout: 10_000 });
  expect(sharedPage.url()).toContain('/dashboard');
});

// 1x1 PNG transparente — só precisa passar pela whitelist de MIME do
// backend (image/png,jpeg,webp), conteúdo em si é irrelevante aqui.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test('upload de avatar em /perfil mostra o preview (previewField fim-a-fim, C2)', async () => {
  await sharedPage.goto('/perfil');
  await sharedPage.waitForLoadState('networkidle');

  const fileInput = sharedPage.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  });

  // Espera o autosave comitar (onBlur) antes de recarregar — sem isso o
  // reload pode pegar o servidor ainda sem o avatarFileId novo salvo.
  await sharedPage.waitForTimeout(1500);
  await sharedPage.reload();
  await sharedPage.waitForLoadState('networkidle');

  // Classe exata do preview em ImageFieldInput (FormView.tsx) — evita
  // colidir com o avatar maior (size-20) do cabeçalho da página.
  const preview = sharedPage.locator('img.size-12.rounded-full');
  await expect(preview).toBeVisible({ timeout: 10_000 });

  // D8 (docs/PLAN-fundacao-ux.md): `src` truthy não prova que a imagem
  // carregou — a URL podia apontar pro backend, bloqueada pela CSP (D6),
  // e o teste passava do mesmo jeito. `naturalWidth > 0` só fica verdadeiro
  // depois do <img> carregar os bytes de verdade.
  await expect
    .poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 10_000 })
    .toBeGreaterThan(0);
});

// Fase 1 da revisão pré-TerceiroGestor (2026-11-04, PLAN.md): o smoke não
// cobria os dois mecanismos que todo módulo novo reaproveita — autosave de
// campo (onBlur → commitField, use-autosave-controller.ts) e attach/detach
// de relação N:N (RelationHost, roles → users). Regressão nos dois passava
// sem ser pega até aqui.
test('autosave: editar um campo de texto persiste depois de recarregar (feedbacks, createMode: "detail")', async () => {
  const uniqueTitle = `Smoke título ${Date.now()}`;
  const uniqueDescription = `Smoke descrição ${Date.now()}`;

  await sharedPage.goto('/feedbacks/new');
  await sharedPage.waitForLoadState('networkidle');

  // `title` é o campo `primary` — perder o foco com conteúdo cria o
  // rascunho e navega pra /feedbacks/:id (docs/guia-novo-modulo.md §6).
  await sharedPage.fill('input[name="title"]', uniqueTitle);
  await sharedPage.locator('input[name="title"]').blur();
  await sharedPage.waitForURL(/\/feedbacks\/[0-9a-f-]+$/, { timeout: 10_000 });

  await sharedPage.fill('textarea[name="description"]', uniqueDescription);
  await sharedPage.locator('textarea[name="description"]').blur();
  await sharedPage.waitForTimeout(1500); // dá tempo do autosave comitar antes do reload

  await sharedPage.reload();
  await sharedPage.waitForLoadState('networkidle');

  await expect(sharedPage.locator('textarea[name="description"]')).toHaveValue(uniqueDescription);
});

test('relação N:N: associar e desassociar um usuário a um papel (roles → users, RelationHost)', async () => {
  const uniqueRoleName = `Smoke Papel ${Date.now()}`;

  await sharedPage.goto('/roles');
  await sharedPage.waitForLoadState('networkidle');
  await sharedPage.getByRole('button', { name: 'Novo' }).click();

  await sharedPage.fill('input[name="name"]', uniqueRoleName);
  // RoleTypeEnum.options() — primeira opção depois do placeholder "Selecione...".
  await sharedPage.selectOption('select[name="type"]', { index: 1 });
  await sharedPage.getByRole('button', { name: 'Criar' }).click();

  await sharedPage.locator('tr', { hasText: uniqueRoleName }).click();
  await sharedPage.waitForURL(/\/roles\/[0-9a-f-]+$/, { timeout: 10_000 });

  await sharedPage.getByRole('tab', { name: 'Usuários' }).click();
  await sharedPage.getByRole('button', { name: 'Associar' }).click();

  const picker = sharedPage.getByRole('dialog', { name: 'Buscar users' });
  await picker.getByPlaceholder('Pesquisar users').fill(EMAIL);
  await picker.getByRole('row', { name: EMAIL }).getByRole('button', { name: 'Associar' }).click();

  const relationRow = sharedPage.getByRole('row', { name: EMAIL }).first();
  await expect(relationRow).toBeVisible({ timeout: 10_000 });

  await relationRow.getByRole('button').last().click(); // ícone de lixeira (detach)
  await sharedPage.getByRole('button', { name: 'Confirmar' }).click();

  await expect(sharedPage.getByText('Nenhum usuário associado a esta role.')).toBeVisible({ timeout: 10_000 });
});
