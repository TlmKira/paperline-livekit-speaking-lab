FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BRANDFETCH_CLIENT_ID
ARG AI_ENGINE_URL=http://ai-engine:8000
ARG AI_COACH_ENGINE_URL=http://coach-engine:8001
ARG STRIPE_SECRET_KEY
ARG STRIPE_PRICE_ID
ARG STRIPE_WEBHOOK_SECRET

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_BRANDFETCH_CLIENT_ID=$NEXT_PUBLIC_BRANDFETCH_CLIENT_ID
ENV AI_ENGINE_URL=$AI_ENGINE_URL
ENV AI_COACH_ENGINE_URL=$AI_COACH_ENGINE_URL
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV STRIPE_PRICE_ID=$STRIPE_PRICE_ID
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone output (includes its own minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets and public folder
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
