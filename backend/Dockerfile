# syntax=docker/dockerfile:1

# Imagem de dev/produção do backend (Alicerce). Build multi-stage: instala
# dependências uma vez, gera o Prisma Client (adapter @prisma/adapter-pg —
# sem binário de query engine, por isso não precisa de passo extra de cópia
# de binário nativo) e compila com `nest build`; a imagem final só leva o
# `dist/` compilado + dependências de produção.

FROM node:26-alpine AS deps
WORKDIR /app
# bcrypt tem binding nativo — em Alpine (musl) só tem binário pré-compilado
# para algumas combinações de Node/arquitetura; python3/make/g++ garantem
# que ele compila na hora se não houver um pronto.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

EXPOSE 5000
CMD ["node", "dist/src/main"]
