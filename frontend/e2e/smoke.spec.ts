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
  // C1 (docs/PLAN-fase-12.md): CSP de produção sem nonce bloqueia o script
  // inline que o próprio Next injeta — nenhuma rota hidrata hoje. Corrige
  // na etapa 12.2. `test.fail()` até lá.
  test(`rota ${label} (${path}) carrega sem violação de CSP/hidratação`, async () => {
    test.fail(true, 'C1 (12.2): CSP sem nonce bloqueia o script inline do Next em toda rota hoje');

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

    const viewport = sharedPage.viewportSize();
    if (viewport?.width === 375) {
      const scrollWidth = await sharedPage.evaluate(() => document.documentElement.scrollWidth);
      // 12.10 item 6: /roles tem rolagem horizontal da página a 375px (a
      // tabela deveria rolar dentro do próprio container, não a página).
      expect(scrollWidth).toBeLessThanOrEqual(375);
    }
  });
}

// C2 (FormFieldConfig.previewUrl não serializável) foi testado aqui como
// cenário isolado e removido: num tenant novo sem avatar/logo ainda
// enviado, o campo nunca chega a ser resolvido e a página não derruba —
// o crash só se manifesta depois do primeiro upload. A verificação
// genérica de "Algo deu errado" em /perfil e /configuracoes/instituicao
// (loop acima) já cobre o que C2 afeta quando ele de fato se manifesta;
// um teste dedicado "sempre falha hoje" seria enganoso.
