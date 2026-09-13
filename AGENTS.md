# AGENTS.md

# Eson_web — Codex Project Rules

Version: 1.0  
Status: Approved  
Project: Eson_web  
Brand: ESON

---

## 1. Project Mission

Eson_web 是一个面向长期运营的个人品牌与技术作品网站。

核心定位：

> Professional Software Engineer Personal Brand Website

核心目标：

- 展示 ESON 的软件工程能力
- 展示 AI / AI Agent 能力
- 展示产品设计与交互能力
- 展示 Amazon / E-commerce 实践
- 展示个人软件项目
- 展示 GitHub / Open Source
- 发布技术文章
- 展示工作经历
- 建立长期可扩展的个人品牌内容平台
- 提供稳定、专业、可部署的个人网站

这不是一次性的 Demo。

所有实现都必须以：

> Production Ready

作为最终标准。

---

# 2. Product Principles

所有开发工作必须遵循以下原则：

1. Content First
2. Engineering Quality
3. Personal Brand
4. Interactive but Controlled
5. Performance First
6. Accessibility First
7. SEO Friendly
8. Maintainable
9. Extensible
10. Production Ready

视觉效果不能凌驾于：

- 内容
- 可用性
- 性能
- SEO
- 无障碍
- 代码质量

---

# 3. Source of Truth

开发前必须阅读相关项目文档。

文档优先级：

1. `docs/PRD.md`
2. `docs/DESIGN.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATABASE.md`
5. `docs/API.md`
6. `AGENTS.md`

如果不同文档发生冲突：

优先级：

```text
产品需求
↓
用户体验
↓
架构约束
↓
数据模型
↓
API
↓
具体实现
```

如果发现文档冲突：

- 不要自行大规模修改
- 先指出冲突
- 给出推荐方案
- 涉及架构、数据库、API、产品行为的重大修改必须等待确认

---

# 4. Execution Mode

默认执行模式：

> 小步骤自动执行，大改动先确认

Codex 可以自动完成：

- 创建文件
- 创建目录
- 安装必要依赖
- 编写普通组件
- 编写普通页面
- 编写类型
- 编写工具函数
- 编写测试
- 修复明确的 TypeScript / ESLint / Build 错误
- 修复局部 Bug
- 执行格式化
- 执行测试
- 执行类型检查

以下情况必须先向用户确认：

- 修改整体架构
- 更换技术栈
- 删除核心功能
- 修改数据库核心结构
- 删除数据库字段或表
- 修改已经确认的 API Contract
- 引入大型基础设施
- 引入新的数据库
- 引入 Redis / Kafka 等基础设施
- 引入第三方 SaaS
- 修改认证体系
- 修改部署架构
- 大规模重构
- 删除大量代码
- 修改产品核心交互
- 修改品牌定位
- 修改视觉设计方向

---

# 5. Technology Stack

## Frontend

必须优先使用：

- Nuxt
- Vue 3
- TypeScript
- Vue Router
- Pinia
- Tailwind CSS
- @nuxtjs/i18n（V1 strategy: no_prefix）
- Fetch / Axios abstraction
- GSAP
- Lenis
- Three.js（仅必要场景）
- Vitest
- Playwright

Frontend 原则：

- Composition API
- `<script setup>`
- TypeScript
- SSR / SSG 优先
- Admin 页面允许 CSR
- 组件化
- 页面不能承担过多业务逻辑

## Package Manager

V1 使用：

```text
pnpm
```

- 根 `package.json` 必须声明 `packageManager` 并固定 pnpm 版本
- 禁止依赖 Codex runtime fallback pnpm 作为项目规范
- 不使用 npm / yarn 安装项目依赖

---

# 6. Backend

必须优先使用：

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT
- Swagger / OpenAPI

Backend 原则：

- Controller 负责 HTTP 层
- Service 负责业务逻辑
- Prisma 负责数据访问
- DTO 负责输入输出结构
- 不直接向客户端暴露 Prisma Model
- 所有输入必须验证
- 所有管理接口必须进行权限验证

---

# 7. Database

数据库：

> PostgreSQL

ORM：

> Prisma

必须遵循：

- UUID 主键
- PostgreSQL 命名使用 snake_case
- TypeScript / Prisma 使用 camelCase / PascalCase
- UTC 时间
- `TIMESTAMPTZ`
- 外键约束
- Unique Constraint
- Index
- Transaction

禁止：

- 在生产环境直接修改数据库结构而不创建 Migration
- 使用无约束的字符串关系代替外键
- 将图片二进制直接存入 PostgreSQL
- 无理由增加软删除字段
- 为了方便开发破坏数据库约束

---

# 8. Content Model

核心内容类型：

- Work
- Lab
- Writing
- Experience
- Category
- Tag
- Media
- ContactMessage
- User
- SiteSetting

多语言必须采用 Translation Model。

例如：

```text
Work
├── WorkTranslation
│   ├── zh-CN
│   └── en-US
```

禁止：

```text
title_cn
title_en
description_cn
description_en
```

除非经过明确确认。

---

# 9. Internationalization

V1 支持：

- `zh-CN`
- `en-US`

默认：

> zh-CN

实现：

```text
@nuxtjs/i18n
strategy: no_prefix
```

V1 不使用：

```text
/zh
/en
```

而采用：

```text
当前 URL
+
Locale State
+
Translation Data
```

如果当前语言缺失：

Public：

```text
当前语言
↓
zh-CN fallback
```

Admin：

必须明确显示：

> Translation Missing

禁止静默隐藏翻译缺失问题。

---

# 10. API Rules

API Base：

```text
/api/v1
```

统一 JSON Response。

Success：

```json
{
  "success": true,
  "data": {},
  "meta": null
}
```

Error：

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

API 必须：

- DTO Validation
- Authentication
- Authorization
- Rate Limiting
- Error Handling
- Swagger Documentation
- Consistent HTTP Status Codes

Public API：

只能返回：

```text
PUBLISHED
+
publishedAt != null
```

Admin API：

必须验证：

```text
JWT
+
ADMIN role
```

Admin API 路径：

```text
/api/v1/admin/*
```

Admin 内容接口示例：

```text
GET    /api/v1/admin/work
POST   /api/v1/admin/work
PATCH  /api/v1/admin/work/:id
DELETE /api/v1/admin/work/:id
```

禁止使用 `POST /api/v1/work` 作为 Admin API。

分页参数：

```text
page
pageSize（默认 12，最大 100）
```

禁止使用 `limit` 作为 API 分页参数。

---

# 11. Frontend Architecture

推荐数据流：

```text
Page
↓
Composable / Store
↓
Service
↓
API
```

页面负责：

- 页面组合
- 页面级状态
- SEO
- 页面交互协调

Composable 负责：

- 页面数据逻辑
- API 数据组合
- 可复用业务逻辑

Service 负责：

- API 请求
- API 参数
- API 类型

Component 负责：

- UI
- Props
- Emits
- 局部交互

禁止：

- 在巨大页面组件中写全部业务逻辑
- 页面直接大量调用 fetch
- 重复实现相同 API 请求
- 组件直接操作 Prisma
- 在 UI Component 中写复杂业务逻辑

---

# 12. Component Architecture

组件层级：

```text
UI Primitives
↓
Common Components
↓
Sections
↓
Pages
```

例如：

```text
Button
↓
WorkItem
↓
WorkSection
↓
HomePage
```

不要创建：

```text
HomePage.vue
```

然后把整个首页写进一个文件。

推荐：

```text
components/
├── ui/
├── common/
├── layout/
├── home/
├── work/
├── lab/
├── writing/
└── admin/
```

---

# 13. Vue Rules

使用：

```vue
<script setup lang="ts">
```

优先：

- Composition API
- composables
- typed props
- typed emits
- computed
- watch
- reusable composables

避免：

- Options API
- 巨型组件
- 深层 prop drilling
- 不必要的 global state
- 无类型的 `any`

TypeScript 中：

禁止无理由使用：

```ts
any
```

如果必须使用：

必须说明原因。

---

# 14. UI / Visual Direction

Eson_web 的视觉方向：

> Dark Technology + Immersive Portfolio

关键词：

- Professional
- Technical
- Premium
- Minimal
- Interactive
- Experimental

但禁止变成：

- Cyberpunk Demo
- Gaming Website
- Neon Dashboard
- Generic SaaS Template
- Over-animated Portfolio

---

# 15. Color Rules

主要背景：

```text
#07080C
#0B0D12
#10131A
#141820
```

文字：

```text
#F2F4F7
#A7ADB8
#6E7582
```

边框：

```text
rgba(255,255,255,0.08)
rgba(255,255,255,0.14)
```

Accent：

> Electric Blue

可以使用：

```text
Blue → Violet
```

但必须克制。

禁止：

- 大面积高饱和蓝色
- 到处 Glow
- 到处 Gradient
- 到处 Glassmorphism

---

# 16. Typography

优先：

```text
Inter
Noto Sans
Noto Sans SC
system-ui
sans-serif
```

中文必须保证可读性。

Display Typography 可以具有明显视觉冲击力。

正文必须：

- 清晰
- 舒适
- 高对比度
- 易阅读

---

# 17. Layout

Desktop：

```text
12-column grid
```

Tablet：

```text
8-column grid
```

Mobile：

```text
4-column grid
```

最大内容宽度：

```text
1440px
```

Mobile 不允许简单缩放 Desktop。

必须针对 Mobile 单独设计：

- 导航
- Hero
- 内容间距
- 图片比例
- 交互
- 动画
- Typography

---

# 18. Animation

动画必须服务于：

- 信息层级
- 页面导航
- 内容理解
- 品牌体验
- 工程感

优先：

```text
transform
opacity
clip-path
```

避免：

- layout thrashing
- 大量 box-shadow 动画
- 高频改变 width / height
- 大量 DOM particle
- 无意义动画

推荐时间：

```text
Micro:   120–200ms
UI:      200–350ms
Content: 350–600ms
Large:   600–1000ms
```

页面 Transition：

```text
Exit: 150–250ms
Enter: 250–500ms
```

---

# 19. WebGL / Three.js

Three.js 不是默认技术。

只有以下区域允许优先考虑：

- Hero
- Lab
- Experimental section

必须存在：

```text
Fallback
```

如果：

- GPU 不支持
- WebGL 不支持
- 移动设备性能不足
- 用户开启 reduced motion

则必须保证网站正常使用。

禁止：

> 为了炫技而加入 WebGL。

---

# 20. Accessibility

必须支持：

- Semantic HTML
- Keyboard Navigation
- Focus State
- Screen Reader
- Alt Text
- Form Labels
- Sufficient Contrast
- Reduced Motion

必须支持：

```css
prefers-reduced-motion
```

如果用户开启 Reduced Motion：

必须减少或关闭：

- Parallax
- Cursor effects
- Large transforms
- WebGL animation
- Page transition

---

# 21. SEO

Public 页面必须考虑：

- `<title>`
- Meta description
- Canonical
- Open Graph
- Twitter/X Card
- Sitemap
- Robots
- Semantic HTML

Writing 页面必须包含：

- title
- description
- published date
- author
- reading time
- canonical

未来可以加入：

- JSON-LD
- Article schema
- Person schema
- Work schema

---

# 22. Image / Media

图片必须：

- 优先 WebP / AVIF
- 正确尺寸
- Lazy Loading
- Responsive
- Alt Text
- 明确的 object-fit 策略

不要：

- 上传巨大原图直接用于页面
- 使用图片代替可读文本
- 在没有必要时预加载所有图片

Media 文件：

```text
Object Storage
```

存储实现：

```text
Local      → MinIO
Production → S3-compatible Object Storage
```

> 实现现状（Phase 4-F.7 注解，规则本身不变）：
> 当前媒体存储走 `StorageService` + `LocalStorageDriver`（本地文件系统，bucket 根默认 `<backend>/.data`，
> 公开 URL 由 `MEDIA_PUBLIC_BASE_URL` 决定，object key 形如 `media/<yyyy>/<mm>/<uuid>.<ext>`）。
> `S3StorageDriver` 与 MinIO 运行时接入**尚未实现**（`STORAGE_DRIVER=s3` 会 fail-fast，不会伪造成功）。
> 上表仍是长期目标，实现时按此方向补齐，但不得宣称已实现。

数据库只保存：

- URL
- Storage Key
- Metadata
- Dimensions
- MIME
- Size
- Alt

---

# 23. Security

必须关注：

- XSS
- SQL Injection
- CSRF（适用时）
- Brute Force
- File Upload Abuse
- Rate Abuse
- Unauthorized Admin Access
- Token Leakage
- Sensitive Data Leakage

禁止：

```text
password
JWT secret
API key
database password
private credentials
```

进入 Git。

所有 Secret 使用：

```text
.env
```

并提供：

```text
.env.example
```

---

# 24. Authentication

V1：

```text
JWT
+
ADMIN role
```

Admin 页面必须：

- 登录
- Token 校验
- 权限校验
- Unauthorized redirect
- Logout

认证凭证：

```text
Access Token  → Authorization: Bearer
Refresh Token → HttpOnly Cookie
```

禁止：

- 将 admin 权限放在前端单独判断
- 仅依靠隐藏按钮保护接口
- 在 LocalStorage 中保存敏感 Secret
- 将 Refresh Token 存入 localStorage

---

# 25. Admin

Admin 的目标：

> Clarity + Speed + Productivity

Admin 不需要完全复制 Public Website 的沉浸式设计。

Admin 可以使用：

- Sidebar
- Table
- Form
- Drawer
- Modal
- Search
- Filters
- Pagination

Admin 必须优先保证：

```text
可操作性
>
视觉效果
```

---

# 26. Error / Loading / Empty States

所有异步页面必须考虑：

```text
Loading
Success
Empty
Error
```

不能只实现：

```text
Success
```

例如：

```text
Work List
├── Loading
├── Data
├── Empty
└── Error
```

---

# 27. Forms

所有表单必须：

- 输入验证
- 错误提示
- Loading 状态
- Success 状态
- Error 状态
- 防止重复提交
- Accessible Label

用户输入必须经过：

```text
Frontend Validation
+
Backend Validation
```

Frontend validation 不能代替 Backend validation。

---

# 28. Contact Form

Contact API 必须考虑：

- Email validation
- Message length
- Rate limiting
- Spam protection
- Input validation
- IP hashing

禁止保存 Raw IP。

---

# 29. Code Quality

代码必须：

- readable
- maintainable
- typed
- modular
- testable

优先简单方案。

不要为了所谓的“架构完整”创建大量抽象。

遵循：

> Simple until complexity is justified.

---

# 30. Dependency Rules

引入依赖前先判断：

1. 是否真的需要？
2. Vue / Nuxt 是否已经提供？
3. 是否可以用现有依赖解决？
4. 是否增加维护成本？
5. 是否影响 Bundle Size？
6. 是否影响 SSR？
7. 是否影响部署？

不要为了一个很小的功能引入大型依赖。

---

# 31. Refactoring Rules

允许：

- 小范围重构
- 明显重复代码消除
- 类型修复
- 组件拆分
- 命名优化
- 局部性能优化

需要确认：

- 大规模目录重构
- 更换状态管理
- 更换 UI Framework
- 更换 CSS Strategy
- 更换 API Architecture
- 更换数据库 Architecture
- 删除大量旧代码

禁止：

> 顺手重写整个项目。

---

# 32. Testing

Frontend：

```text
Vitest
Playwright
```

Backend：

```text
Unit Test
Integration Test
E2E
```

重要功能必须测试：

- Auth
- Work CRUD
- Lab CRUD
- Writing CRUD
- Experience CRUD
- Contact
- Media
- Locale fallback
- Permissions

---

# 33. Before Finishing Any Task

Codex 完成任务前必须检查：

```text
1. TypeScript
2. Lint
3. Formatting
4. Unit Tests
5. Integration Tests（如果相关）
6. Build
```

至少执行与本次修改相关的检查。

如果检查失败：

不要隐藏错误。

必须：

1. 找到原因
2. 修复
3. 再次执行检查

如果无法修复：

明确告诉用户：

- 什么失败
- 为什么失败
- 已尝试什么
- 下一步是什么

---

# 34. Git Rules

分支：

```text
main
develop
feature/*
fix/*
hotfix/*
```

Commit 使用：

> Conventional Commits

例如：

```text
feat: add work detail page
fix: resolve locale fallback issue
refactor: extract work card
docs: update API specification
test: add contact API tests
chore: update dependencies
```

不要使用：

```text
update
test
fix
aaa
修改
111
```

作为唯一 commit message。

---

# 35. Commit Strategy

一个 Commit 尽量只解决一个逻辑问题。

推荐：

```text
feat: create work module
feat: add work translation model
feat: add public work API
feat: add work list page
test: add work API tests
```

避免：

```text
feat: finish everything
```

---

# 36. File Naming

Vue：

```text
PascalCase.vue
```

例如：

```text
WorkCard.vue
SectionHeader.vue
LanguageSwitcher.vue
```

Composable：

```text
useXxx.ts
```

例如：

```text
useWork.ts
useLocale.ts
useScroll.ts
```

Service：

```text
work.service.ts
lab.service.ts
writing.service.ts
```

Backend：

```text
work.controller.ts
work.service.ts
work.module.ts
```

---

# 37. Naming

变量：

```text
camelCase
```

类型：

```text
PascalCase
```

常量：

```text
UPPER_SNAKE_CASE
```

Database：

```text
snake_case
```

URL：

```text
lowercase
```

Slug：

```text
lowercase-url-safe
```

---

# 38. API Client

Frontend 不允许在多个页面重复写：

```ts
fetch(...)
```

应该集中到：

```text
services/
```

例如：

```text
services/
├── api.ts
├── auth.service.ts
├── work.service.ts
├── lab.service.ts
├── writing.service.ts
├── experience.service.ts
└── contact.service.ts
```

统一处理：

- Base URL
- Headers
- Error
- Token
- Timeout
- Response envelope

---

# 39. Environment

必须区分：

```text
.env
.env.local
.env.production
.env.example
```

环境变量必须通过配置层读取。

禁止：

```ts
const API_URL = "http://localhost:3000"
```

直接散落在业务代码中。

---

# 40. Docker

V1 支持：

```text
Frontend
Backend
PostgreSQL
MinIO（Local Object Storage）
```

本地开发使用 Docker Desktop + WSL2，PostgreSQL 与 MinIO 通过 Docker Compose 运行。

> 实现现状：PostgreSQL 为当前唯一必需服务（已运行并验证）；MinIO 服务定义保留在 compose 中，
> 但**当前未运行、应用未接入**（媒体默认写入 `LocalStorageDriver`，见 §22 注）。

Docker 配置必须：

- 可重复启动
- 环境变量清晰
- 不包含 Secret
- 本地开发方便

---

# 41. Deployment

目标架构：

```text
Reverse Proxy
      │
      ├── Nuxt Frontend
      │
      └── NestJS API
              │
              ├── PostgreSQL
              │
              └── Object Storage
```

建议：

```text
www.example.com
api.example.com
```

Admin：

```text
www.example.com/admin
```

---

# 42. Performance

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
Advanced Effects
```

不要为了动画牺牲：

- LCP
- CLS
- INP
- Mobile performance

优先：

```text
transform
opacity
CSS
```

谨慎使用：

```text
WebGL
Canvas
large video
heavy JS
```

---

# 43. Public Page Architecture

Public 页面：

```text
/
├── Hero
├── Intro
├── Selected Work
├── Capabilities
├── Lab
├── Writing
├── Experience
└── Contact
```

其他页面：

```text
/about
/work
/work/:slug
/lab
/lab/:slug
/writing
/writing/:slug
/experience
/contact
```

---

# 44. Navigation

主要导航：

```text
ESON

WORK
LAB
WRITING
ABOUT

中文 / EN
```

Experience / Contact 可以通过：

- Home
- Footer
- CTA

访问。

---

# 45. Hero

Hero 核心标题：

```text
SOFTWARE
ENGINEER
&
BUILDER
```

辅助信息：

```text
I BUILD DIGITAL PRODUCTS,
AI SYSTEMS & INTERACTIVE EXPERIENCES.
```

可以包含：

```text
SYSTEM ONLINE
AVAILABLE
SCROLL
LOCAL TIME
STATUS
```

但这些系统元素不能产生虚假事实。

---

# 46. Work

Work 不是简单的：

```text
Card Grid
```

优先：

> Editorial Work Showcase

每个项目可以展示：

- Title
- Subtitle
- Summary
- Category
- Technology
- Image
- Year
- Status
- GitHub
- Demo
- Project URL

---

# 47. Work Detail

推荐结构：

```text
Hero
Overview
Problem
Approach
Architecture
Technology
Design
Implementation
Results
Gallery
GitHub / Demo
Next Work
```

必须允许项目内容不断扩展。

---

# 48. Lab

Lab 是实验性质内容。

可以展示：

- AI experiments
- Interaction experiments
- WebGL
- UI experiments
- Prototypes
- Automation
- New technologies

Lab 比 Work 更自由。

但是：

> Experimental ≠ unusable.

---

# 49. Writing

Writing 必须具有：

> Editorial Experience

列表不应该只有普通卡片。

Writing 页面应强调：

- Typography
- Reading experience
- Code blocks
- Images
- Metadata
- Table of contents（必要时）

正文宽度建议：

```text
650–760px
```

---

# 50. Content Creation

内容系统必须支持：

- Draft
- Published
- Archived

Public 只展示：

```text
Published
```

Admin 可以管理：

```text
Draft
Published
Archived
```

发布时：

```text
publishedAt = UTC now
```

---

# 51. Translation Rules

每个核心内容至少支持：

```text
zh-CN
en-US
```

Admin 创建内容时：

必须可以看到：

```text
Chinese Translation
English Translation
```

缺失翻译不能悄悄被忽略。

---

# 52. No Premature Features

V1 暂时不要实现：

- Comments
- Newsletter
- Payment
- Social Login
- Realtime
- Microservices
- Complex Analytics
- Advanced Search
- GitHub Sync
- AI Chatbot
- AI Content Assistant

除非用户明确重新决定。

---

# 53. Future Architecture

未来可以增加：

```text
Revision
ContentVersion
AuditLog
AnalyticsEvent
NewsletterSubscriber
Comment
SearchIndex
GitHubRepository
GitHubActivity
AIContentTask
```

V1 不需要预先实现。

---

# 54. Codex Workflow

所有重要功能遵循：

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
IMPLEMENTATION
↓
TESTING
↓
REVIEW
↓
DEPLOYMENT
```

不要跳过必要阶段。

---

# 55. Task Workflow

开始任务时：

### Step 1

理解任务。

### Step 2

确定影响范围：

```text
Frontend?
Backend?
Database?
API?
Design?
Testing?
```

### Step 3

读取相关文档。

### Step 4

提出实现计划。

### Step 5

小任务自动执行。

### Step 6

运行检查。

### Step 7

修复问题。

### Step 8

汇报：

```text
Changed
Tested
Issues
Next
```

---

# 56. Before Coding

开始大型功能之前必须确认：

```text
Goal
Scope
Affected Files
Dependencies
API
Database
UI
Testing
```

如果任务定义不清：

不要猜测核心产品行为。

可以：

- 采用最合理的小范围默认方案
- 明确记录假设
- 对高风险决策要求确认

---

# 57. Working Tree Safety

修改代码之前：

如果存在用户未提交的修改：

不要覆盖。

禁止：

```text
git reset --hard
git checkout .
git clean -fd
```

除非用户明确要求。

不要删除用户现有工作。

---

# 58. Existing Code

如果项目已经存在：

先理解：

```text
Current Architecture
Current Dependencies
Current Routes
Current State
Current API
```

再修改。

不要看到旧代码就直接重写。

---

# 59. Error Handling

错误必须：

- 可识别
- 可追踪
- 可恢复

Frontend 不应该显示：

```text
Something went wrong
```

而没有任何上下文。

Backend Error Code 必须稳定。

例如：

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
```

---

# 60. Logging

日志应该记录：

```text
requestId
method
path
status
duration
userId
errorCode
```

禁止记录：

```text
password
JWT
API key
secret
完整敏感用户输入
```

---

# 61. Documentation

每一个重要架构决策必须有文档。

至少维护：

```text
docs/
├── PRD.md
├── DESIGN.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── QA.md              （后续阶段文档，当前未创建）
└── DEPLOYMENT.md      （后续阶段文档，当前未创建）
```

文档文件名以上述命名为准，禁止使用其他命名引用这些文档。

如果实现与文档发生重大偏差：

必须同步更新文档。

---

# 62. Comments

代码注释应该解释：

> Why

而不是：

> What

避免：

```ts
// Set loading to true
isLoading.value = true
```

更好的：

```ts
// Prevent duplicate submissions while the request is pending.
isLoading.value = true
```

---

# 63. No Magic Numbers

避免：

```ts
if (items.length > 12)
```

应该：

```ts
const DEFAULT_PAGE_SIZE = 12
```

如果数字具有业务含义，应命名。

---

# 64. Avoid Overengineering

不要为了：

- “未来可能”
- “看起来高级”
- “架构完整”

提前实现复杂系统。

遵循：

> Build what is needed, design for what is next.

---

# 65. Design Quality

视觉实现必须符合：

```text
Professional
Technical
Premium
Immersive
Controlled
Personal
```

必须避免：

```text
Generic
Template-like
Over-designed
Over-glowing
Over-animated
```

如果视觉效果与可用性冲突：

> 可用性优先。

---

# 66. Mobile Quality

Mobile 是正式产品的一部分。

必须测试：

```text
360px
390px
430px
```

重点检查：

- Navigation
- Hero
- Typography
- Image
- Overflow
- Buttons
- Forms
- Touch targets
- Animation

禁止出现：

```text
horizontal overflow
```

---

# 67. Browser Quality

至少考虑：

- Chrome
- Edge
- Safari
- Mobile Safari
- Android Chrome

对于高级视觉效果必须提供降级方案。

---

# 68. Definition of Done

一个任务只有满足以下条件才算完成：

```text
[ ] 功能实现
[ ] 类型正确
[ ] UI 符合 DESIGN.md
[ ] API 符合 API.md
[ ] Database 符合 DATABASE.md
[ ] Architecture 没有被破坏
[ ] Loading / Empty / Error 已处理
[ ] Responsive 已考虑
[ ] Accessibility 已考虑
[ ] Tests 已执行
[ ] Build 已通过
[ ] 没有明显 Console Error
[ ] 没有 Secret 泄露
[ ] 文档需要更新时已更新
```

---

# 69. Final Review

在宣布完成之前，Codex 必须进行一次 Review。

检查：

### Product

是否满足需求？

### Design

是否符合 Eson_web 视觉系统？

### Engineering

代码是否合理？

### Performance

是否引入不必要性能问题？

### Security

是否存在明显安全风险？

### Accessibility

是否存在明显无障碍问题？

### SEO

Public 页面是否满足基本 SEO？

### Mobile

移动端是否正常？

### Testing

测试是否通过？

---

# 70. Priority

当多个目标发生冲突时：

```text
1. Correctness
2. Security
3. User Experience
4. Accessibility
5. Performance
6. Maintainability
7. SEO
8. Visual Effects
```

---

# 71. Final Principle

Eson_web 不追求：

> 最复杂的网站。

而追求：

> 一个真正像优秀软件工程师亲自打造的网站。

最终标准：

```text
It should feel engineered,
not generated.
```

```text
It should feel personal,
not templated.
```

```text
It should feel alive,
not overloaded.
```

```text
It should be beautiful,
but the engineering should be visible.
```

---

# END
