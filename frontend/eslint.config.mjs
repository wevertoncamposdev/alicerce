import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/lib/*'],
            message: 'Use @lib/* em vez de @/lib/*.'
          },
          {
            group: ['@/modules/*'],
            message: 'Use @modules/* em vez de @/modules/*.'
          },
          {
            group: ['@/components/*'],
            message: 'Use @components/* em vez de @/components/*.'
          },
          {
            group: ['@/core/*'],
            message: 'Use @core/* em vez de @/core/*.'
          },
        ],
      }],
    },
  },
  // Fronteiras de import — AGENTS.md §4.4: core/ nunca importa de modules/
  // nem platform/. platform/ ainda não existe neste repo; a regra já cobre
  // o alias para quando ele for criado.
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@modules/*', '@/modules/*'], message: 'core/ não pode importar de modules/ (AGENTS.md §4.4).' },
          { group: ['@platform/*', '@/platform/*'], message: 'core/ não pode importar de platform/ (AGENTS.md §4.4).' },
        ],
      }],
    },
  },
  // Server-side first (AGENTS.md §4.1.3) — apiClient é só pro browser
  // (chama /api/proxy, depende de cookie do client); mutação/leitura em
  // modules/core/components deve ir por Server Action + apiServer/DataProvider.
  // Exceções só com comentário apontando o item do AGENTS.md que justifica.
  {
    files: ["src/modules/**/*.{ts,tsx}", "src/core/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@lib/api-client', '@/lib/api-client'], message: 'apiClient é só para src/lib e src/hooks (AGENTS.md §4.1.3) — use Server Action + apiServer/DataProvider aqui.' },
        ],
      }],
    },
  },
]);


export default eslintConfig;
