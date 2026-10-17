# Roadmap — funcionalidades sob demanda (sem ordem)

## Módulos de plataforma

- `notifications` — in-app + e-mail, preferências por usuário, fila de envio.
- `files` — upload, storage abstrato, vínculo com qualquer entidade.
- `analytics` — eventos de produto gravados no servidor, métricas por tenant, dashboard; integração opcional com PostHog/Umami via adapter.
- `management` — back-office do dono da plataforma (super admin): tenants, usuários, planos, uso, impersonação auditada, feature flags.
- `feedback` — widget in-app, NPS/CSAT, sugestões com votos, status (recebido → planejado → entregue).
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

## Roadmap funcional

- Segurança e sessão: correções e validação manual com navegador.
- Ferramentas: limpar o template, padronizar fluxos e suporte à arquitetura base.
- Limpeza para template: remover domínio de exemplo, recriar migrations e seed, remover código morto e unificar shell/core.
- Contrato de módulo: backend e frontend padronizados para criação e evolução de módulos.
- Gerador: suportar geração real de módulos e continuar evoluindo a funcionalidade de feature generation.
- Componentes portados da referência: formulários ricos, filtros avançados, views e estados de interface.
- Core de plataforma: request-context, rate-limit, validação de env, logger, health check, auditoria, files, notifications e e-mail.
- Sustentação: `management`, `analytics`, `feedback`, `support`, `announcements`.
- Cobrança: entidades, gateways, assinaturas, doações, webhooks e entitlements.
- Produto "template": GitHub Template, `npm run init:app`, documentação e deploy de referência.
