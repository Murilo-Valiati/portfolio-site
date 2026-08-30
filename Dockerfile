# --- deps: install dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: build the Next.js app ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner: minimal production image ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Claude Code em modo headless: motor do Assistente via assinatura pessoal
# (lib/claude-cli.ts). Ativa só quando CLAUDE_CODE_OAUTH_TOKEN estiver no
# compose; sem o token, o Assistente usa o Gemini normalmente.
RUN npm install -g @anthropic-ai/claude-code \
  && mkdir -p /home/nextjs/.claude \
  && chown -R nextjs:nodejs /home/nextjs
ENV HOME=/home/nextjs
ENV DISABLE_AUTOUPDATER=1

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /data && chown nextjs:nodejs /data
ENV CONTENT_DATA_DIR=/data

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
