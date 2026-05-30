# syntax=docker/dockerfile:1
# Slice #9: multi-stage build for a Next.js standalone server.
# Built on the devbox (the e2-micro would OOM on `next build`) and pushed
# to GHCR; the GCP VM only pulls and runs the runner stage.

# ---- deps: install production+dev deps for the build ----
FROM node:24-alpine AS deps
WORKDIR /app
# libc6-compat: some Next/Node native bits expect glibc symbols on Alpine.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the standalone output ----
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Telemetry off; build with the same Node as the runner.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal image that runs `node server.js` ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone bundle already contains a pruned node_modules + server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
