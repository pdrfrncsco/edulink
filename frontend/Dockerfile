# Multi-stage build para EduLink Frontend (Next.js)
FROM node:22-alpine AS base

WORKDIR /app

# Instalação de dependências
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Build da aplicação Next.js
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build || echo "Build de desenvolvimento - pulando pre-render"

# Imagem final de execução
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=development \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/.next/cache && \
    chown -R nextjs:nodejs /app/.next

COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "dev"]
