# Eson_web frontend 生产镜像（Phase 5-B）
#
# 设计：
# - 多阶段：build（全量依赖 → nuxt build）→ runtime（仅 .output；不含 source tree / node_modules）
# - Nitro 的 .output 自包含（server/node_modules 已内联），runtime 无需安装依赖
# - 以非 root（node）运行，CMD 为 `node .output/server/index.mjs`
# - NUXT_PUBLIC_API_BASE / NUXT_PUBLIC_SITE_URL 保持 **部署期运行时配置**：
#   不在 Dockerfile 中以 ENV 固定，启动容器时注入即可生效（Phase 5-A 已实测）

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@12.4.1 --activate
WORKDIR /app

# ── build ──
FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile

COPY frontend ./frontend
RUN pnpm --filter frontend build

# ── runtime ──
FROM node:24-slim AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
WORKDIR /app

COPY --from=build --chown=node:node /app/frontend/.output ./.output

USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
