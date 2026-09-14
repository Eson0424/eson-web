# Eson_web backend 生产镜像（Phase 5-B）
#
# 设计：
# - 多阶段：build（全量依赖 → prisma generate → nest build → pnpm deploy 生产依赖）→ runtime（最小运行面）
# - runtime 仅含 dist + 生产依赖（无 devDependencies、无 src/test/tsconfig、无 .env）
# - 以非 root（node）运行，CMD 为 `node dist/main.js`（不使用 nest start / ts-node / watch / PM2）
# - 不写入任何真实 secret：所有配置在容器启动时通过环境变量注入
# - .env / .data / node_modules 不会进入构建上下文（见根 .dockerignore）

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@12.4.1 --activate
WORKDIR /app

# ── build：全量依赖 + Prisma 生成 + Nest 构建 + 生产依赖注入 ──
FROM base AS build
# backend 构建依赖 monorepo 根文件与 lockfile，只复制必要清单
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile

COPY backend ./backend

# Prisma 7 运行时需要生成客户端（build 阶段具备 prisma CLI）
RUN pnpm --filter backend exec prisma generate \
 && pnpm --filter backend build

# Prisma 生成产物位于 pnpm store 内（与 @prisma/client 同级的 .prisma），先带出备用
RUN set -eux; \
    generated="$(find /app/node_modules/.pnpm -maxdepth 4 -type d -name '.prisma' | head -n 1)"; \
    test -n "$generated"; \
    mkdir -p /prisma-generated; \
    cp -r "$generated" /prisma-generated/.prisma

# 生产依赖注入（isolated node_modules，仅 dependencies）
RUN pnpm --filter backend deploy --prod /prod/backend

# 裁剪 deploy 依赖树中只有 Prisma CLI / Studio / 构建期才需要的重量级包。
# 在 build 阶段完成裁剪，最终镜像不会包含这些字节。
# 运行时实际使用：@prisma/client + .prisma 生成产物 + @prisma/adapter-pg + pg + Nest 运行时依赖。
RUN set -eux; \
    cd /prod/backend/node_modules/.pnpm; \
    rm -rf prisma@* @prisma+engines@* @prisma+engines-version@* @prisma+fetch-engine@* \
           @prisma+studio-core@* @prisma+dev@* @prisma+config@* \
           @prisma+query-plan-executor@* @prisma+streams-local@* \
           @electric-sql+* \
           react@* react-dom@* scheduler@* @radix-ui+* @visx+* \
           d3-array@* d3-color@* d3-delaunay@* d3-format@* d3-geo@* d3-interpolate@* \
           d3-path@* d3-scale@* d3-shape@* d3-time@* d3-time-format@* \
           @types+d3-* @types+geojson@* internmap@* delaunator@* robust-predicates@* \
           elkjs@* @microsoft+tsdoc@* typescript@* @babel+* @scarf+scarf@*

# 清理 deploy 产物中不属于运行时最小集合的内容（含 .env —— 绝不进入镜像）
RUN set -eux; \
    rm -f /prod/backend/.env /prod/backend/.gitignore; \
    rm -rf /prod/backend/src /prod/backend/test /prod/backend/prisma; \
    rm -f /prod/backend/pnpm-lock.yaml /prod/backend/pnpm-workspace.yaml \
          /prod/backend/prisma.config.ts /prod/backend/nest-cli.json \
          /prod/backend/vitest.config.ts /prod/backend/vitest.config.e2e.ts \
          /prod/backend/tsconfig.json /prod/backend/tsconfig.build.json \
          /prod/backend/tsconfig.tsbuildinfo /prod/backend/tsconfig.build.tsbuildinfo

# ── runtime：最小运行面 ──
FROM node:24-slim AS runtime
ENV NODE_ENV=production
ENV API_PORT=3001
WORKDIR /app

COPY --from=build --chown=node:node /prod/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/dist ./dist

# 把 Prisma 生成产物放回 @prisma/client 所在 store 条目的同级 .prisma
COPY --from=build /prisma-generated/.prisma /tmp/prisma-client
RUN set -eux; \
    store_node_modules="$(dirname "$(dirname "$(readlink -f ./node_modules/@prisma/client)")")"; \
    cp -r /tmp/prisma-client "$store_node_modules/.prisma"; \
    rm -rf /tmp/prisma-client; \
    chown -R node:node "$store_node_modules/.prisma"

# 媒体目录：镜像内预建并归属 node，使命名卷初始化时继承正确属主
# （否则非 root 运行时无法写入 /srv/eson-media，上传会失败）
RUN set -eux; mkdir -p /srv/eson-media; chown -R node:node /srv/eson-media

USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
