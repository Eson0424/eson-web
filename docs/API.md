# Eson_web API Specification

**Project:** Eson_web  
**Version:** 1.0  
**Status:** Approved  
**Last Updated:** 2026-09-13

---

# 1. API Overview

Eson_web 后端采用：

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- REST API
- JWT Authentication
- OpenAPI / Swagger

API Base Path：

```text
/api/v1
```

Production API 示例：

```text
https://<SITE_DOMAIN>/api/v1        （V1 单域名部署：站点 / Admin / API / 媒体同源，Phase 5-F）
https://api.example.com/api/v1      （仅当显式拆分 API 子域时才使用）
```

同源部署下 Caddy 把 `/api/*` 与 `/media/*` 转发到 backend，其余路径交给 Nuxt；
浏览器与服务端（SSR）使用不同的 base：SSR 走 Docker 内网（`NUXT_API_BASE_SERVER`），
详见 docs/ARCHITECTURE.md §44.1。

Local：

```text
http://localhost:3001/api/v1
```

---

# 2. API Design Principles

API 必须遵循：

1. RESTful resource-oriented design
2. JSON request / response
3. HTTP status codes
4. 统一 Response Envelope
5. 统一 Error Format
6. DTO validation
7. 明确 Public / Admin 权限边界
8. API versioning
9. Pagination
10. Locale support
11. Rate limiting
12. OpenAPI documentation

禁止：

- Controller 直接操作 Prisma
- Controller 编写复杂业务逻辑
- 返回数据库内部结构作为 Public API
- 将 password / passwordHash 返回给前端
- 将内部异常直接暴露给客户端

标准调用链：

```text
Controller
   ↓
DTO Validation
   ↓
Service
   ↓
Prisma
   ↓
PostgreSQL
```

---

# 3. API Versioning

当前版本：

```text
v1
```

统一：

```text
/api/v1
```

未来出现 Breaking Change 时：

```text
/api/v2
```

V1 内不得随意进行 Breaking Change。

---

# 4. Authentication

使用 JWT。

Admin API 默认要求：

```http
Authorization: Bearer <access_token>
```

凭证传输规则：

```text
Access Token  → 响应体返回，请求时使用 Authorization: Bearer
Refresh Token → 仅通过 HttpOnly Cookie 传输（HttpOnly + Secure + SameSite）
```

禁止将 Refresh Token 存入 localStorage、sessionStorage 或任何可被 JavaScript 读取的位置。

认证接口：

```text
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET  /auth/me
```

---

## 4.1 Login

```http
POST /api/v1/auth/login
```

Request：

```json
{
  "email": "admin@example.com",
  "password": "********"
}
```

Response：

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-access-token",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "role": "ADMIN"
    }
  },
  "meta": null
}
```

Refresh Token 通过响应头下发，不进入响应体：

```http
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
```

`POST /api/v1/auth/refresh` 从 Cookie 读取 Refresh Token。

登录失败：

```http
401 Unauthorized
```

必须进行：

- 登录频率限制
- 密码错误次数控制
- 不泄露“用户不存在”还是“密码错误”
- 日志记录异常登录行为

---

# 5. Standard Response

所有成功 API 使用：

```json
{
  "success": true,
  "data": {},
  "meta": null
}
```

List API：

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 12,
    "total": 36,
    "totalPages": 3
  }
}
```

---

# 6. Standard Error

统一：

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  },
  "meta": null
}
```

常见 Error Code：

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
INVALID_CREDENTIALS
INVALID_TOKEN
RESOURCE_PUBLISHED
RESOURCE_ARCHIVED
FILE_UPLOAD_ERROR
INTERNAL_ERROR
```

禁止向 Public API 返回：

```text
stack trace
database query
SQL error
password information
internal file path
server secrets
JWT secret
```

---

# 7. HTTP Status Codes

统一使用：

| Status | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

# 8. Locale

支持：

```text
zh-CN
en-US
```

默认：

```text
zh-CN
```

优先使用 Query：

```text
?locale=zh-CN
```

也支持：

```http
Accept-Language: zh-CN
```

优先级：

```text
Query locale
↓
Accept-Language
↓
zh-CN
```

如果 Public API 请求的语言不存在：

```text
en-US → fallback → zh-CN
```

Admin API 不进行静默 fallback。

Admin 必须明确显示：

```text
Translation Missing
```

---

# 9. Pagination

List API 默认：

```text
page = 1
pageSize = 12
```

最大：

```text
pageSize = 100
```

示例：

```text
GET /work?page=2&pageSize=12
```

统一返回：

```json
{
  "page": 2,
  "pageSize": 12,
  "total": 48,
  "totalPages": 4
}
```

---

# 10. Work API

## Public

```text
GET /work
GET /work/:slug
```

## Admin

```text
GET    /api/v1/admin/works
GET    /api/v1/admin/works/:id
POST   /api/v1/admin/works
PATCH  /api/v1/admin/works/:id
DELETE /api/v1/admin/works/:id
```

Admin Work 还依赖以下只读参考数据接口：

```text
GET /api/v1/admin/categories
GET /api/v1/admin/tags
GET /api/v1/admin/media
```

> 命名提醒：Backend API 使用复数资源名 `/api/v1/admin/works`；Frontend Admin 路由是单数的 `/admin/work`。两者不是同一个地址，禁止混用。

---

## 10.1 Public Work List

```http
GET /api/v1/work
```

Query：

```text
page
pageSize
locale
featured
category
tag
sort
```

Example：

```text
GET /api/v1/work?locale=zh-CN&featured=true&page=1&pageSize=6
```

Public API 只能返回：

```text
status = PUBLISHED
published_at IS NOT NULL
```

---

## 10.2 Public Work Detail

```http
GET /api/v1/work/:slug
```

Example：

```text
GET /api/v1/work/eson-web
```

返回：

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "eson-web",
    "title": "Eson_web",
    "subtitle": "Personal Engineering Website",
    "summary": "...",
    "content": "...",
    "featured": true,
    "cover": {},
    "gallery": [
      {
        "id": "media-uuid",
        "caption": null,
        "sortOrder": 0,
        "media": {
          "url": "https://...",
          "alt": "...",
          "width": 1600,
          "height": 900
        }
      }
    ],
    "categories": [],
    "tags": [],
    "githubUrl": "...",
    "demoUrl": "...",
    "projectUrl": "...",
    "startDate": "2026-01-01",
    "endDate": null,
    "publishedAt": "2026-09-01T00:00:00Z"
  }
}
```

`gallery` 规则：

```text
仅在 detail（/:slug）返回；list 不返回 gallery（避免响应膨胀）
顺序 = work_media.sort_order ASC（backend authoritative，frontend 不再排序）
cover 可以同时出现在 gallery 中（不自动去重）
caption 未填写时为 null（不生成、不用 title 伪造）
只暴露公开字段（url / alt / width / height），不含 storageKey 或文件系统路径
无 gallery 时返回 []
```

---

## 10.3 Admin Work List

```http
GET /api/v1/admin/works
Authorization: Bearer <access token>
```

Authentication / Authorization：

```text
JwtAuthGuard  → 缺失或非法 Access Token → 401 UNAUTHORIZED
AdminRoleGuard → token 合法但 role != ADMIN → 403 FORBIDDEN
```

Query：

```text
page         默认 1，最小 1
pageSize     默认 12，最大 100
status       DRAFT | PUBLISHED | ARCHIVED
featured     true | false
search       最大 100 字符；匹配 slug 或任意翻译标题（大小写不敏感）
category     Category slug（小写 url-safe）
tag          Tag slug（小写 url-safe）
locale       zh-CN | en-US（默认 zh-CN，只影响展示名选择，不影响数据集合）
sort         createdAt | updatedAt | publishedAt | sortOrder
order        asc | desc
```

Filtering / Sorting 规则：

```text
Admin List 不做 published-only 过滤：不带 status 时返回全部状态（DRAFT / PUBLISHED / ARCHIVED）
sort 与 order 都不传 → 默认 updatedAt desc
只传其中一个 → 走排序白名单：非法字段回退 sortOrder，非法方向回退 asc
sort 与 order 只要传了非白名单值 → 400 VALIDATION_ERROR（DTO 层拦截）
分页统一使用 page / pageSize，禁止 limit
```

Response：

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "eson-web",
      "status": "PUBLISHED",
      "featured": true,
      "title": "Eson_web",
      "locale": "zh-CN",
      "translationStatus": { "zh-CN": true, "en-US": false },
      "missingLocales": ["en-US"],
      "categories": [{ "id": "uuid", "slug": "platform", "name": "平台" }],
      "tags": [{ "id": "uuid", "slug": "nuxt", "name": "Nuxt" }],
      "publishedAt": "2026-06-21T00:00:00.000Z",
      "createdAt": "2026-06-21T00:00:00.000Z",
      "updatedAt": "2026-06-21T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 12, "total": 6, "totalPages": 1 }
}
```

说明：

```text
title / categories[].name / tags[].name 按 locale 选择，缺失时回退 zh-CN，再回退 slug
translationStatus + missingLocales 用于 Admin 明确显示 “Translation Missing”
totalPages = 0 表示结果集为空
```

Errors：`400 VALIDATION_ERROR`、`401 UNAUTHORIZED`、`403 FORBIDDEN`、`500 INTERNAL_ERROR`。

---

## 10.4 Admin Work Detail

```http
GET /api/v1/admin/works/:id
Authorization: Bearer <access token>
```

`:id` 必须是 UUID；非 UUID → `400 VALIDATION_ERROR`；不存在 → `404 NOT_FOUND`。

Response（包含全部 translations 与关系 ID，供编辑表单回填）：

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "eson-web",
    "status": "PUBLISHED",
    "featured": true,
    "sortOrder": 1,
    "coverMediaId": "uuid",
    "cover": { "url": "https://...", "alt": "", "width": 1600, "height": 900 },
    "githubUrl": "https://github.com/...",
    "demoUrl": null,
    "projectUrl": null,
    "startDate": "2026-01-01",
    "endDate": null,
    "publishedAt": "2026-06-21T00:00:00.000Z",
    "createdAt": "2026-06-21T00:00:00.000Z",
    "updatedAt": "2026-06-21T00:00:00.000Z",
    "translations": [
      {
        "locale": "zh-CN",
        "title": "Eson_web",
        "subtitle": null,
        "summary": "...",
        "content": "...",
        "seoTitle": null,
        "seoDescription": null
      }
    ],
    "categoryIds": ["uuid"],
    "tagIds": ["uuid"],
    "mediaIds": ["uuid"]
  },
  "meta": null
}
```

说明：

```text
translations 为数组，未创建的 locale 不会出现（Admin 据此显示缺失）
categoryIds / tagIds / mediaIds 是 join 表的 ID 列表，供编辑表单回填
cover 与 coverMediaId 同时返回，cover 为可选媒体对象
日期时间统一 ISO 8601 UTC；startDate / endDate 为 YYYY-MM-DD
```

---

## 10.5 Admin Work Create

```http
POST /api/v1/admin/works
Authorization: Bearer <access token>
Content-Type: application/json
```

Request Body：

```json
{
  "slug": "eson-web",
  "status": "DRAFT",
  "featured": false,
  "sortOrder": 0,
  "coverMediaId": null,
  "githubUrl": null,
  "demoUrl": null,
  "projectUrl": null,
  "startDate": null,
  "endDate": null,
  "publishedAt": null,
  "translations": [
    {
      "locale": "zh-CN",
      "title": "Eson_web",
      "subtitle": null,
      "summary": "...",
      "content": "...",
      "seoTitle": null,
      "seoDescription": null
    }
  ],
  "categoryIds": ["uuid"],
  "tagIds": ["uuid"],
  "mediaIds": ["uuid"]
}
```

Validation：

```text
slug          必填；^[a-z0-9]+(?:-[a-z0-9]+)*$；最长 120
status        必填；DRAFT | PUBLISHED | ARCHIVED
featured      可选；boolean，默认 false
sortOrder     可选；int，默认 0
coverMediaId  可选；UUID | null
githubUrl / demoUrl / projectUrl  可选；必须 http(s)://，最长 500
startDate / endDate / publishedAt 可选；ISO date string
translations  必填；至少 1 条；locale 只能是 zh-CN | en-US；title 必填且最长 200
categoryIds / tagIds / mediaIds    可选；UUID 数组，元素不可重复
```

Status / publishedAt 行为：

```text
status = PUBLISHED 且未提供 publishedAt → 后端写入当前 UTC 时间
status = PUBLISHED 且提供 publishedAt   → 使用提供的时间
status = DRAFT | ARCHIVED               → 不会凭空生成 publishedAt（保持 null）
```

Transaction 行为：`work` + `translations` + 关系（`work_categories` / `work_tags` / `work_media`）在同一事务内写入，任一步失败整体回滚。

Response：`201 Created`，`data` 结构同 [10.4 Admin Work Detail](#104-admin-work-detail)。

Errors：

```text
400 VALIDATION_ERROR  DTO 校验失败（含非法 slug / status / UUID / locale）
401 UNAUTHORIZED      未认证
403 FORBIDDEN         非 ADMIN
409 CONFLICT          slug 已存在（P2002）或引用的 category / tag / media 不存在（P2003）
```

---

## 10.6 Admin Work Update

```http
PATCH /api/v1/admin/works/:id
Authorization: Bearer <access token>
Content-Type: application/json
```

Request Body：所有字段可选（Partial），语义与 Create 相同。

```json
{
  "status": "PUBLISHED",
  "featured": true,
  "translations": [{ "locale": "en-US", "title": "Eson_web" }]
}
```

行为规则：

```text
基础字段：只更新传入的字段（未传字段保持原值）
translations：按 (workId, locale) upsert；只处理传入的 locale，未传入的翻译保持原样
关系字段：替换语义（replace）
  - categoryIds / tagIds / mediaIds 传入数组 → 先清空该关系再写入新集合
  - 传入 [] → 清空关系
  - 不传 → 保持原关系不变
mediaIds 顺序会写入 work_media.sortOrder（0 开始），用于 Gallery 排序
status 变更时 publishedAt 由后端保证一致：
  - 改为 PUBLISHED 且无 publishedAt → 补当前 UTC
  - 改为 PUBLISHED 且提交 publishedAt → 使用提交值
  - 改为 DRAFT | ARCHIVED → 保留原 publishedAt，不伪造新时间
```

Response：`200 OK`，`data` 结构同 [10.4 Admin Work Detail](#104-admin-work-detail)。

Errors：同 [10.5 Admin Work Create](#105-admin-work-create)，其中 `409 CONFLICT` 也表示 slug 冲突；冲突时原数据不会被破坏。

---

## 10.7 Admin Work Delete

```http
DELETE /api/v1/admin/works/:id
Authorization: Bearer <access token>
```

Response：

```json
{
  "success": true,
  "data": { "id": "uuid", "deleted": true },
  "meta": null
}
```

Transaction 行为：

```text
同一事务内按顺序删除：
1. work_translations
2. work_categories
3. work_tags
4. work_media
5. works
Category / Tag / Media 本体不会被删除
```

Errors：`400 VALIDATION_ERROR`（非 UUID）、`401 UNAUTHORIZED`、`403 FORBIDDEN`、`404 NOT_FOUND`。

---

## 10.8 Admin Reference Data & Statistics

Work 编辑表单需要的只读参考数据，以及 Dashboard 统计。全部要求 `Authorization: Bearer <access token>` + `ADMIN` role。

```http
GET /api/v1/admin/categories
GET /api/v1/admin/tags
GET /api/v1/admin/media
GET /api/v1/admin/stats
```

`GET /api/v1/admin/categories`：

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "slug": "frontend", "name": "前端", "translationStatus": { "zh-CN": true, "en-US": false } }
  ],
  "meta": null
}
```

`GET /api/v1/admin/tags`：结构同上（name 取 zh-CN，缺失时回退第一条翻译，再回退 slug）。

`GET /api/v1/admin/media`：

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "url": "https://...",
      "filename": "placeholder-1.webp",
      "mimeType": "image/webp",
      "width": 1600,
      "height": 900,
      "alt": "",
      "createdAt": "2026-06-21T00:00:00.000Z"
    }
  ],
  "meta": null
}
```

```text
Media 为只读列表（Phase 4-F 才实现上传）；无分页参数，按 createdAt desc 返回最多 100 条
```

`GET /api/v1/admin/stats`（真实计数，不做估算）：

```json
{
  "success": true,
  "data": {
    "works": { "published": 4, "draft": 1, "archived": 1 },
    "labs": { "published": 0, "draft": 0, "archived": 0 },
    "writings": { "published": 0, "draft": 0, "archived": 0 },
    "experiences": { "total": 0 },
    "messages": { "unread": 0, "total": 0 },
    "media": { "total": 0 }
  },
  "meta": null
}
```

Errors：`401 UNAUTHORIZED`、`403 FORBIDDEN`、`500 INTERNAL_ERROR`。

---

# 11. Lab API

## Public

```text
GET /lab
GET /lab/:slug
```

## Admin

```text
GET    /api/v1/admin/labs
GET    /api/v1/admin/labs/:id
POST   /api/v1/admin/labs
PATCH  /api/v1/admin/labs/:id
DELETE /api/v1/admin/labs/:id
```

> 与 Work 相同：Backend API 使用复数资源名 `/api/v1/admin/labs`，Frontend Admin 路由是 `/admin/lab`。
> Lab 复用 Work 的 categories / tags / media 只读参考接口（见 §10.8）。

Public Lab 同样只返回：

```text
PUBLISHED
```

Public Lab detail（`GET /lab/:slug`）与 Work 一致，额外返回 `gallery`（结构见 §10.2 的 `gallery` 规则）；
Lab list 不返回 gallery。

支持：

```text
locale
featured
category
tag
page
pageSize
sort
```

Lab 与 Work 的核心区别：

```text
Work
→ 完成型项目
→ 强调结果 / 产品 / 工程

Lab
→ 实验 / 原型 / 技术探索
→ 强调过程 / 技术 / 可能性
```

---

## 11.1 Admin Lab API

Lab Admin API 由 `JwtAuthGuard + AdminRoleGuard` 保护，请求/响应结构与 Work 一致（§10.3–§10.7），
差别只在于资源路径与 Lab 的字段集合。

```text
GET    /api/v1/admin/labs            分页 / 状态 / 精选 / 搜索 / 排序 / 分类 / 标签
GET    /api/v1/admin/labs/:id        详情（全部 translations + 关系 ID）
POST   /api/v1/admin/labs            创建（事务：lab + translations + relations）
PATCH  /api/v1/admin/labs/:id        更新（部分字段；slug 冲突 → CONFLICT）
DELETE /api/v1/admin/labs/:id        删除（事务：翻译 + join 记录 + lab 本体）
```

Query 参数与 Work 完全相同：

```text
page          默认 1
pageSize      默认 12，最大 100
status        DRAFT | PUBLISHED | ARCHIVED
featured      true | false
search        匹配 slug 或翻译标题（大小写不敏感，最长 100）
category      Category slug
tag           Tag slug
locale        zh-CN | en-US（只影响展示名选择）
sort          createdAt | updatedAt | publishedAt | sortOrder
order         asc | desc
```

Lab 与 Work 的字段差异：

```text
labs 表没有 start_date / end_date
→ CreateLabDto / UpdateLabDto 不接受 startDate / endDate
→ Admin Lab 详情响应不包含 startDate / endDate
其余字段与 Work 相同：
  slug, status, featured, sortOrder, coverMediaId,
  githubUrl, demoUrl, projectUrl, publishedAt,
  translations[], categoryIds[], tagIds[], mediaIds[]
```

Request Body（创建）：

```json
{
  "slug": "agent-workflow-prototype",
  "status": "DRAFT",
  "featured": false,
  "sortOrder": 0,
  "coverMediaId": null,
  "githubUrl": null,
  "demoUrl": null,
  "projectUrl": null,
  "publishedAt": null,
  "translations": [
    {
      "locale": "zh-CN",
      "title": "Agent Workflow 原型",
      "subtitle": null,
      "summary": "...",
      "content": "...",
      "seoTitle": null,
      "seoDescription": null
    }
  ],
  "categoryIds": [],
  "tagIds": [],
  "mediaIds": []
}
```

行为规则（与 Work 一致）：

```text
status = PUBLISHED 且未提供 publishedAt → 后端写入当前 UTC
status = DRAFT | ARCHIVED              → 不凭空生成 publishedAt
translations                          → 按 (labId, locale) upsert；未传入的 locale 保持原样
categoryIds / tagIds / mediaIds       → 替换语义（不传 = 保持，[] = 清空）
mediaIds 顺序写入 lab_media.sort_order
删除只清理 lab_translations / lab_categories / lab_tags / lab_media 与 lab 本体
Category / Tag / Media 本体不会被删除
```

Errors：`400 VALIDATION_ERROR`、`401 UNAUTHORIZED`、`403 FORBIDDEN`、`404 NOT_FOUND`、`409 CONFLICT`（slug 冲突 P2002 / 引用不存在 P2003）、`500 INTERNAL_ERROR`。

Lab 列表与详情的响应形状与 §10.3 / §10.4 相同（`meta` 为分页信息，详情 `meta: null`）。

---

# 12. Writing API

## Public

```text
GET /writing
GET /writing/:slug
```

## Admin

```text
GET    /api/v1/admin/writings
GET    /api/v1/admin/writings/:id
POST   /api/v1/admin/writings
PATCH  /api/v1/admin/writings/:id
DELETE /api/v1/admin/writings/:id
```

> Backend API 使用复数资源名 `/api/v1/admin/writings`；Frontend Admin 路由是 `/admin/writing`。
> Writing 复用 Work / Lab 的 categories / tags / media 只读参考接口（见 §10.8）。

---

## 12.1 Writing List

```http
GET /api/v1/writing
```

Query：

```text
page
pageSize
locale
category
tag
featured
sort
```

支持：

```text
publishedAt DESC
publishedAt ASC
createdAt DESC
```

默认：

```text
publishedAt DESC
```

---

## 12.2 Writing Detail

```http
GET /api/v1/writing/:slug
```

返回：

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "building-ai-agent",
    "title": "Building AI Agents",
    "subtitle": "...",
    "excerpt": "...",
    "content": "...",
    "readingTime": 8,
    "author": {},
    "categories": [],
    "tags": [],
    "cover": {},
    "publishedAt": "2026-09-01T00:00:00Z"
  },
  "meta": null
}
```

---

## 12.3 Admin Writing API

Writing Admin API 由 `JwtAuthGuard + AdminRoleGuard` 保护，请求/响应结构与 Work / Lab 一致（§10.3–§10.7、§11.1），
差别只在资源路径与 Writing 自己的字段集合。

```text
GET    /api/v1/admin/writings            分页 / 状态 / 精选 / 搜索 / 排序 / 分类 / 标签
GET    /api/v1/admin/writings/:id        详情（全部 translations + 关系 ID）
POST   /api/v1/admin/writings            创建（事务：writing + translations + relations）
PATCH  /api/v1/admin/writings/:id        更新（部分字段；slug 冲突 → CONFLICT）
DELETE /api/v1/admin/writings/:id        删除（事务：翻译 + join 记录 + 文章本体）
```

Query 参数与 Work / Lab 相同（`page` / `pageSize` / `status` / `featured` / `search` / `category` / `tag` / `locale` / `sort` / `order`）。

Writing 的字段差异（DATABASE §12）：

```text
writings 没有 github / demo / project 链接，也没有 start / end date
writing_translations 的摘要列是 excerpt（work / lab 用 summary）
→ CreateWritingDto / UpdateWritingDto 不接受 githubUrl / demoUrl / projectUrl / startDate / endDate
→ 翻译对象只接受 excerpt，不接受 summary（ValidationPipe forbidNonWhitelisted → 400）
→ Admin 详情响应不包含上述字段，translations[] 只包含 excerpt
```

Request Body（创建）：

```json
{
  "slug": "notes-on-agent-workflows",
  "status": "DRAFT",
  "featured": false,
  "sortOrder": 0,
  "coverMediaId": null,
  "publishedAt": null,
  "translations": [
    {
      "locale": "zh-CN",
      "title": "Agent Workflow 笔记",
      "subtitle": null,
      "excerpt": "摘要",
      "content": "# Heading\n\n- item\n\n```js\nconst hello = \"world\"\n```",
      "seoTitle": null,
      "seoDescription": null
    }
  ],
  "categoryIds": [],
  "tagIds": [],
  "mediaIds": []
}
```

Markdown 行为：

```text
content 按原样写入数据库、按原样返回（不做 trim / 转义 / 解析）
Public Writing Detail 再按 Markdown 语义渲染
→ # / ## / ### 标题、- 列表、``` 代码块、**加粗** / *斜体* / `行内代码`
```

行为规则与错误码与 Work / Lab 相同：

```text
status = PUBLISHED 且未提供 publishedAt → 后端写入当前 UTC
status = DRAFT | ARCHIVED              → 不凭空生成 publishedAt
translations                          → 按 (writingId, locale) upsert
categoryIds / tagIds / mediaIds       → 替换语义（不传 = 保持，[] = 清空）
400 VALIDATION_ERROR / 401 UNAUTHORIZED / 403 FORBIDDEN / 404 NOT_FOUND /
409 CONFLICT（slug P2002 或引用不存在 P2003）/ 500 INTERNAL_ERROR
```

---

# 13. Experience API

## Public

```text
GET /experience
```

## Admin

```text
GET    /api/v1/admin/experiences
GET    /api/v1/admin/experiences/:id
POST   /api/v1/admin/experiences
PATCH  /api/v1/admin/experiences/:id
DELETE /api/v1/admin/experiences/:id
```

排序（Public 与 Admin 默认一致）：

```text
sortOrder ASC
startDate DESC
createdAt DESC
```

---

## 13.1 Experience 数据模型与字段事实来源

Experience 与 Work / Lab / Writing 的模型差异必须在实现前明确（DATABASE §20–22）：

```text
experiences            → id, company?, role?, employment_type?, location?,
                         start_date?, end_date?, is_current, sort_order, created_at, updated_at
experience_translations → id, experience_id, locale, company_name?, role_name (NOT NULL),
                         summary?, content?, created_at, updated_at
```

```text
没有 slug
没有 status / featured / published_at
没有 cover / media / categories / tags（不存在 experience_* 关系表）
翻译层没有 seo_title / seo_description
```

字段事实来源：

```text
role / company 只存在于 experience_translations（role_name / company_name）
experiences.company / experiences.role 在本阶段保持 NULL，不由 Admin 写入
```

---

## 13.2 Public Experience 可见性（发布规则的明确例外）

其它内容类型的 Public API 只返回 `status = PUBLISHED` 且 `published_at IS NOT NULL` 的数据。

Experience 是**明确的例外**：

```text
experiences 没有 status / published_at 列
→ 所有已存在的 Experience 都可以被 Public API 读取
→ 没有草稿 / 归档状态，删除是唯一的下线方式
```

因此 Public Experience 列表不带任何发布状态过滤，这是数据模型决定的，不是遗漏。

---

## 13.3 Admin Experience API

由 `JwtAuthGuard + AdminRoleGuard` 保护，统一 envelope 与错误码（§10.3–§10.7 同规范）。

```text
GET    /api/v1/admin/experiences        分页 / 搜索 / 排序 / locale
GET    /api/v1/admin/experiences/:id    详情（全部 translations）
POST   /api/v1/admin/experiences        创建（事务：experience + translations）
PATCH  /api/v1/admin/experiences/:id    更新（事务：字段合并 + translations upsert）
DELETE /api/v1/admin/experiences/:id    删除（事务：translations + experience）
```

Query：

```text
page        默认 1
pageSize    默认 12，最大 100
search      匹配 role_name / company_name / location（大小写不敏感，最长 100）
sort        createdAt | updatedAt | sortOrder | startDate | endDate（Experience 专属白名单）
order       asc | desc
locale      zh-CN | en-US（只影响展示用 role/company 的选择）
```

```text
不接受 status / featured 参数（experiences 没有这两列）
sort 白名单不接受 publishedAt（该列不存在）
不传 sort/order 时使用默认顺序：sortOrder ASC → startDate DESC → createdAt DESC
```

Request Body（创建）：

```json
{
  "sortOrder": 1,
  "employmentType": "FULL_TIME",
  "location": "Shanghai",
  "startDate": "2024-01-01",
  "endDate": null,
  "isCurrent": true,
  "translations": [
    {
      "locale": "zh-CN",
      "roleName": "软件工程师",
      "companyName": "示例公司",
      "summary": "摘要",
      "content": "详细内容"
    }
  ]
}
```

Validation：

```text
employmentType  可选；只能是 FULL_TIME | PART_TIME | FREELANCE | CONTRACT | SELF_EMPLOYED | OTHER
location        可选；最长 200
startDate / endDate  可选；ISO date string
isCurrent       可选；boolean，默认 false
translations    必填；至少 1 条；locale 只能是 zh-CN | en-US；roleName 必填且最长 200
                companyName 最长 200；summary 最长 2000
同一请求内 locale 不能重复 → 400 VALIDATION_ERROR（DUPLICATE_LOCALE）
isCurrent = true 时 endDate 必须为空 → 否则 400 VALIDATION_ERROR（CURRENT_WITH_END_DATE）
startDate 不能晚于 endDate → 否则 400 VALIDATION_ERROR（INVALID_DATE_RANGE）
```

Response（列表项）：

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "role": "软件工程师",
      "company": "示例公司",
      "employmentType": "FULL_TIME",
      "location": "Shanghai",
      "startDate": "2024-01-01",
      "endDate": null,
      "isCurrent": true,
      "sortOrder": 1,
      "locale": "zh-CN",
      "localeFallback": false,
      "translationStatus": { "zh-CN": true, "en-US": false },
      "missingLocales": ["en-US"],
      "createdAt": "2026-09-01T00:00:00.000Z",
      "updatedAt": "2026-09-01T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 12, "total": 2, "totalPages": 1 }
}
```

Errors：

```text
400 VALIDATION_ERROR   DTO 校验失败 / 重复 locale / isCurrent 与 endDate 冲突 / 非法日期区间
401 UNAUTHORIZED       未认证
403 FORBIDDEN          非 ADMIN
404 NOT_FOUND          不存在的 Experience
500 INTERNAL_ERROR
```

```text
Experience 没有 slug 与唯一业务列，因此不会出现 409 CONFLICT
```

---

# 14. Category API

## Public

```text
GET /categories
```

## Admin

```text
GET    /admin/categories
GET    /admin/categories/:id
POST   /admin/categories
PATCH  /admin/categories/:id
DELETE /admin/categories/:id
```

Category 支持：

```text
zh-CN
en-US
```

Translation 通过独立 Translation Record 管理。

---

# 15. Tag API

## Public

```text
GET /tags
```

## Admin

```text
GET    /admin/tags
GET    /admin/tags/:id
POST   /admin/tags
PATCH  /admin/tags/:id
DELETE /admin/tags/:id
```

Tag slug 必须唯一。

---

# 16. Media API

Media 存储通过 **StorageService** 抽象：

```text
StorageDriver
├── LocalStorageDriver          当前实现（本地文件系统，bucket 根默认 <backend>/.data）
├── UnconfiguredStorageDriver   fail-fast（对象存储未配置 / 驱动名非法）
└── S3StorageDriver             DEFERRED / NOT IMPLEMENTED
```

> `STORAGE_DRIVER=s3` 当前会直接失败（fail-fast），不会伪造上传成功。
> 本地媒体通过后端只读静态路由 `/media/<object-key>` 提供，object key 形如
> `media/<yyyy>/<mm>/<uuid>.<ext>`（详见 docs/ARCHITECTURE.md §28）。

PostgreSQL 保存：

```text
storage_key
url
filename
original_filename
mime_type
size
width
height
alt
metadata
```

> `storage_key` 只存在于数据库与存储层，**不通过任何 API 返回**。
> 私有存储路径、bucket 配置、凭证同样不会出现在响应中。
>
> 生产环境（Phase 5-E）：`MEDIA_PUBLIC_BASE_URL` 由部署环境注入，缺失时 backend 拒绝启动
> （不会退化成 `http://localhost:<API_PORT>`）。`url` 始终是
> `<MEDIA_PUBLIC_BASE_URL>/media/<yyyy>/<mm>/<uuid>.<ext>`，绝不出现磁盘路径
> （`/srv/eson-media/...`）或 `file://`。详见 docs/ARCHITECTURE.md §28.3。

---

## 16.1 Upload

```http
POST /api/v1/admin/media
```

使用：

```text
multipart/form-data
```

字段：

```text
file
alt（可选）
```

允许的图片类型：

```text
image/jpeg
image/png
image/webp
image/avif
```

**SVG 不在白名单内，会被拒绝**（`MIME_NOT_ALLOWED`）。

V1 限制：

```text
单文件 ≤ 10MB
像素上限 ≤ 40MP（40,000,000）
```

服务端按顺序执行（**IMPLEMENTED**）：

```text
1. 文件存在
2. 文件大小（≤10MB）
3. 声明的 MIME 必须在白名单内
4. 文件扩展名必须在白名单内
5. magic bytes（真实文件签名：PNG / JPEG / RIFF-WEBP / ISO-BMFF ftyp=avif|avis）
6. MIME 与签名一致、扩展名与签名一致
7. 图片尺寸可解析，且像素数 ≤ 40MP
```

禁止直接信任客户端 MIME。

写入顺序（重要）：

```text
storage.put() 成功 → 才创建数据库记录
storage.put() 失败 → 不写数据库
数据库创建失败    → 补偿删除已写入的对象（补偿失败仅记录结构化日志，不外泄细节）
```

失败响应使用统一错误封装，稳定 reason（`details[0].reason`）包括：

```text
FILE_MISSING / FILE_EMPTY / FILE_TOO_LARGE
MIME_NOT_ALLOWED / EXTENSION_NOT_ALLOWED
SIGNATURE_MISMATCH / MIME_MISMATCH / EXTENSION_MISMATCH
IMAGE_TOO_LARGE / DIMENSIONS_UNREADABLE / MALFORMED_UPLOAD
STORAGE_UNAVAILABLE / STORAGE_WRITE_FAILED
DATABASE_ERROR
```

上传链路错误统一使用 `FILE_UPLOAD_ERROR` 错误码（HTTP 状态按原因区分）。

认证 / 授权：`JwtAuthGuard + AdminRoleGuard`（`/api/v1/admin/*`）。

---

## 16.2 Media List

```http
GET /api/v1/admin/media
```

支持：

```text
page
pageSize
```

```text
默认 pageSize = 100
最大 pageSize = 100（超出即校验失败）
排序固定为 createdAt DESC（不提供 sort / order 参数）
```

> **不支持** `mimeType`、`search`、`status`、`featured`、`sort`、`order` 等参数。
> 后端使用 `ValidationPipe({ whitelist, forbidNonWhitelisted })`，未知参数不是被忽略，而是直接返回 `VALIDATION_ERROR`。

响应：`data` 为媒体数组，`meta` 为分页信息：

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "pageSize": 100, "total": 0, "totalPages": 0 }
}
```

管理端视图字段：

```text
id
url
filename
originalFilename
mimeType
size
width
height
alt
provider        （仅驱动名，例如 local）
createdAt
updatedAt
```

明确不返回：`storageKey`、文件系统路径、bucket 配置、凭证。

---

## 16.3 Media Update（alt）

```http
PATCH /api/v1/admin/media/:id
```

请求体：

```json
{ "alt": "..." }
```

- **只有 `alt` 可以修改**（schema 中唯一可编辑的元数据）
- 传入 `null` 或空字符串表示清空 alt
- 传入其它字段会因 `forbidNonWhitelisted` 被拒绝
- 响应返回更新后的管理端视图（结构同 §16.2 的字段列表）

---

## 16.4 Media Delete

```http
DELETE /api/v1/admin/media/:id
```

删除前进行引用检查（cover + gallery 全部关系）：

```text
references:
  worksCover
  labsCover
  writingsCover
  workMedia
  labMedia
  writingMedia
  total
```

如果 Media 仍被引用：

```http
409 Conflict
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "CONFLICT",
    "message": "Media is in use",
    "details": [{ "reason": "MEDIA_IN_USE", "references": { "...": 0, "total": 1 } }]
  },
  "meta": null
}
```

不得直接删除，也不会自动解除引用关系。

删除顺序（**不是** storage + database 的跨系统事务）：

```text
1. 先删除存储对象
2. 成功后再删除数据库记录
3. 存储删除失败 → 503（reason: STORAGE_DELETE_FAILED），数据库记录保留
```

成功响应：`{ "id": "<uuid>", "deleted": true }`。

---

## 16.5 端点边界（明确声明）

```text
不存在 GET /api/v1/admin/media/:id
不存在 Public Media API（例如 GET /api/v1/media/* 或 /api/v1/public/media）
Public Work / Lab detail 通过内容详情返回 cover 与 gallery（见 §10.2 / §11）
storageKey 与私有存储路径不出现在任何响应中
```

---

## 16.6 Public Cover

Public 站点的封面（Work / Lab / Writing）**只消费内容 API 返回的 `cover`**：

```json
{ "cover": { "url": "https://...", "alt": "...", "width": 1600, "height": 900 } }
```

- 前端不使用 `storageKey` / media id 拼接 URL
- 相对路径（如 `/media/...`）按 **API origin** 解析为绝对地址
- alt 回退顺序：`media.alt` → 内容标题 → 空字符串（装饰性）
- 图片缺失或加载失败（含 SSR 早于 hydration 失败）→ 品牌化 `PlaceholderVisual`
- detail hero 使用 `loading="eager"` + `fetchpriority="high"`；列表与卡片使用 `lazy`
- **Cover 是唯一的 `og:image` 来源**
- Writing detail 的 JSON-LD `image`、`og:image`、`twitter:image` 使用同一个 canonical cover URL；无 cover 时不生成这些字段

---

## 16.7 Public Gallery

范围（**IMPLEMENTED**）：

```text
Work   ✅
Lab    ✅
Writing ✖（不实现，不存在 Writing Gallery）
```

数据来源：内容详情 API（list 不返回 gallery）：

```http
GET /api/v1/work/:slug
GET /api/v1/lab/:slug
```

```json
{
  "gallery": [
    {
      "id": "media-uuid",
      "caption": null,
      "sortOrder": 0,
      "media": { "url": "https://...", "alt": "...", "width": 1600, "height": 900 }
    }
  ]
}
```

```text
顺序     = 后端 sort_order ASC（frontend 不再排序 / 反转 / 去重）
空 gallery = []
caption  可为 null（当前无编辑入口，实际恒为 null）
cover 可以同时出现在 gallery 中
```

渲染（**IMPLEMENTED**）：

```text
固有比例展示（width/height），不做裁切，不使用 object-cover
缺少尺寸 → 稳定比例容器 + object-contain（不塌陷、不变形）
布局：desktop 2 列 / tablet 2 列 / mobile 1 列
loading="lazy" + decoding="async"，不使用 fetchpriority
单张加载失败只影响该张（回退 PlaceholderVisual），不影响其它图片或页面
caption 为 null / 空 / 空白 → 不渲染 caption 节点
alt 回退同 §16.6
静态展示：无 lightbox / zoom / fullscreen / 键盘图片导航 / 手势导航
不进入 structured data（不扩展 JSON-LD）
```

图片资源：

```text
当前直接使用原始上传文件
无 srcset、无响应式图源生成、无压缩 / 转码、无 CDN（均为 DEFERRED）
```

---

## 16.8 Rate Limiting

当前实际限流（**IMPLEMENTED**）：

```text
全局默认      100 requests / 60s（所有端点）
POST /contact  5 / hour
POST /auth/login  5 / 15 minutes
```

媒体相关：

```text
Dedicated media upload rate limit: 10/min — PLANNED / DEFERRED
```

> 当前**不存在** upload 专用的 10/min 限流；媒体上传仅受全局 100/min 约束。
> 该专项限流未实现，属后续阶段工作，不得视为已实现。

---

# 17. Contact API

Public：

```http
POST /api/v1/contact
```

Request：

```json
{
  "name": "John",
  "email": "john@example.com",
  "subject": "Project Collaboration",
  "message": "Hello..."
}
```

Validation：

```text
name      1–100 chars
email     valid email
subject   1–200 chars
message   1–5000 chars
```

必须启用：

```text
Rate Limiting
Spam Protection
Input Validation
IP Hashing
```

不要保存原始 IP。

数据库保存：

```text
ip_hash
```

---

# 18. Contact Message Admin API

```text
GET   /admin/messages
GET   /admin/messages/:id
PATCH /admin/messages/:id
```

支持状态：

```text
UNREAD
READ
ARCHIVED
```

Query：

```text
status
page
pageSize
sort
```

默认：

```text
UNREAD first
createdAt DESC
```

---

# 19. Site Settings API

Public：

```text
GET /settings/public
```

Admin：

```text
GET   /admin/settings
PATCH /admin/settings
```

Public 只能读取允许公开的 settings。

例如：

```text
site.title
site.description
site.email
site.social.github
site.social.linkedin
site.available
site.defaultLocale
```

敏感配置绝不能通过 Public API 返回。

---

# 20. Auth Me

```http
GET /api/v1/auth/me
```

Response：

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "ADMIN"
  },
  "meta": null
}
```

---

# 21. Work Create DTO

Admin：

```http
POST /api/v1/admin/works
```

完整字段、校验规则与错误码见 [10.5 Admin Work Create](#105-admin-work-create)。

Request：

```json
{
  "slug": "eson-web",
  "status": "DRAFT",
  "featured": true,
  "sortOrder": 1,
  "coverMediaId": "uuid",
  "githubUrl": "https://github.com/...",
  "demoUrl": "https://...",
  "projectUrl": null,
  "startDate": "2026-01-01",
  "endDate": null,
  "translations": [
    {
      "locale": "zh-CN",
      "title": "Eson_web",
      "subtitle": "个人工程师品牌网站",
      "summary": "...",
      "content": "...",
      "seoTitle": "...",
      "seoDescription": "..."
    },
    {
      "locale": "en-US",
      "title": "Eson_web",
      "subtitle": "Personal Engineering Website",
      "summary": "...",
      "content": "...",
      "seoTitle": "...",
      "seoDescription": "..."
    }
  ],
  "categoryIds": [],
  "tagIds": [],
  "mediaIds": []
}
```

保存时：

```text
Work
+ translations
+ categories
+ tags
+ media
```

必须使用数据库 Transaction。

---

# 22. Content Status

统一：

```text
DRAFT
PUBLISHED
ARCHIVED
```

生命周期：

```text
DRAFT
  ↓
PUBLISHED
  ↓
ARCHIVED
```

允许：

```text
DRAFT → PUBLISHED
PUBLISHED → DRAFT
PUBLISHED → ARCHIVED
ARCHIVED → DRAFT
```

发布时必须：

```text
publishedAt = current UTC time
```

重新发布时更新：

```text
publishedAt
```

Public API 永远不能返回：

```text
DRAFT
ARCHIVED
```

---

# 23. Sorting

所有排序字段必须由后端白名单控制。

允许：

```text
createdAt
updatedAt
publishedAt
sortOrder
```

禁止客户端传入任意 SQL 字段。

例如：

```text
?sort=publishedAt
?order=desc
```

后端必须进行 enum / whitelist validation。

---

# 24. Filtering

Category：

```text
?category=ai
```

Tag：

```text
?tag=vue
```

Featured：

```text
?featured=true
```

Status：

```text
?status=PUBLISHED
```

注意：

Public API 不允许客户端通过：

```text
?status=DRAFT
```

读取 Draft。

Public API 的状态过滤由服务器强制限制。

---

# 25. Search

V1 不实现复杂全文搜索。

允许基础：

```text
?search=vue
```

只在 Admin API 中使用。

V1 不建立独立 Search Engine。

未来可以增加：

```text
SearchIndex
```

---

# 26. Authentication & Authorization

Role：

```text
ADMIN
```

V1 不实现复杂 RBAC。

未来可扩展：

```text
ADMIN
EDITOR
AUTHOR
```

权限：

```text
Public
→ Public endpoints

Admin
→ /admin/*
```

Admin Guard：

```text
JwtAuthGuard
+
RolesGuard
```

---

# 27. Rate Limiting

至少限制：

```text
POST /auth/login
POST /contact
POST /admin/media
```

建议策略：

Login：

```text
5 attempts / 15 minutes / IP
```

Contact：

```text
5 requests / hour / IP
```

Media：

```text
30 uploads / hour / authenticated user
```

实际生产参数可以根据部署环境调整。

---

# 28. Idempotency

普通 GET：

```text
naturally idempotent
```

Contact：

V1 可以通过：

```text
Idempotency-Key
```

降低重复提交风险。

Admin Create API：

V1 默认不要求。

未来如果需要批量导入或自动化操作，再加入 Idempotency-Key。

---

# 29. Validation

所有 Request DTO 必须进行服务器端验证。

推荐：

```text
class-validator
class-transformer
```

必须验证：

```text
string length
email
URL
UUID
enum
date
locale
pagination
slug
```

禁止依赖前端验证作为唯一安全机制。

---

# 30. Slug Rules

Slug：

```text
lowercase
URL-safe
ASCII preferred
```

例如：

```text
eson-web
ai-agent-lab
building-ai-agent
```

禁止：

```text
spaces
特殊控制字符
SQL fragments
```

同一资源类型内必须唯一：

```text
Work.slug UNIQUE
Lab.slug UNIQUE
Writing.slug UNIQUE
```

---

# 31. SEO API Considerations

Public Detail API 必须提供：

```text
title
description
seoTitle
seoDescription
canonical
publishedAt
```

Nuxt 根据这些字段生成：

```text
<title>
<meta name="description">
<link rel="canonical">
Open Graph
Twitter/X Card
```

API 不直接生成 HTML。

---

# 32. OpenAPI / Swagger

NestJS 必须生成 OpenAPI。

Development：

```text
/api/docs
```

示例：

```text
http://localhost:3001/api/docs
```

必须标注：

- endpoint
- method
- authentication
- request DTO
- response DTO
- error response
- query parameters
- path parameters

Swagger 必须与实际 API 保持同步。

---

# 33. API Module Structure

Backend：

```text
backend/src/

├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── responses/
│
├── config/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── work/
│   ├── lab/
│   ├── writing/
│   ├── experience/
│   ├── categories/
│   ├── tags/
│   ├── media/
│   ├── contact/
│   └── settings/
│
└── prisma/
```

每个 Module 推荐：

```text
module.ts
controller.ts
service.ts
dto/
entities/
```

---

# 34. Controller Responsibility

Controller 只负责：

```text
receive request
↓
validate DTO
↓
call service
↓
return response
```

Controller 不负责：

```text
Prisma queries
business logic
complex transformations
authorization rules
file storage logic
```

---

# 35. Service Responsibility

Service 负责：

```text
business logic
database operations
transaction
authorization-related business rules
data transformation
publish workflow
```

例如：

```text
WorkService.create()
WorkService.update()
WorkService.publish()
WorkService.archive()
WorkService.findPublicBySlug()
```

---

# 36. Repository / Prisma

V1 不强制建立复杂 Repository Pattern。

默认：

```text
Service → PrismaService
```

当数据访问复杂度增加时，再抽象 Repository。

原则：

```text
Do not abstract prematurely.
```

---

# 37. API Security

必须考虑：

```text
JWT security
password hashing
rate limiting
input validation
XSS
SQL injection
CSRF where applicable
file upload abuse
brute-force protection
authorization bypass
mass assignment
```

Admin API 必须禁止：

```text
anonymous access
```

---

# 38. Mass Assignment Protection

客户端只能修改 DTO 明确允许的字段。

禁止：

```json
{
  "role": "ADMIN"
}
```

通过普通 User Update API 修改权限。

敏感字段必须由专用业务逻辑处理。

---

# 39. Public API Data Policy

Public API 返回的数据必须经过 DTO transformation。

数据库：

```text
User
Media
ContactMessage
SiteSetting
```

不能直接：

```text
return prisma.xxx.findMany()
```

必须：

```text
Database Model
↓
Service
↓
Response DTO
↓
Public API
```

---

# 40. API Caching

V1：

Public GET API 可以使用：

```text
HTTP Cache-Control
```

尤其：

```text
GET /work
GET /work/:slug
GET /lab
GET /lab/:slug
GET /writing
GET /writing/:slug
GET /experience
```

Admin API 默认：

```text
no-cache
```

未来可以增加：

```text
Redis
CDN
ISR
```

但 V1 不强制引入 Redis。

---

# 41. API Logging

记录：

```text
request id
method
path
status
duration
user id if authenticated
error code
```

禁止记录：

```text
password
JWT token
refresh token
sensitive secrets
```

建议加入：

```text
X-Request-ID
```

用于前后端问题追踪。

---

# 42. API Transaction Rules

以下操作必须 Transaction：

```text
Create Work
Update Work
Create Lab
Update Lab
Create Writing
Update Writing
Create Experience
Update Experience
```

例如 Work：

```text
BEGIN

update work
update translations
update categories
update tags
update media

COMMIT
```

任何一步失败：

```text
ROLLBACK
```

---

# 43. API Acceptance Criteria

API v1 必须满足：

## Authentication

- [ ] Admin login works
- [ ] JWT validation works
- [ ] Admin Guard works
- [ ] Unauthorized requests return 401
- [ ] Forbidden requests return 403

## Content

- [ ] Work CRUD works
- [ ] Lab CRUD works
- [ ] Writing CRUD works
- [ ] Experience CRUD works
- [ ] Category CRUD works
- [ ] Tag CRUD works

## Public API

- [ ] Draft content never exposed
- [ ] Archived content never exposed
- [ ] Locale works
- [ ] Chinese fallback works
- [ ] Pagination works
- [ ] Sorting works
- [ ] Filtering works

## Media

- [x] Upload works                （Phase 4-F.2 / 4-F.3 阶段验证）
- [x] File validation works       （MIME / 扩展名 / magic bytes，Phase 4-F.2）
- [x] File size validation works  （≤10MB；像素上限 40MP）
- [x] Invalid file rejected       （统一 `FILE_UPLOAD_ERROR` + 稳定 reason）
- [x] Referenced media cannot be deleted（409 `MEDIA_IN_USE`）

> 以上为对应阶段的分项验证结果；跨全站的最终验收在 Phase 4-F.8 统一进行。

## Contact

- [ ] Contact submission works
- [ ] Validation works
- [ ] Rate limiting works
- [ ] Messages appear in Admin
- [ ] Message status can change

## Security

- [ ] Password never returned
- [ ] JWT never logged
- [ ] SQL injection protected
- [ ] XSS input handled
- [ ] Unauthorized Admin API rejected
- [ ] Mass assignment protected
- [ ] Upload abuse protected

## Documentation

- [ ] Swagger available
- [ ] DTO documented
- [ ] Authentication documented
- [ ] Error responses documented

---

# 44. API Development Order

Codex implementation顺序：

```text
1. Common infrastructure
        ↓
2. Config
        ↓
3. Prisma
        ↓
4. Auth
        ↓
5. Work
        ↓
6. Lab
        ↓
7. Writing
        ↓
8. Experience
        ↓
9. Category / Tag
        ↓
10. Media
        ↓
11. Contact
        ↓
12. Settings
        ↓
13. Swagger
        ↓
14. Integration tests
        ↓
15. Security review
```

---

# 45. V1 API Scope

V1 必须实现：

```text
Authentication
Work
Lab
Writing
Experience
Categories
Tags
Media
Contact
Settings
```

V1 不实现：

```text
Comments
Newsletter
Social Login
Payment
Realtime
Advanced Search
Analytics Engine
GitHub Sync
AI Content Assistant
Microservices
```

这些属于未来版本。

---

# 46. Final API Architecture

最终：

```text
                    ┌───────────────┐
                    │   Nuxt 3      │
                    │   Frontend    │
                    └───────┬───────┘
                            │
                       HTTPS / JSON
                            │
                            ▼
                    ┌───────────────┐
                    │    NestJS     │
                    │   REST API    │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
           Prisma         Auth        Object Storage
              │
              ▼
        ┌───────────────┐
        │  PostgreSQL   │
        └───────────────┘
```

API 核心原则：

```text
Simple
Predictable
Secure
Typed
Documented
Testable
```

**Status: Approved v1.0**
