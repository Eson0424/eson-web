# Eson_web

个人品牌与技术作品网站（品牌：**ESON**）。

当前处于 **Phase 4-F.7：文档同步**（4-F.6.2 已完成）。项目已包含完整的 Public 站点、Admin CMS、认证、数据库（25 张业务表）、媒体上传与管理、Public Cover 与 Public Gallery。

> 本轮为文档同步阶段：只更新文档，不修改任何应用代码或数据结构。

---

## 项目结构

```text
Eson_web/
├── frontend/            Nuxt 4 + Vue 3 + TypeScript
├── backend/             NestJS 12 + Prisma + PostgreSQL
├── docker/              本地开发镜像骨架（未验证）
├── docs/                项目文档（PRD / DESIGN / ARCHITECTURE / DATABASE / API）
├── tests/               跨端测试（占位，后续阶段使用）
├── docker-compose.yml   本地基础设施：PostgreSQL（必需）+ MinIO（可选 / 当前未使用）
├── pnpm-workspace.yaml  pnpm workspace 配置
├── package.json         workspace 根配置（固定 pnpm 版本）
├── .env.example         环境变量模板
└── AGENTS.md            项目协作规则
```

Frontend 与 Backend 均包含 Public 与 Admin 两侧实现（`frontend/app/pages/**`、`backend/src/modules/**`）。

---

## 技术栈

| 层 | 技术 |
|---|---|
| Frontend | Nuxt、Vue 3、TypeScript、Pinia（@pinia/nuxt）、@nuxtjs/i18n、Tailwind CSS、GSAP、Lenis |
| Backend | NestJS、TypeScript、@nestjs/config、@nestjs/swagger、@nestjs/jwt、@nestjs/throttler、class-validator、argon2、helmet、pino |
| Database | PostgreSQL + Prisma |
| API | REST `/api/v1`，Admin API 位于 `/api/v1/admin/*` |
| Auth | JWT（Access Token 走 Bearer，Refresh Token 仅 HttpOnly Cookie） |
| i18n | `zh-CN` / `en-US`，默认 `zh-CN`，strategy `no_prefix` |
| Media | StorageService 抽象 + LocalStorageDriver（本地文件系统）；S3 / MinIO 未实现（deferred） |
| Testing | Vitest（Frontend / Backend）、@nestjs/testing、Playwright（后续阶段） |
| 包管理 | pnpm（固定版本，见 `packageManager`） |

---

## 开发环境要求

- Node.js >= 20（当前验证版本 v24.21.0）
- pnpm 12.4.1（通过 Corepack 管理，见根 `package.json` 的 `packageManager`）
- Git（默认分支 `main`）
- Docker Desktop + WSL2（本地 PostgreSQL 使用；**已安装并运行，PostgreSQL 容器 `eson-web-postgres` 健康**）
- MinIO **不是当前必需项**：本地媒体默认写入后端文件系统（`backend/.data`），MinIO compose 服务当前未运行、应用也未接入

---

## pnpm 使用方式

```bash
# 启用 Corepack 并使用项目固定版本
corepack enable
corepack prepare pnpm@12.4.1 --activate

# 安装全部 workspace 依赖
pnpm install
```

不要使用 Codex runtime 内置的 fallback pnpm 作为项目包管理器。

---

## Frontend 启动方式

```bash
pnpm --filter frontend dev        # 开发服务器 http://localhost:3000
pnpm --filter frontend build      # 生产构建
pnpm --filter frontend typecheck  # 类型检查
pnpm --filter frontend test       # Vitest
```

API 地址通过运行时配置读取：本地默认 `http://localhost:3001/api/v1`，可用 `NUXT_PUBLIC_API_BASE` 覆盖。

当前路由：

```text
/               首页（Hero / Intro / Selected Work / Capabilities / Lab / Writing / Experience / Contact）
/work           Work 列表（Featured + More work，编辑式布局）
/work/:slug     Work 案例页（Overview → Results + Gallery（已实现）+ Next work）
/lab            Lab 列表（Featured experiments + All experiments）
/lab/:slug      Lab 实验记录（Overview → Observations + Gallery（已实现）+ Next experiment）
/writing        Writing 列表（Latest + All writing，编辑式列表）
/writing/:slug  Writing 文章页（Article header → Content → Tags / Related / Prev / Next）
/experience     职业轨迹（占位时间线，真实经历接入后显示）
/about          个人品牌页（Profile / Engineering philosophy / Capabilities / Current focus / CTA）
/contact        联系页（渠道状态 + 表单，已接入 `POST /api/v1/contact`）
/design-system  Design System 内部预览（noindex，非公开页面）
404 / 错误页    app/error.vue（品牌化错误页，返回首页 / Work / Lab / Writing）
```

Admin 路由（`/admin/**` 为 CSR，`ssr: false`）：

```text
/admin/login     登录
/admin           概览（Dashboard）
/admin/work      Work CMS（列表 / 新建 / 编辑）
/admin/lab       Lab CMS（列表 / 新建 / 编辑）
/admin/writing   Writing CMS（列表 / 新建 / 编辑）
/admin/experience Experience CMS（列表 / 新建 / 编辑）
/admin/media     媒体库（上传 / 编辑 alt / 删除）
/admin/categories、/admin/tags、/admin/messages、/admin/settings  占位页
```

Writing **没有** Gallery（当前仅 Work 与 Lab 有 Public Gallery）。

---

## Backend 启动方式

```bash
pnpm --filter backend start:dev   # 开发模式 http://localhost:3001
pnpm --filter backend build       # 构建（输出 dist/）
pnpm --filter backend start:prod  # 运行构建产物
pnpm --filter backend test        # 单元测试
pnpm --filter backend test:e2e    # e2e 测试
pnpm --filter backend typecheck   # 类型检查
```

当前可用端点：

```text
GET  /api/v1/health                     健康检查
GET  /api/v1/work | /work/:slug         Public Work 列表 / 详情（详情含 gallery）
GET  /api/v1/lab | /lab/:slug           Public Lab 列表 / 详情（详情含 gallery）
GET  /api/v1/writing | /writing/:slug   Public Writing 列表 / 详情
GET  /api/v1/experience                 Public Experience（发布规则例外，见 docs/API.md §13.2）
GET  /api/v1/categories | /tags | /settings
POST /api/v1/contact                    联系表单
POST /api/v1/auth/login|refresh|logout  GET /auth/me
GET|POST|PATCH|DELETE /api/v1/admin/*   Admin（Work / Lab / Writing / Experience）
GET|POST|PATCH|DELETE /api/v1/admin/media  媒体（列表 / 上传 / 编辑 alt / 删除）
GET  /api/docs                          Swagger（开发环境）
```

完整契约以 [docs/API.md](docs/API.md) 为准。

---

## Media（已实现）

```text
存储       StorageService 抽象 + LocalStorageDriver（backend/.data，object key = media/<yyyy>/<mm>/<uuid>.<ext>）
           静态只读 /media/*；STORAGE_DRIVER / MEDIA_LOCAL_ROOT / MEDIA_PUBLIC_BASE_URL 见 .env.example
上传       multipart 单文件（file + 可选 alt），JPEG / PNG / WebP / AVIF，≤10MB，≤40MP
           magic-byte / 扩展名一致性校验；SVG 不在白名单
媒体库     /admin/media：每页 24、createdAt DESC、alt 编辑、删除（被引用时 409）
MediaPicker Work / Lab / Writing 编辑器内选择 Cover（单选）与 Gallery（多选，顺序即 sortOrder）
Public     Cover（Work / Lab / Writing）与 Gallery（仅 Work / Lab），图片失败回退 PlaceholderVisual
```

**明确未实现（deferred）**：S3StorageDriver、MinIO 运行时接入、专项 upload 10/min 限流、srcset / 响应式图源 / 压缩 / CDN 管线、caption 编辑 UI、Media GET-by-ID、Public Media API、Writing Gallery、Lightbox / Zoom / Fullscreen、gallery JSON-LD、Experience 的 MediaPicker 接入。

---

## Docker / 数据库

本地基础设施通过 Docker Compose 运行：

```bash
cp .env.example .env          # 填入本地值（.env 不会被 Git 跟踪）
docker compose up -d postgres   # 当前应用只需要 PostgreSQL
```

服务与端口：

```text
postgres   localhost:5432   必需（已运行、已用于 Prisma migration / seed / API / QA）
minio      localhost:9000（控制台 9001）  可选，当前未运行；应用未接入对象存储
```

`docker-compose.yml` 中还包含 `frontend` / `backend` 服务，位于 `app` profile，需要时使用 `docker compose --profile app up` 启动；两者的镜像骨架位于 `docker/`。

**验证状态：PostgreSQL 容器已实际运行并通过 Prisma migration / seed / API / E2E / 浏览器 QA 验证；MinIO 未运行（拉取失败），对象存储接入属 deferred；`docker/*.Dockerfile` 镜像骨架仍未实际运行验证。**

Prisma 相关命令（连接串由 `backend/prisma.config.ts` 读取 `DATABASE_URL`）：

```bash
pnpm --filter backend prisma:validate
pnpm --filter backend prisma:generate
```

---

## 文档索引

| 文档 | 作用 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 产品需求、信息架构、页面与功能范围 |
| [docs/DESIGN.md](docs/DESIGN.md) | 视觉方向、设计系统、动效与响应式规范 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 系统架构、模块边界、认证、部署 |
| [docs/DATABASE.md](docs/DATABASE.md) | 数据模型（25 张表）、索引、约束、迁移策略 |
| [docs/API.md](docs/API.md) | API Contract、响应封装、错误码、端点 |
| docs/QA.md | 后续阶段文档（尚未创建） |
| docs/DEPLOYMENT.md | 后续阶段文档（尚未创建） |

---

## 当前开发阶段

```text
Phase 0     文档统一                                  已完成
Phase 1     工程初始化                                已完成
Phase 2A    Design System & UI Foundation             已完成
Phase 2B    Homepage                                  已完成
Phase 2C-1  Work 模块（/work、/work/:slug）            已完成
Phase 2C-2  Lab 与 Writing 模块                        已完成
Phase 2C-3  Experience / About / Contact               已完成
Phase 2D    全站视觉 / 交互精修 + QA                   已完成
Phase 3     Backend + Prisma + API（25 表 / 1 migration）已完成
Phase 4-A   Admin Auth + Admin Layout + Dashboard      已完成
Phase 4-B   Work CMS（含 4-B.1 Admin SSR 安全加固）     已完成
Phase 4-C   Lab CMS                                    已完成
Phase 4-D   Writing CMS                                已完成
Phase 4-E   Experience CMS                             已完成
Phase 4-F.1 Storage Foundation                         已完成
Phase 4-F.2 Upload Validation + Media Service          已完成
Phase 4-F.3 Admin Media API                            已完成
Phase 4-F.4 Admin Media Library                        已完成
Phase 4-F.5 MediaPicker + CMS 集成                     已完成
Phase 4-F.5.1 Public Cover Rendering                   已完成
Phase 4-F.6.1 Public Gallery Data Pipeline             已完成
Phase 4-F.6.2 Public Gallery Rendering                 已完成
Phase 4-F.7 文档同步                                   已完成（本轮）
Phase 4-F.8 全量 QA / 发布前验收                        未开始
```

已完成：Git 仓库（`main`）、pnpm workspace、Design System 与 UI primitives、Public 全站（首页 / Work / Lab / Writing / Experience / About / Contact）、Admin（认证 / Dashboard / Work / Lab / Writing / Experience CMS / 媒体库）、PostgreSQL + Prisma（25 张业务表、1 个 migration）、完整 REST API、媒体上传与选择、Public Cover 与 Public Gallery。

仍需注意：站点的**业务内容**（职业经历、联系方式、社交账号、案例结果）目前仍是明确占位数据，来自数据库 seed，上线前必须替换为真实内容；GitHub / Demo 链接在无真实数据时不会渲染；Gallery 与 Cover 使用原始上传文件（无图片优化管线）。
