# Eson_web — System Architecture

> Project: Eson_web  
> Brand: ESON  
> Document: Architecture Specification  
> Version: 1.0  
> Status: Approved  
> Language: Chinese / English  
> Default Locale: zh-CN

---

# 1. Document Purpose

本文档定义 Eson_web 的正式技术架构。

ARCHITECTURE.md 是连接产品设计与实际工程实现的核心技术文档。

它负责回答：

- 系统由哪些部分组成
- 前端和后端如何划分
- 数据如何流动
- 前后端如何通信
- 用户如何认证
- 内容如何组织
- 多语言如何实现
- 媒体资源如何存储
- SEO 如何实现
- 如何测试
- 如何部署
- Codex 应该如何参与开发

本文档不负责定义具体数据库字段。

数据库结构由：

```text
docs/DATABASE.md
```

定义。

API Contract 由：

```text
docs/API.md
```

定义。

视觉规范由：

```text
docs/DESIGN.md
```

定义。

产品需求由：

```text
docs/PRD.md
```

定义。

---

# 2. Architecture Principles

Eson_web 遵循以下核心工程原则。

## 2.1 Content First

网站首先是一个个人品牌与内容系统，其次才是视觉实验。

不能为了动画、WebGL 或视觉效果牺牲：

- 内容可读性
- SEO
- Accessibility
- Performance
- Mobile usability

---

## 2.2 Frontend / Backend Separation

Frontend 和 Backend 必须保持独立。

```text
frontend/
backend/
```

Frontend 不允许直接访问数据库。

所有业务数据必须通过 Backend API 获取。

---

## 2.3 API First

Frontend 与 Backend 通过明确的 API Contract 通信。

禁止：

```text
Frontend → Database
```

允许：

```text
Frontend
   ↓
REST API
   ↓
Backend
   ↓
Database
```

---

## 2.4 Type Safety

核心代码使用 TypeScript。

```text
Frontend → TypeScript
Backend  → TypeScript
```

数据库模型由 Prisma Schema 定义。

API DTO 必须具有明确类型。

---

## 2.5 Production Ready

V1 必须具备真实部署能力。

不能只完成：

```text
Demo
Prototype
Static Mock
```

而必须具备：

```text
Authentication
Database
API
Admin
Content Management
Error Handling
Validation
Testing
Deployment
```

---

## 2.6 Progressive Enhancement

基础网站功能必须在没有高级视觉效果的情况下正常工作。

例如：

```text
WebGL unavailable
        ↓
正常 Hero
```

而不是：

```text
WebGL unavailable
        ↓
页面无法使用
```

---

# 3. High-Level Architecture

系统整体架构：

```text
                           INTERNET
                               │
                               ▼
                    ┌────────────────────┐
                    │      Browser       │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │       Nuxt         │
                    │      Vue 3         │
                    │    TypeScript      │
                    │   SSR / SSG / CSR  │
                    └─────────┬──────────┘
                              │
                         HTTPS / REST
                              │
                              ▼
                    ┌────────────────────┐
                    │      NestJS        │
                    │    TypeScript      │
                    │   REST API v1      │
                    └─────────┬──────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
             ┌──────────────┐    ┌──────────────┐
             │  PostgreSQL  │    │ Object       │
             │    Prisma    │    │ Storage      │
             └──────────────┘    └──────────────┘
```

---

# 4. Repository Structure

项目采用单仓库结构，但 Frontend / Backend 保持独立。

```text
Eson_web/
│
├── docs/
│   ├── PRD.md
│   ├── DESIGN.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── QA.md
│   └── DEPLOYMENT.md
│
├── frontend/
│
├── backend/
│
├── tests/
│
├── docker/
│
├── .github/
│
├── AGENTS.md
├── README.md
├── .gitignore
└── docker-compose.yml
```

---

# 5. Frontend Architecture

## 5.1 Technology

Frontend 使用：

```text
Nuxt
Vue 3
TypeScript
Vue Router
Pinia
Tailwind CSS
@nuxtjs/i18n（strategy: no_prefix）
Axios / Fetch abstraction
GSAP
Lenis
Three.js（按需）
Vitest
Playwright
```

Nuxt 负责：

- Vue 应用
- Routing
- SSR
- SSG
- SEO
- 页面 Metadata
- Middleware
- Runtime Configuration

---

## 5.2 Frontend Directory

```text
frontend/
│
├── public/
│
├── assets/
│
├── components/
│   ├── ui/
│   ├── common/
│   ├── layout/
│   ├── home/
│   ├── work/
│   ├── lab/
│   ├── writing/
│   └── admin/
│
├── composables/
│
├── layouts/
│   ├── default.vue
│   └── admin.vue
│
├── middleware/
│   └── auth.ts
│
├── pages/
│   ├── index.vue
│   ├── about.vue
│   ├── experience.vue
│   ├── contact.vue
│   │
│   ├── work/
│   │   ├── index.vue
│   │   └── [slug].vue
│   │
│   ├── lab/
│   │   ├── index.vue
│   │   └── [slug].vue
│   │
│   ├── writing/
│   │   ├── index.vue
│   │   └── [slug].vue
│   │
│   └── admin/
│       ├── login.vue
│       ├── index.vue
│       ├── work/
│       ├── lab/
│       ├── writing/
│       ├── experience/
│       ├── categories/
│       ├── tags/
│       ├── media/
│       ├── messages/
│       └── settings/
│
├── plugins/
│
├── stores/
│
├── services/
│
├── types/
│
├── utils/
│
├── app.vue
├── nuxt.config.ts
└── package.json
```

---

# 6. Frontend Layering

Frontend 使用以下层次：

```text
Pages
  ↓
Sections
  ↓
Components
  ↓
UI Primitives
```

业务数据：

```text
Page
 ↓
Composable / Store
 ↓
Service
 ↓
API
```

例如：

```text
pages/work/[slug].vue
        ↓
useWork()
        ↓
work.service.ts
        ↓
GET /api/v1/work/:slug
```

---

# 7. Component Architecture

组件分为四层。

## 7.1 UI Primitives

例如：

```text
Button
Icon
Badge
Input
Textarea
Select
Modal
Drawer
Loading
Empty
Error
```

---

## 7.2 Common Components

例如：

```text
Navigation
Footer
Container
SectionHeader
LanguageSwitcher
StatusIndicator
Image
Tag
Pagination
```

---

## 7.3 Domain Components

例如：

```text
WorkItem
WorkHero
WorkMeta
LabItem
LabPreview
WritingItem
WritingMeta
ExperienceItem
```

---

## 7.4 Page Sections

例如：

```text
HomeHero
HomeIntro
SelectedWork
Capabilities
LabSection
WritingSection
ExperienceSection
ContactSection
```

禁止创建巨型：

```text
HomePage.vue
```

将整个首页全部写在一个文件中。

---

# 8. State Management

Pinia 只负责真正需要跨页面共享的状态。

主要包括：

```text
Auth State
Application State
Locale State（如需要）
```

不应该把所有 API 数据全部塞进 Pinia。

例如：

```text
Work List
Writing Detail
Lab Detail
```

默认由页面/composable 管理。

---

# 9. Internationalization

系统支持：

```text
zh-CN
en-US
```

默认：

```text
zh-CN
```

V1 使用同一套页面 URL，通过 locale 状态切换语言。

Frontend 实现统一使用：

```text
@nuxtjs/i18n
strategy: no_prefix
```

例如：

```text
/work
```

根据当前 locale 显示：

```text
中文
English
```

V1 暂不强制使用：

```text
/zh/work
/en/work
```

如果未来 SEO 或国际化需求扩大，再迁移到 locale-prefixed routing。

---

# 10. Content Translation Architecture

内容数据与翻译数据分离。

例如：

```text
Work
 │
 ├── id
 ├── slug
 ├── status
 ├── featured
 │
 └── translations
      ├── zh-CN
      └── en-US
```

同样适用于：

```text
Lab
Writing
Experience
```

禁止大量使用：

```text
title_cn
title_en
content_cn
content_en
summary_cn
summary_en
```

这种设计不利于未来扩展语言。

---

# 11. Rendering Strategy

网站采用混合 Rendering Strategy。

## Public Website

优先：

```text
SSR
SSG
ISR / Cache（未来按需）
```

适用于：

```text
Home
About
Work
Work Detail
Lab
Lab Detail
Writing
Writing Detail
Experience
```

目标：

- SEO
- Fast First Contentful Paint
- Social Preview
- Search Engine Crawling

---

## Admin

Admin 不需要 SEO。

可以主要采用：

```text
CSR
```

因此：

```text
Public Website
    ↓
SEO / SSR oriented

Admin
    ↓
Application / CSR oriented
```

Admin 的具体实现（Phase 4-B.1）：

```text
Nuxt routeRules: /admin/** → { ssr: false }
```

原因：Admin 认证需要 refresh cookie → access token。若在 SSR 阶段换取 token，
access token 会被 pinia state 序列化进 `__NUXT_DATA__`，从而出现在 `/admin/**`
的 HTML 响应体中。改为完全 CSR 后：

- `/admin/**` 的 HTML 只返回 SPA shell，不包含 access token / JWT
- Access token 只存在于浏览器内存（Pinia），刷新页面时用 HttpOnly refresh cookie 重新获取
- Public 站点不受影响，继续保持 SSR

---

# 12. Backend Architecture

Backend 使用：

```text
NestJS
TypeScript
Prisma
PostgreSQL
JWT
Swagger / OpenAPI
```

---

# 13. Backend Directory

```text
backend/
│
├── src/
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── constants/
│   │
│   ├── config/
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/
│   │   ├── users/
│   │   ├── work/
│   │   ├── lab/
│   │   ├── writing/
│   │   ├── experience/
│   │   ├── categories/
│   │   ├── tags/
│   │   ├── media/
│   │   ├── contact/
│   │   └── settings/
│   │
│   ├── prisma/
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── test/
│
├── package.json
└── tsconfig.json
```

---

# 14. Backend Module Architecture

每一个业务模块遵循：

```text
Controller
    ↓
Service
    ↓
Prisma
    ↓
Database
```

例如：

```text
WorkController
      ↓
WorkService
      ↓
PrismaService
      ↓
PostgreSQL
```

Controller：

- 接收 HTTP 请求
- 参数验证
- 调用 Service
- 返回结果

Service：

- 业务逻辑
- 权限相关业务判断
- 数据处理
- Transaction orchestration

Prisma：

- 数据库访问

---

# 15. Public / Admin Boundary

系统分为两个权限区域。

```text
PUBLIC
ADMIN
```

Public 只允许访问公开数据。

Admin 可以：

```text
Create
Read
Update
Delete
Publish
Unpublish
Upload
Manage Messages
Manage Settings
```

---

# 16. API Architecture

API Base URL：

```text
/api/v1
```

例如：

```text
/api/v1/work
/api/v1/lab
/api/v1/writing
/api/v1/contact
/api/v1/auth
```

---

# 17. Public API

主要公共 API：

```text
GET /api/v1/work
GET /api/v1/work/:slug

GET /api/v1/lab
GET /api/v1/lab/:slug

GET /api/v1/writing
GET /api/v1/writing/:slug

GET /api/v1/experience

POST /api/v1/contact
```

Public API 默认只返回：

```text
published
```

状态的数据。

Draft / Archived 数据不能通过 Public API 暴露。

---

# 18. Admin API

Admin API：

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
```

Work：

```text
GET    /api/v1/admin/works
GET    /api/v1/admin/works/:id
POST   /api/v1/admin/works
PATCH  /api/v1/admin/works/:id
DELETE /api/v1/admin/works/:id
```

> Work 的 Admin API 使用复数资源名 `works`（Phase 4-B 已实现），与 Frontend 路由 `/admin/work` 区分。
> Lab 同样使用复数资源名 `labs`（Phase 4-C 已实现），与 Frontend 路由 `/admin/lab` 区分。
> Writing 同样使用复数资源名 `writings`（Phase 4-D 已实现），与 Frontend 路由 `/admin/writing` 区分。
> Experience 同样使用复数资源名 `experiences`（Phase 4-E 已实现），与 Frontend 路由 `/admin/experience` 区分。
> Media 已实现（Phase 4-F.3，资源路径 `/api/v1/admin/media`，见 §28）。
> 下方 Categories / Tags / Messages / Settings 仍是未实现的规划契约，
> 实现时沿用同一约定（复数资源名），并以 docs/API.md 与代码为准。

Lab：

```text
GET    /api/v1/admin/labs
GET    /api/v1/admin/labs/:id
POST   /api/v1/admin/labs
PATCH  /api/v1/admin/labs/:id
DELETE /api/v1/admin/labs/:id
```

Writing：

```text
GET    /api/v1/admin/writings
GET    /api/v1/admin/writings/:id
POST   /api/v1/admin/writings
PATCH  /api/v1/admin/writings/:id
DELETE /api/v1/admin/writings/:id
```

其他管理：

```text
GET    /api/v1/admin/experiences
GET    /api/v1/admin/experiences/:id
POST   /api/v1/admin/experiences
PATCH  /api/v1/admin/experiences/:id
DELETE /api/v1/admin/experiences/:id
GET/POST/PATCH/DELETE /api/v1/admin/categories
GET/POST/PATCH/DELETE /api/v1/admin/tags
GET/POST               /api/v1/admin/media
PATCH/DELETE           /api/v1/admin/media/:id
GET/PATCH              /api/v1/admin/messages
GET/PATCH              /api/v1/admin/settings
```

所有后台 API 必须位于：

```text
/api/v1/admin/*
```

禁止使用 `POST /api/v1/work` 这类 Public 路径承担 Admin 操作。

认证接口（`/api/v1/auth/*`）保持独立命名空间。

具体 API Contract 由：

```text
docs/API.md
```

定义。

---

# 19. API Response Convention

API 必须保持统一响应结构。

成功：

```json
{
  "success": true,
  "data": {},
  "meta": null
}
```

列表：

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 12,
    "total": 100,
    "totalPages": 9
  }
}
```

错误：

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

分页参数统一使用 `page` 与 `pageSize`（默认 `pageSize = 12`，最大 `100`），不使用 `limit`。

错误 Code 必须稳定。

Frontend 不应该依赖容易变化的 message 文本判断业务状态。

---

# 20. Authentication

Admin 使用：

```text
JWT
```

凭证传输规则：

```text
Access Token  → 响应体返回，请求时使用 Authorization: Bearer
Refresh Token → 仅通过 HttpOnly Cookie 传输
```

禁止将 Refresh Token 存入 localStorage 或任何可被 JavaScript 读取的位置。

认证流程：

```text
Admin Login
     ↓
POST /auth/login
     ↓
NestJS Auth
     ↓
Verify Password
     ↓
Issue Token
     ↓
Authenticated Session
```

Protected Request：

```text
Browser
   ↓
Auth Credential
   ↓
NestJS Auth Guard
   ↓
Role Guard
   ↓
Controller
```

---

# 21. Password Security

密码禁止明文存储。

数据库只保存：

```text
passwordHash
```

必须使用成熟 Password Hashing 算法。

禁止：

```text
password
plainPassword
```

直接进入数据库。

---

# 22. Authorization

V1 主要角色：

```text
ADMIN
```

架构必须允许未来扩展：

```text
SUPER_ADMIN
EDITOR
AUTHOR
```

权限判断不能散落在 Controller 中。

统一使用：

```text
Guards
Decorators
Permission Service
```

---

# 23. Database Architecture

数据库：

```text
PostgreSQL
```

ORM：

```text
Prisma
```

Database 负责：

```text
Persistent Data
Relations
Constraints
Indexes
Transactions
```

详细结构：

```text
docs/DATABASE.md
```

---

# 24. Core Domain Models

核心领域对象包括：

```text
User
Work
WorkTranslation

Lab
LabTranslation

Writing
WritingTranslation

Experience
ExperienceTranslation

Category
Tag

Media

ContactMessage

SiteSetting
```

具体字段不在 ARCHITECTURE.md 中定义。

---

# 25. Work Domain

Work 表示正式、成熟的项目。

可能包括：

```text
Software Product
AI Agent
Frontend Project
Full-stack Project
Amazon / E-commerce Project
Open Source
Product Design
Business Practice
```

Work 可以：

```text
Featured
Published
Draft
Archived
```

---

# 26. Lab Domain

Lab 表示实验和探索。

例如：

```text
Prototype
AI Experiment
WebGL Experiment
Interaction Experiment
UI Experiment
Technical Research
```

Lab 可以拥有：

```text
Demo
Repository
Video
Interactive Preview
Technical Notes
```

Lab 的视觉表现可以比 Work 更实验性。

---

# 27. Writing Domain

Writing 表示长期内容资产。

类型可以包括：

```text
Technical Writing
Engineering Notes
Tutorial
Case Study
Product Thinking
AI / Agent
Frontend
E-commerce
```

Writing 必须支持：

```text
Draft
Published
Archived
```

---

# 28. Media Architecture

Media 文件不直接存储在 PostgreSQL。

当前实现（Phase 4-F.1 → 4-F.6.2，**IMPLEMENTED**）：

```text
StorageDriver（接口）
├── LocalStorageDriver          本地文件系统（当前使用）
├── UnconfiguredStorageDriver   fail-fast（S3 / 非法驱动名）
└── S3StorageDriver             **DEFERRED / NOT IMPLEMENTED**

StorageService                  门面：object key、public URL、put / delete / exists、本地静态根
```

驱动选择与配置：

```text
STORAGE_DRIVER           local（默认）| s3（未实现 → fail-fast）
MEDIA_LOCAL_ROOT         可选，本地 bucket 根（默认 <backend>/.data）
MEDIA_PUBLIC_BASE_URL    可选，公开 URL 前缀（本地默认 http://localhost:<API_PORT>）
```

object key 策略（不接受客户端传入 key）：

```text
media/<yyyy>/<mm>/<uuid>.<ext>
```

- 扩展名来自**已校验的 MIME**，不来自原始文件名；原始文件名只进 DB 展示字段
- key 必须严格匹配白名单正则；解析磁盘路径时校验结果仍在 bucket 根目录内（目录跳转防护）

本地文件服务：

```text
GET /media/<yyyy>/<mm>/<uuid>.<ext>     只读静态资源（express static）
  index: false / dotfiles: deny / immutable / maxAge 365d
  仅 /media/* 放开 Cross-Origin-Resource-Policy: cross-origin（Public 与 API 不同端口）
```

数据库保存：`storage_key` / `url` / `filename` / `original_filename` / `mime_type` / `size` / `width` / `height` / `alt` / `metadata`。

**明确定位**：

```text
LocalStorageDriver          IMPLEMENTED
S3StorageDriver             DEFERRED（选择 STORAGE_DRIVER=s3 会 fail-fast，不会伪造上传成功）
MinIO runtime integration   DEFERRED（compose 有定义，但当前未运行、应用未接入）
```

上传流程（**IMPLEMENTED**）：

```text
Admin
  ↓
Frontend
  ↓
POST /api/v1/admin/media（multipart）
  ↓
校验（大小 / MIME / 扩展名 / magic bytes / 尺寸）
  ↓
StorageService.put()  ← 失败则不写数据库
  ↓
PostgreSQL media 记录  ← 写库失败时补偿删除已写入的对象
```

上传写入顺序不可颠倒：**先 storage.put() 成功，再创建 DB 记录**；DB 创建失败时执行补偿删除，且补偿失败只记录结构化日志（不外泄细节）。

---

## 28.1 Admin Media Library（IMPLEMENTED）

```text
路由          /admin/media
分页          pageSize = 24（显式传参；后端上限 100）
排序          createdAt DESC（后端固定，前端不提供排序 UI）
能力          上传（JPEG / PNG / WebP / AVIF，≤10MB，≤40MP）
              客户端预检（格式 / 大小 / 像素，best-effort，不是安全边界）
              编辑 alt、删除（被引用 → 409 MEDIA_IN_USE 并展示引用计数）
状态          Loading / Empty / Error + Retry；上传/保存/删除期间禁用按钮
```

---

## 28.2 MediaPicker（IMPLEMENTED）

```text
接入范围      Work / Lab / Writing 编辑器（Experience 不接入 MediaPicker）
Cover         单选（0..1）；可清除；清空 Cover 不影响 Gallery
Gallery       多选（0..N）；顺序 = mediaIds 数组顺序 → 后端写 sort_order
语义          Confirm = 整体替换选择；Cancel 不改变表单
落库          Picker 只返回选择结果，选择停留在表单状态，随 CMS 保存一起提交
职责边界      Picker 不负责 upload / edit alt / delete；不直接调用任何 CMS API
依赖          无 drag/drop 依赖（排序使用显式控件）
```

---

# 29. Image Optimization

目标（**DEFERRED / NOT IMPLEMENTED**）：Public Website 图片应尽可能

```text
Responsive
Lazy Loaded
Optimized
Compressed
Properly Sized
```

当前实际状态（Phase 4-F.6.2）：

```text
Public Cover / Gallery 直接使用原始上传文件
无 srcset / 无响应式图源生成 / 无压缩或转码 / 无 CDN
Gallery：loading=lazy + decoding=async，按图片固有比例展示（不裁切）
Cover（detail hero）：loading=eager + fetchpriority=high
```

图片优化管线属后续工作，当前不应被理解为已实现。

优先使用：

```text
WebP
AVIF
```

根据实际兼容性进行 fallback。

禁止页面无意义加载超大原图。

---

# 30. SEO Architecture

所有公共内容页面必须支持：

```text
title
description
canonical
Open Graph
Twitter/X Card
```

Writing 还需要：

```text
author
publishedAt
updatedAt
```

系统需要提供：

```text
sitemap.xml
robots.txt
```

页面必须使用语义化 HTML。

---

# 31. Structured Data

未来可增加：

```text
Person
Article
CreativeWork
SoftwareApplication
BreadcrumbList
```

V1 根据实际页面类型逐步加入。

不要为了 SEO 添加没有真实意义的 Schema。

---

# 32. Performance Architecture

性能优先级：

```text
Content
 ↓
Layout
 ↓
Interaction
 ↓
Animation
 ↓
Advanced Visual Effects
```

而不是：

```text
WebGL
 ↓
Animation
 ↓
Content
```

---

# 33. Animation Architecture

主要动画：

```text
CSS
GSAP
Lenis
```

原则：

```text
transform
opacity
```

优先。

避免频繁触发：

```text
layout
paint
```

---

# 34. WebGL Architecture

Three.js / WebGL 只允许出现在：

```text
Hero
Lab
Experimental Section
```

禁止为了装饰给普通 UI 添加 WebGL。

WebGL 必须具备：

```text
Fallback
Performance Guard
Reduced Motion Support
Mobile Consideration
```

如果设备性能不足：

```text
WebGL
 ↓
Disable
 ↓
CSS / Static Experience
```

---

# 35. Accessibility

必须支持：

```text
Keyboard Navigation
Focus State
Semantic HTML
ARIA Labels
Color Contrast
Alt Text
Reduced Motion
Form Labels
Error Messages
```

禁止：

```text
Only Color Indicates State
```

例如：

```text
Green = Success
Red = Error
```

必须同时存在：

```text
Icon
Text
Semantic State
```

---

# 36. Reduced Motion

必须支持：

```css
prefers-reduced-motion
```

用户开启 Reduced Motion 后：

```text
Parallax ↓
Cursor Effects ↓
Large Transform ↓
Page Transition ↓
WebGL ↓
```

核心内容与功能必须保持正常。

---

# 37. Loading / Empty / Error

所有异步页面必须考虑：

```text
Loading
Success
Empty
Error
```

例如：

```text
Writing
 ├── Loading
 ├── Writing Items
 ├── Empty
 └── Error
```

不能假设 API 永远成功。

---

# 38. Contact Architecture

Contact 是 Public API。

```text
POST /api/v1/contact
```

必须进行：

```text
Input Validation
Rate Limiting
Spam Protection
Email Validation
Length Validation
```

后台：

```text
Admin
 ↓
Messages
 ↓
Read
 ↓
Archive
```

---

# 39. Security Architecture

系统必须防护：

```text
SQL Injection
XSS
CSRF（根据认证方式）
Brute Force
Credential Abuse
File Upload Abuse
Rate Abuse
Unauthorized Admin Access
```

Backend 必须：

```text
Validate Input
Sanitize Where Appropriate
Use Prisma Parameterization
Limit Upload Types
Limit Upload Size
Protect Admin Routes
Rate Limit Sensitive APIs
```

---

# 40. Environment Configuration

禁止把 Secrets 写入 Git。

使用：

```text
.env
.env.local
.env.production
```

示例：

```text
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
```

必须提供：

```text
.env.example
```

但不能包含真实 Secret。

---

# 41. Configuration Rules

环境配置分为：

```text
Development
Test
Production
```

Frontend 使用 Runtime Config。

Backend 使用 Config Module / Environment Variables。

禁止：

```text
Hard-coded API URL
Hard-coded Secret
Hard-coded Database Password
```

---

# 42. Development Environment

推荐：

```text
Node.js
pnpm
Docker Desktop
WSL2
PostgreSQL
Git
```

本地 PostgreSQL 通过 Docker Compose 运行（**当前唯一必需的基础设施服务，已实际运行验证**）。
compose 中另有 MinIO 服务定义，但**当前未运行、应用也未接入**（对象存储属 deferred）；
本地媒体默认写入后端文件系统的 `backend/.data`。

开发环境：

```text
Browser
   │
   ├── Nuxt
   │
   └── NestJS
          │
          ▼
      PostgreSQL
```

---

# 43. Docker Architecture

开发/部署支持 Docker。

主要服务：

```text
frontend
backend
postgres
minio      （可选 / 当前未运行；应用未接入）
```

生产环境可以根据部署平台拆分。

---

# 44. Deployment Architecture

推荐生产结构：

```text
                    Internet
                       │
                       ▼
                Reverse Proxy
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
          Frontend              API
           Nuxt                NestJS
             │                   │
             └─────────┬─────────┘
                       │
                       ▼
                  PostgreSQL
                       │
                       ▼
                 Object Storage
```

域名结构推荐：

```text
www.example.com
api.example.com
```

Admin：

```text
www.example.com/admin
```

V1 不强制使用独立 Admin 域名。

---

# 45. Deployment Environments

至少包含：

```text
Local
Staging
Production
```

流程：

```text
Feature
   ↓
Development
   ↓
Test
   ↓
Staging
   ↓
Production
```

---

# 46. Logging

Backend 必须具备结构化日志。

至少记录：

```text
Request
Response Status
Error
Duration
Authentication Event
Important Admin Actions
```

禁止记录：

```text
Password
JWT Secret
Sensitive Credentials
```

---

# 47. Error Handling

Backend 使用统一 Exception Filter。

错误分类：

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

Frontend 根据：

```text
HTTP Status
Error Code
```

显示适当状态。

---

# 48. Testing Architecture

测试分为：

```text
Unit
Integration
E2E
```

Frontend：

```text
Vitest
Playwright
```

Backend：

```text
Unit Test
Integration Test
E2E Test
```

---

# 49. Critical E2E Flows

V1 至少覆盖：

## Public

```text
Home
 ↓
Work
 ↓
Work Detail
 ↓
Lab
 ↓
Writing
 ↓
Writing Detail
 ↓
Contact
```

## Language

```text
Chinese
 ↓
Switch English
 ↓
Content changes
 ↓
Switch Chinese
```

## Admin

```text
Login
 ↓
Dashboard
 ↓
Create Work
 ↓
Edit Work
 ↓
Publish
 ↓
Public Website
 ↓
Verify Content
```

## Contact

```text
Visitor
 ↓
Submit Contact
 ↓
Validation
 ↓
Success
 ↓
Admin Messages
```

---

# 50. CI Architecture

未来 CI 至少执行：

```text
Install
 ↓
Lint
 ↓
Type Check
 ↓
Unit Test
 ↓
Build
 ↓
E2E
```

如果任何关键步骤失败：

```text
Build / Merge
   ↓
Blocked
```

---

# 51. Git Architecture

主分支：

```text
main
```

开发集成：

```text
develop
```

功能分支：

```text
feature/*
```

修复：

```text
fix/*
```

紧急生产修复：

```text
hotfix/*
```

推荐：

```text
feature/work-management
feature/admin-auth
feature/writing
fix/contact-validation
```

---

# 52. Commit Convention

推荐 Conventional Commits：

```text
feat:
fix:
refactor:
docs:
test:
chore:
perf:
style:
build:
ci:
```

例如：

```text
feat(work): add work detail page

feat(auth): implement admin login

fix(contact): validate email input

docs(architecture): update rendering strategy
```

---

# 53. Codex Engineering Workflow

Codex 不允许跳过架构直接大规模生成代码。

标准流程：

```text
PRD
 ↓
DESIGN
 ↓
ARCHITECTURE
 ↓
DATABASE
 ↓
API
 ↓
Implementation
 ↓
Testing
 ↓
Review
 ↓
Deployment
```

每个阶段完成后才进入下一阶段。

---

# 54. Codex Role Model

Codex 可以根据任务扮演不同角色。

```text
Product Agent
System Architect Agent
UI/UX Agent
Database Agent
API Agent
Vue/Nuxt Frontend Agent
NestJS Backend Agent
QA Agent
Security Agent
DevOps Agent
Code Reviewer Agent
```

不同角色必须遵守：

```text
职责边界
输入文档
输出文档
禁止事项
验收标准
```

---

# 55. Codex Source of Truth

Codex 执行任务时必须优先读取：

```text
AGENTS.md
```

然后根据任务读取：

```text
PRD.md
DESIGN.md
ARCHITECTURE.md
DATABASE.md
API.md
QA.md
DEPLOYMENT.md
```

如果文档之间发生冲突：

```text
Product Requirement
    ↓
Architecture
    ↓
API / Database
    ↓
Implementation
```

同时遵循：

```text
Security
Accessibility
Performance
```

这些跨领域约束不能被业务便利性随意覆盖。

---

# 56. Codex Coding Rules

Codex 修改代码时：

1. 先理解现有结构
2. 不随意重构无关代码
3. 不修改未授权模块
4. 不删除已有功能
5. 不引入不必要依赖
6. 不复制重复逻辑
7. 优先复用现有组件
8. 保持 TypeScript 类型完整
9. 修改后运行相关测试
10. 最后进行代码 Review

---

# 57. Dependency Rules

新增依赖必须回答：

```text
Why?
What problem does it solve?
Is there already an existing solution?
Is maintenance cost acceptable?
Does it affect bundle size?
Does it affect security?
```

禁止：

```text
为了一个小功能引入一个大型依赖
```

---

# 58. Architecture Decision: Nuxt

Eson_web V1 使用：

```text
Nuxt + Vue 3
```

而不是纯：

```text
Vue + Vite SPA
```

原因：

```text
Personal Brand
SEO
SSR
SSG
Content
Open Graph
Performance
```

Nuxt 仍然属于 Vue 技术栈，因此不会改变 Vue 的核心开发方式。

---

# 59. Architecture Decision: NestJS

Backend 使用：

```text
NestJS
```

原因：

```text
TypeScript
Modular Architecture
Dependency Injection
Validation
Guards
Testing
Scalability
```

适合当前项目规模，并为未来扩展保留空间。

---

# 60. Architecture Decision: PostgreSQL

数据库使用：

```text
PostgreSQL
```

原因：

```text
Relational Data
Strong Constraints
Transactions
JSON Support
Mature Ecosystem
Prisma Support
```

Eson_web 的内容、分类、标签、翻译、用户和消息都具有明显关系型结构。

---

# 61. Architecture Decision: Prisma

ORM 使用：

```text
Prisma
```

原因：

```text
Type Safety
Migration
Schema
Developer Experience
NestJS Integration
```

数据库 Schema 必须以：

```text
schema.prisma
```

作为主要定义源。

---

# 62. Architecture Decision: REST API

V1 使用：

```text
REST
```

不引入：

```text
GraphQL
gRPC
```

除非未来出现明确需求。

原因：

```text
简单
稳定
易调试
适合 CMS
适合 Public API
适合 Admin API
```

---

# 63. Architecture Decision: Separate Admin

Admin 与 Public Website 共用：

```text
Nuxt Application
```

但使用独立：

```text
Admin Layout
Admin Pages
Admin Middleware
Admin Components
```

结构：

```text
Public
 └── default.vue

Admin
 └── admin.vue
```

视觉系统可以不同。

Public：

```text
Immersive
Editorial
Interactive
```

Admin：

```text
Clear
Efficient
Dense
Productivity-oriented
```

---

# 64. Future Extensibility

架构必须允许未来增加：

```text
Search
RSS
Newsletter
Analytics
GitHub Integration
GitHub Activity
AI Content Assistant
AI Search
Comments
External Integrations
Advanced WebGL
Multi-author
Multi-language Expansion
```

但 V1 不提前实现这些功能。

原则：

```text
Design for Extension
Do Not Build Everything Now
```

---

# 65. Non-Goals for V1

V1 不强制实现：

```text
Complex CMS Workflow
Multi-tenant System
Multi-user Collaboration
Real-time Collaboration
Comment System
Newsletter System
Complex Analytics
AI Chatbot
Advanced Search Engine
Social Login
Payment System
Microservices
```

这些功能属于未来扩展。

---

# 66. Architecture Quality Requirements

V1 必须满足：

```text
[ ] Frontend / Backend Separation
[ ] TypeScript
[ ] Nuxt
[ ] NestJS
[ ] PostgreSQL
[ ] Prisma
[ ] REST API
[ ] Admin Authentication
[ ] Public / Admin Permission Boundary
[ ] i18n
[ ] SEO
[x] Media System            （Phase 4-F.1 → 4-F.6.2；S3 / MinIO / 图片优化管线仍为 deferred）
[ ] Validation
[ ] Error Handling
[ ] Responsive Design
[ ] Accessibility
[ ] Reduced Motion
[ ] Unit Testing
[ ] E2E Testing
[ ] Docker
[ ] Environment Configuration
[ ] Production Build
```

---

# 67. Architecture Acceptance Criteria

ARCHITECTURE.md 完成后，必须能够回答以下问题：

### Product

```text
系统解决什么问题？
谁使用？
有哪些核心模块？
```

### Frontend

```text
使用什么技术？
页面如何组织？
组件如何组织？
状态如何管理？
```

### Backend

```text
使用什么技术？
模块如何划分？
业务逻辑在哪里？
```

### Database

```text
数据在哪里？
如何访问？
```

### API

```text
前后端如何通信？
Public / Admin 如何区分？
```

### Security

```text
Admin 如何认证？
权限如何控制？
数据如何保护？
```

### SEO

```text
页面如何被搜索引擎发现？
```

### Deployment

```text
如何从本地进入生产环境？
```

### Testing

```text
如何证明系统可以正常工作？
```

### AI Development

```text
Codex 应该按照什么规则工作？
```

如果这些问题都可以被明确回答，则架构设计通过。

---

# 68. Final Architecture

Eson_web V1 最终架构：

```text
                         ESON
                          │
              ┌───────────┴───────────┐
              │                       │
           Public                    Admin
           Website                   CMS
              │                       │
              └───────────┬───────────┘
                          │
                         Nuxt
                       Vue 3 / TS
                          │
                    SSR / SSG / CSR
                          │
                     REST API
                          │
                        NestJS
                       TypeScript
                          │
             ┌────────────┼────────────┐
             │            │            │
            Auth        Content       Media
             │            │            │
             │      ┌─────┼─────┐      │
             │      │     │     │      │
             │     Work  Lab Writing   │
             │      │     │     │      │
             └──────┴─────┴─────┴──────┘
                          │
                        Prisma
                          │
                     PostgreSQL
                          │
                    Object Storage
```

---

# 69. Next Engineering Phase

ARCHITECTURE.md 完成后，禁止直接进入业务编码。

下一阶段必须完成：

```text
DATABASE.md
```

DATABASE.md 将正式定义：

```text
ERD
Tables
Fields
Enums
Relations
Translation Tables
Media
Indexes
Constraints
Soft Delete Strategy
Publish Strategy
Timestamps
Database Naming
Prisma Schema
Migration Strategy
Seed Data
```

完成 DATABASE.md 后，再定义：

```text
API.md
```

然后：

```text
AGENTS.md
```

最后才进入：

```text
Project Initialization
```

---

# 70. Document Status

```text
Document: ARCHITECTURE.md
Version: 1.0
Status: APPROVED
Project: Eson_web
Architecture: Nuxt + NestJS + PostgreSQL
```

本架构作为 V1 的技术 Source of Truth。

如未来修改核心技术栈、数据库架构、认证方案或前后端边界，必须更新本文件，并记录 Architecture Decision。
