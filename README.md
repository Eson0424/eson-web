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

生产媒体存储（Phase 5-E，已在隔离生产栈中实测）：

```text
配置       STORAGE_DRIVER=local + MEDIA_LOCAL_ROOT=/srv/eson-media + MEDIA_PUBLIC_BASE_URL=<部署域名>
卷         media-data → /srv/eson-media（backend 独占；runtime 用户 node，目录 755，不使用 chmod 777）
fail-fast  NODE_ENV=production 缺失 MEDIA_PUBLIC_BASE_URL / MEDIA_LOCAL_ROOT 时 backend 拒绝启动
持久化     容器 restart / delete + recreate / 镜像 rebuild 后媒体仍可读取（容器生命周期 ≠ 媒体生命周期）
删除       被 Work / Lab / Writing 引用时 409 CONFLICT（details[0].reason = MEDIA_IN_USE）
```

媒体备份 / 恢复已实现（Phase 5-G：`backup-db` / `backup-media` / 隔离恢复演练 / 一致性校验 / 保留策略），
详见下方「备份与恢复」章节与 [docs/RECOVERY.md](docs/RECOVERY.md)；**定时调度与 offsite 落地仍待 Phase 5-H+**。

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

> 生产环境变量（Phase 5-C）：`NODE_ENV=production` 时必须显式提供 `JWT_SECRET`、
> `JWT_REFRESH_SECRET`、`CONTACT_IP_SALT`；缺失、空白或沿用模板占位值都会让 backend
> **拒绝启动**（fail-fast，不再回退开发默认值）。同时 Swagger/OpenAPI 只在非生产环境注册，
> production 下 `/api/docs` 与 `/api/docs-json` 返回 404。完整清单见 `.env.example`。

生产数据库初始化（Phase 5-D）：使用**全新空数据库**，禁止复用开发库或运行 seed。

```bash
# 1) 只应用已提交的 migration（不生成、不 seed）
pnpm --filter backend exec prisma migrate deploy

# 2) 一次性创建管理员（不接受开发默认账号，重复执行会安全失败）
pnpm --filter backend build
ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm --filter backend admin:bootstrap
# 生产容器内：docker compose -f docker-compose.prod.yml exec backend node dist/bootstrap-admin.js

# 3) 验证登录
curl -X POST https://<domain>/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}'
```

详见 [docs/DATABASE.md](docs/DATABASE.md) §73.1 / §75.1。

生产媒体卷（Phase 5-E）：

```bash
# 隔离 QA / 生产：backend 只挂载 media-data，postgres 只挂载 postgres-data
docker compose -f docker-compose.prod.yml up -d postgres backend

# 卷不会被容器重建影响；删除容器不会删除卷
docker volume ls | findstr media-data
```

`docker-compose.prod.yml` 不向宿主机映射 backend / postgres 端口，也不挂载任何宿主目录
（媒体只通过 `MEDIA_PUBLIC_BASE_URL` 指向的 `/media/*` 暴露）。

## 生产 HTTPS / Caddy（Phase 5-F）

生产是**单域名 + Caddy automatic HTTPS**：站点、Admin、API、媒体同一个 origin。

```text
Internet
  ↓  :80 → 308 redirect
Caddy :443
  ├── /api/*   → backend:3001
  ├── /media/* → backend:3001
  └── 其它      → frontend:3000（含 /admin/*）
```

部署时只需要一个域名变量（其余配置由它派生；拆分域名时再显式覆盖对应变量）：

```bash
export SITE_DOMAIN=<your-domain>
export POSTGRES_PASSWORD=... JWT_SECRET=... JWT_REFRESH_SECRET=... CONTACT_IP_SALT=...
docker compose -f docker-compose.prod.yml up -d
```

派生关系：

```text
CORS_ORIGIN            https://<SITE_DOMAIN>
NUXT_PUBLIC_API_BASE   https://<SITE_DOMAIN>/api/v1      浏览器
NUXT_PUBLIC_SITE_URL   https://<SITE_DOMAIN>             canonical / OG / JSON-LD
MEDIA_PUBLIC_BASE_URL  https://<SITE_DOMAIN>             媒体
NUXT_API_BASE_SERVER   http://backend:3001/api/v1        仅 SSR（Docker 内网，不绕公网入口）
```

证书由 Caddy 自动申请与续期，持久化在 `caddy-data` / `caddy-config` 卷；仓库与镜像中都没有私钥。
本地（无公网域名时）可做 TLS 验证：`CADDY_TLS_DIRECTIVE="tls internal"` 使用 Caddy 内部 CA，
**这不是生产 HTTPS**，生产必须留空该变量。

## 备份与恢复（Phase 5-G）

备份是运维链路，与应用运行时分离：`backup` / `backup-retention` 是 `ops` profile 的一次性服务，
产物写入独立的 `backup-data` 卷（权限 0700 / 文件 0600），与 `postgres-data`、`media-data` 完全分开。

```bash
# 1) 备份（数据库 pg_dump custom format + 媒体 tar.gz + manifest）
docker compose -f docker-compose.prod.yml run --rm backup /scripts/backup-db.sh
docker compose -f docker-compose.prod.yml run --rm backup /scripts/backup-media.sh

# 2) 校验（checksum + 可恢复性）
docker compose -f docker-compose.prod.yml run --rm backup \
  /scripts/verify-backup.sh /backups/db/<file>.dump

# 3) 恢复到隔离库（演练用；脚本拒绝写入 eson_web / 源库 / 已存在的库）
docker compose -f docker-compose.prod.yml run --rm backup \
  -e PGHOST=<recovery-host> -e TARGET_DB=eson_web_recovery \
  /scripts/restore-db.sh /backups/db/<file>.dump

# 4) 恢复媒体到独立目录
docker compose -f docker-compose.prod.yml run --rm backup \
  -v eson-recovery-media:/recovery-media \
  /scripts/restore-media.sh /backups/media/<file>.tar.gz /recovery-media

# 5) 恢复完整性验证（schema / 行数 / 关系 / admin / DB↔File / 孤儿文件）
docker compose -f docker-compose.prod.yml run --rm backup -e PGHOST=<recovery-host> \
  -e DB=eson_web_recovery -e MEDIA_ROOT=/recovery-media -v eson-recovery-media:/recovery-media \
  /scripts/verify-recovery.sh

# 6) 保留策略（默认 dry-run；--apply 才删除）
docker compose -f docker-compose.prod.yml run --rm backup-retention
docker compose -f docker-compose.prod.yml run --rm backup-retention --dir /backups --apply
```

```text
保留策略   Daily 7 / Weekly 4 / Monthly 3（每个前缀最新一份始终保留）
策略测试   node --test docker/backup/retention.spec.mjs（17 tests，无新增依赖）
RPO        目标 ≤ 24h（每日备份；定时调度属 Phase 5-H+）
RTO        目标 ≤ 1h（隔离演练实测：备份 ~1.7s、恢复 ~1.9s、验证 1.6s）
完整 Runbook / 灾难恢复清单 → docs/RECOVERY.md
```

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
| [docs/RECOVERY.md](docs/RECOVERY.md) | 备份与灾难恢复 Runbook（备份/校验/恢复/一致性/RPO/RTO/清单） |
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
Phase 4-F.7 文档同步                                   已完成
Phase 4-F.8 全量 QA / 发布前验收                        已完成
Phase 5-0   Release Baseline（commit 24e0671 / tag v1.0.0，未 push）  已完成
Phase 5-A   Production Preparation 审计                已完成（APPROVED WITH CONDITIONS）
Phase 5-B   Production Docker（prod Dockerfile / compose / 网络分区） 已完成
Phase 5-C   Security / Secrets（secret fail-fast + 生产关闭 Swagger）  已完成
Phase 5-D   Production Database（migrate deploy + admin bootstrap）    已完成
Phase 5-E   Media Storage（生产卷 / 权限 / 持久化 / 安全回归）          已完成（本阶段）
Phase 5-F   HTTPS / Caddy（单域名反代 / 安全头 / 代理头 / 本地 TLS 验证）已完成（本阶段）
Phase 5-G   Backup / Recovery（备份 / 隔离恢复演练 / 一致性 / 保留策略）已完成（本阶段）
Phase 5-H+  offsite 备份落地、定时调度、CI/CD、公网部署（真实域名 + DNS）未开始
```

已完成：Git 仓库（`main`）、pnpm workspace、Design System 与 UI primitives、Public 全站（首页 / Work / Lab / Writing / Experience / About / Contact）、Admin（认证 / Dashboard / Work / Lab / Writing / Experience CMS / 媒体库）、PostgreSQL + Prisma（25 张业务表、1 个 migration）、完整 REST API、媒体上传与选择、Public Cover 与 Public Gallery。

仍需注意：站点的**业务内容**（职业经历、联系方式、社交账号、案例结果）目前仍是明确占位数据，来自数据库 seed，上线前必须替换为真实内容；GitHub / Demo 链接在无真实数据时不会渲染；Gallery 与 Cover 使用原始上传文件（无图片优化管线）；备份 / 恢复流程已实现并通过隔离演练（Phase 5-G），但**定时调度与 offsite 落地、真实域名下的公网证书、CI/CD 仍未实现**（Phase 5-H+）。
