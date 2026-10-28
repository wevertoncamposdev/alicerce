import Redis from 'ioredis';

// "Redis real, com FLUSHDB entre arquivos" (etapa 12.1) — um hook global
// evita repetir isso em cada *.db-spec.ts. Resiliente a Redis fora do ar
// (ambiente sem Redis local): a suíte continua, só sem isolamento de
// cache entre arquivos — mesmo comportamento fail-open documentado em
// RedisService.
afterAll(async () => {
  const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    retryStrategy: () => null,
  });

  try {
    await client.connect();
    await client.flushdb();
  } catch {
    // Redis indisponível neste ambiente — segue sem flush (ver nota acima).
  } finally {
    client.disconnect();
  }
});
