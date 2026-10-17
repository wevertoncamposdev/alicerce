# Roadmap — funcionalidades sob demanda (sem ordem)

## Módulos de plataforma

- `notifications` — in-app + e-mail, preferências por usuário, fila de envio.
- `files` — upload, storage abstrato, vínculo com qualquer entidade.
- `analytics` — eventos de produto gravados no servidor, métricas por tenant, dashboard; integração opcional com PostHog/Umami via adapter.
- `management` — back-office do dono da plataforma (super admin): tenants, usuários, planos, uso, impersonação auditada, feature flags.
- `feedback` — a versão simples (sugestão, status, comentários) já existe como
  módulo de exemplo. Futuro, sob demanda: widget in-app, NPS/CSAT, votos.
- `support` — tickets com mensagens, anexos, prioridade, SLA, atribuição, base de conhecimento simples.
- `announcements` — changelog e avisos in-app por tenant/plano.

## Cobrança (`billing`)

- `Plan`, `Price` (mensal/anual, moeda), `Subscription`, `Invoice`, `Payment`, `Donation`, `Customer` (vínculo tenant → gateway), `WebhookEvent`.
- Assinaturas recorrentes, doação (única ou recorrente, com valor livre e página pública de doação), pagamento avulso, trial, cupom.
- Gateways através de interface `PaymentProvider` (`createCustomer`, `createCheckout`, `createSubscription`, `cancel`, `parseWebhook`). Adapters: Stripe, Mercado Pago ou Asaas. Nenhum código fora do adapter conhece o gateway.
- Webhooks: assinatura verificada, idempotência por `WebhookEvent.externalId`, processamento transacional, reprocessamento manual pelo `management`.
- Entitlements: o plano define limites e recursos (`maxUsers`, `support.priority`). Backend verifica com `@RequiresEntitlement()`; frontend esconde/indica upgrade. O domínio nunca pergunta "qual é o plano", só "tem o entitlement?".
- Segurança: nunca armazenar dados de cartão; o checkout é sempre do gateway. Valores em centavos (`Int`), nunca `Float`.
- Ambientes de teste dos gateways configurados por env; seed com planos de exemplo.

## Outras funcionalidades sob demanda

- Componentes portados da referência (via `/portar-componente`): campos de
  formulário ricos, filtros avançados avaliados no backend, views kanban,
  calendário e timeline, `loading.tsx`/`error.tsx`/`not-found.tsx`.
- Fluxos de conta que dependem de e-mail: esqueci/redefinir senha, convite de
  usuário.
- Gerador: `--feature-of <pai>` para gerar Feature em vez de Módulo.
- Seletor de tenant, i18n com troca de idioma, tema claro/escuro.
- Produto "template": marcar como GitHub Template, `npm run init:app`,
  deploy de referência documentado.
