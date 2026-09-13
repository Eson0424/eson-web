# Eson_web backend development image skeleton (Phase 1).
# 未验证：当前开发机没有 Docker Desktop / WSL2。

FROM node:24-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

WORKDIR /app

FROM base AS dev

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

RUN pnpm install --frozen-lockfile

COPY . .

WORKDIR /app/backend

EXPOSE 3001

CMD ["pnpm", "start:dev"]
