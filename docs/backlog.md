# Backlog com gatilhos

> Item do backlog só vira tarefa quando o gatilho acontecer. Não é fila por
> prioridade nem por ordem de chegada. "Origem" aponta pra onde a decisão de
> adiar foi tomada (histórico, não instrução) — ver `docs/historico/`.

| Item | Origem | Gatilho para fazer |
| --- | --- | --- |
| IP e navegador reais no backend | 12.7 | Mais de ~5 pessoas fazendo login no mesmo minuto, ou 2ª instituição |
| Sessão atual reconhecida no perfil | 12.8 | Primeira reclamação de "caí depois de trocar a senha", ou 1º cliente pagante |
| `tenantId` fora dos DTOs | 12.10 | Próxima vez que mexer em `user` ou `role` |
| `RoleType` removido | 12.10 | Próxima vez que mexer em papéis |
| CNPJ alfanumérico | 12.10 | Primeira instituição com CNPJ no novo formato |
| Listas sem rolagem lateral no celular | 12.10 | Primeiro usuário usando pelo celular |
| `/auth/register` como página Server | 12.10 | Próxima mudança no cadastro |
| Sessão de plataforma revogável + auditoria de plataforma | 12.11 | Segunda pessoa com acesso de plataforma |
| Suspensão de tenant imediata | 12.12 | Primeira suspensão real (ex.: inadimplência) |
| Jobs com lock, throttle no Redis, MIME por bytes | 12.13 | Segunda réplica do backend |
| Billing | Fase 11 | Primeiro cliente pagante |
| Impersonação auditada, feature flags | Fase 11 | Primeiro pedido de suporte que exija |
| Escopo por registro (`.read.own`) | Avaliação | Conversa com a ONG mostrar que alguém só pode ver o que é seu |
| Campos data, CPF, telefone, moeda, seleção de registro | Avaliação | Módulo 1 do TerceiroGestor (fazer durante ele) |
| Gerador criando Feature filha | Avaliação | Módulo 2 do TerceiroGestor |
| D12 — sidebar sem 900px literal nem fixed/h-svh errado no código atual | U0.5 | Confirmar visualmente com a app rodando (Docker); se ainda cortar em telas longas, investigar de novo |
