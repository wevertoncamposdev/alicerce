# syntax=docker/dockerfile:1

# Imagem de dev/produção do frontend (Alicerce). Usa o output "standalone"
# do Next.js (ver next.config.ts) — a imagem final não carrega node_modules
# inteiro, só o bundle mínimo que o standalone já resolve.

FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
