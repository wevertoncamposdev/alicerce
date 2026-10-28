# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> usuário já logado que abre /auth/login é redirecionado pro dashboard
- Location: e2e\smoke.spec.ts:117:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/dashboard/
Received string:  "http://localhost:3000/auth/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    13 × locator resolved to <html class="--font-inter h-full antialiased">…</html>
       - unexpected value "http://localhost:3000/auth/login"

```

```yaml
- heading "Alicerce" [level=1]
- paragraph: Acesse sua conta para gerenciar sua instituição
- complementary:
  - heading "Login" [level=3]
  - paragraph: Entre com suas credenciais de acesso.
  - text: E-mail
  - textbox "E-mail":
    - /placeholder: email@exemplo.com
  - text: Senha
  - link "Esqueceu a senha?":
    - /url: /auth/forgot-password
  - textbox "Senha":
    - /placeholder: Sua senha
  - button "Entrar"
  - paragraph:
    - text: Não tem conta?
    - link "Registre-se aqui":
      - /url: /auth/register
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  21  |   sharedPage = await browser.newPage();
  22  |   sharedPage.on('console', (msg) => {
  23  |     if (msg.type() === 'error') consoleErrors.push(msg.text());
  24  |   });
  25  |   sharedPage.on('pageerror', (err) => pageErrors.push(err.message));
  26  | 
  27  |   await sharedPage.goto('/auth/register');
  28  |   await sharedPage.fill('input[name="name"]', 'Smoke Test');
  29  |   await sharedPage.fill('input[name="tenantName"]', `Smoke ${SUFFIX}`);
  30  |   await sharedPage.fill('input[name="email"]', EMAIL);
  31  |   await sharedPage.fill('input[name="password"]', PASSWORD);
  32  |   await sharedPage.check('input[name="acceptedTerms"]');
  33  |   await sharedPage.click('button[type="submit"]');
  34  |   await sharedPage.waitForTimeout(2000); // dá tempo do redirect pós-cadastro antes do 1º goto de rota
  35  | });
  36  | 
  37  | test.afterAll(async () => {
  38  |   await sharedPage.close();
  39  | });
  40  | 
  41  | interface RouteCheck {
  42  |   path: string;
  43  |   label: string;
  44  | }
  45  | 
  46  | const moduleRoutes: RouteCheck[] = alicerceModules
  47  |   .filter((m) => m.navGroup !== 'hidden')
  48  |   .map((m) => ({ path: m.basePath, label: m.key }));
  49  | 
  50  | const extraRoutes: RouteCheck[] = [
  51  |   { path: '/perfil', label: 'perfil' },
  52  |   { path: '/configuracoes/instituicao', label: 'instituicao' },
  53  |   // feedbacks tem createMode: "detail" (ADR 0005) — único módulo hoje com
  54  |   // tela de criação pelo Detail; cobre esse caminho além da lista.
  55  |   { path: '/feedbacks/new', label: 'feedbacks-new-detail' },
  56  | ];
  57  | 
  58  | const routes = [...moduleRoutes, ...extraRoutes];
  59  | 
  60  | for (const { path, label } of routes) {
  61  |   // C1 (12.2) + C2 (12.3): CSP com nonce por requisição e o campo
  62  |   // "image" serializável — nenhuma rota deve mais derrubar a hidratação
  63  |   // nem gerar violação de CSP.
  64  |   test(`rota ${label} (${path}) carrega sem violação de CSP/hidratação`, async () => {
  65  |     consoleErrors = [];
  66  |     pageErrors = [];
  67  | 
  68  |     await sharedPage.goto(path);
  69  |     await sharedPage.waitForLoadState('networkidle');
  70  | 
  71  |     const body = (await sharedPage.textContent('body')) ?? '';
  72  |     expect(body).not.toContain('Algo deu errado');
  73  | 
  74  |     const cspViolations = consoleErrors.filter(
  75  |       (msg) => /Content Security Policy|Refused to execute/.test(msg),
  76  |     );
  77  |     expect(cspViolations).toHaveLength(0);
  78  |     expect(pageErrors).toHaveLength(0);
  79  |   });
  80  | 
  81  |   // Separado do teste de CSP — rolagem horizontal é um problema de
  82  |   // layout isolado (12.10 item 6), não ligado a C1/C2. O item 6 do
  83  |   // PLAN-fase-12 cita só /roles, mas rodando o smoke com a hidratação já
  84  |   // funcionando (pós-12.2) o mesmo overflow apareceu também em /users —
  85  |   // e NÃO em /audit, então não é todo list route. `test.fail()` por rota
  86  |   // exigiria adivinhar certo pra cada uma (serial mode para no primeiro
  87  |   // "esperava falhar, passou"); fica `test.skip()` até a 12.10
  88  |   // investigar o alcance real e escrever sua própria asserção por rota.
  89  |   test(`rota ${label} (${path}) sem rolagem horizontal a 375px`, async () => {
  90  |     const viewport = sharedPage.viewportSize();
  91  |     if (viewport?.width !== 375) {
  92  |       test.skip(true, 'só relevante no projeto mobile-375');
  93  |     }
  94  |     test.skip(true, '12.10 item 6: alcance exato ainda não mapeado (ver comentário acima) — não adivinhar por rota');
  95  | 
  96  |     await sharedPage.goto(path);
  97  |     await sharedPage.waitForLoadState('networkidle');
  98  |     const scrollWidth = await sharedPage.evaluate(() => document.documentElement.scrollWidth);
  99  |     expect(scrollWidth).toBeLessThanOrEqual(375);
  100 |   });
  101 | }
  102 | 
  103 | test('nonce da CSP muda a cada requisição', async () => {
  104 |   const first = await sharedPage.goto('/dashboard');
  105 |   const firstCsp = first?.headers()['content-security-policy'] ?? '';
  106 |   const second = await sharedPage.goto('/dashboard');
  107 |   const secondCsp = second?.headers()['content-security-policy'] ?? '';
  108 | 
  109 |   const firstNonce = firstCsp.match(/'nonce-([^']+)'/)?.[1];
  110 |   const secondNonce = secondCsp.match(/'nonce-([^']+)'/)?.[1];
  111 | 
  112 |   expect(firstNonce).toBeTruthy();
  113 |   expect(secondNonce).toBeTruthy();
  114 |   expect(firstNonce).not.toBe(secondNonce);
  115 | });
  116 | 
  117 | test('usuário já logado que abre /auth/login é redirecionado pro dashboard', async () => {
  118 |   // Confirma a sessão antes de testar o redirect — evita falso negativo
  119 |   // se o cookie ainda não tiver propagado da navegação anterior.
  120 |   await sharedPage.goto('/dashboard');
> 121 |   await expect(sharedPage).toHaveURL(/\/dashboard/);
      |                            ^ Error: expect(page).toHaveURL(expected) failed
  122 | 
  123 |   await sharedPage.goto('/auth/login');
  124 |   await sharedPage.waitForURL('**/dashboard', { timeout: 10_000 });
  125 |   expect(sharedPage.url()).toContain('/dashboard');
  126 | });
  127 | 
  128 | // 1x1 PNG transparente — só precisa passar pela whitelist de MIME do
  129 | // backend (image/png,jpeg,webp), conteúdo em si é irrelevante aqui.
  130 | const TINY_PNG = Buffer.from(
  131 |   'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  132 |   'base64',
  133 | );
  134 | 
  135 | test('upload de avatar em /perfil mostra o preview (previewField fim-a-fim, C2)', async () => {
  136 |   await sharedPage.goto('/perfil');
  137 |   await sharedPage.waitForLoadState('networkidle');
  138 | 
  139 |   const fileInput = sharedPage.locator('input[type="file"]');
  140 |   await fileInput.setInputFiles({
  141 |     name: 'avatar.png',
  142 |     mimeType: 'image/png',
  143 |     buffer: TINY_PNG,
  144 |   });
  145 | 
  146 |   // Espera o autosave comitar (onBlur) antes de recarregar — sem isso o
  147 |   // reload pode pegar o servidor ainda sem o avatarFileId novo salvo.
  148 |   await sharedPage.waitForTimeout(1500);
  149 |   await sharedPage.reload();
  150 |   await sharedPage.waitForLoadState('networkidle');
  151 | 
  152 |   // Classe exata do preview em ImageFieldInput (FormView.tsx) — evita
  153 |   // colidir com o avatar maior (size-20) do cabeçalho da página.
  154 |   const preview = sharedPage.locator('img.size-12.rounded-full');
  155 |   await expect(preview).toBeVisible({ timeout: 10_000 });
  156 | 
  157 |   // D8 (docs/PLAN-fundacao-ux.md): `src` truthy não prova que a imagem
  158 |   // carregou — a URL podia apontar pro backend, bloqueada pela CSP (D6),
  159 |   // e o teste passava do mesmo jeito. `naturalWidth > 0` só fica verdadeiro
  160 |   // depois do <img> carregar os bytes de verdade.
  161 |   await expect
  162 |     .poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 10_000 })
  163 |     .toBeGreaterThan(0);
  164 | });
  165 | 
```