# Eson_web — Database Specification

> Project: Eson_web  
> Brand: ESON  
> Document: Database Specification  
> Version: 1.0  
> Status: Approved  
> Database: PostgreSQL  
> ORM: Prisma

---

# 1. Document Purpose

本文档定义 Eson_web V1 的数据库架构。

数据库负责保存：

- 管理员
- Work
- Lab
- Writing
- Experience
- Categories
- Tags
- Media
- Contact Messages
- Site Settings
- 多语言内容
- 发布状态
- 排序信息
- 内容关系

本文档是后续：

```text
prisma/schema.prisma
```

的设计依据。

---

# 2. Database Principles

## 2.1 Relational First

Eson_web 是内容管理系统，因此使用关系型数据库：

```text
PostgreSQL
```

---

## 2.2 Strong Constraints

数据库层必须尽可能保证：

- Primary Key
- Foreign Key
- Unique Constraint
- Not Null
- Enum
- Index

不能把所有业务规则全部交给 Frontend。

---

## 2.3 UUID Primary Keys

业务实体统一使用 UUID 作为主键。

例如：

```text
id UUID
```

不使用连续数字 ID 作为 Public Entity ID。

---

# 3. Naming Convention

数据库命名统一使用：

```text
snake_case
```

例如：

```text
created_at
updated_at
published_at
cover_media_id
```

代码层使用：

```text
camelCase
```

例如：

```text
createdAt
updatedAt
publishedAt
coverMediaId
```

Prisma 负责映射。

---

# 4. Timestamp Convention

所有主要实体至少包含：

```text
created_at
updated_at
```

需要发布状态的实体增加：

```text
published_at
```

时间统一使用：

```text
TIMESTAMPTZ
```

应用层统一使用：

```text
UTC
```

展示时根据用户 locale / timezone 转换。

---

# 5. Soft Delete Strategy

V1 默认不使用全局 Soft Delete。

原因：

- CMS 数据量有限
- 删除操作容易理解
- Prisma 查询更加简单
- 避免所有查询自动增加 `deleted_at IS NULL`

对于重要内容：

```text
Draft
Published
Archived
```

承担内容生命周期。

如果未来需要回收站，再增加：

```text
deleted_at
```

或独立 Revision / Trash 系统。

---

# 6. Core Entities

V1 核心实体：

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

关系：

```text
                         User
                          │
                          │
                  ┌───────┴───────┐
                  │               │
                Work           Writing
                  │               │
          ┌───────┴───────┐       │
          ▼               ▼       ▼
      Translation      Media    Translation
          │
          ▼
       Category
          │
          ▼
         Tag


        Lab
         │
         ▼
   LabTranslation


     Experience
         │
         ▼
 ExperienceTranslation


       Media
         │
         ├── Work
         ├── Lab
         └── Writing

   ContactMessage

    SiteSetting
```

---

# 7. User

User 表示后台系统用户。

V1 实际主要用于：

```text
Admin
```

## Fields

```text
id
email
password_hash
name
role
is_active
last_login_at
created_at
updated_at
```

---

## Role

V1：

```text
ADMIN
```

未来：

```text
SUPER_ADMIN
EDITOR
AUTHOR
```

---

## Constraints

```text
email UNIQUE
email NOT NULL
password_hash NOT NULL
role NOT NULL
```

Email 存储时统一规范化为 lowercase。

---

# 8. Work

Work 表示正式项目。

可能包括：

```text
Software
AI Agent
Frontend
Full-stack
E-commerce
Amazon
Open Source
Product
Business Project
```

## Fields

```text
id
slug
status
featured
sort_order
cover_media_id
github_url
demo_url
project_url
start_date
end_date
published_at
created_at
updated_at
```

---

# 9. Work Status

```text
DRAFT
PUBLISHED
ARCHIVED
```

只有：

```text
PUBLISHED
```

才能出现在 Public Website。

---

# 10. Work Translation

WorkTranslation 保存多语言内容。

## Fields

```text
id
work_id
locale
title
subtitle
summary
content
seo_title
seo_description
created_at
updated_at
```

---

## Locale

V1：

```text
zh-CN
en-US
```

未来可以扩展。

---

## Unique Constraint

```text
(work_id, locale)
```

同一个 Work 不允许存在两个相同语言版本。

---

# 11. Work Content Structure

`content` 用于保存完整项目内容。

V1 可以采用：

```text
Markdown
```

或结构化 Rich Text。

最终实现方式在 API / Frontend 阶段确定。

内容可能包含：

```text
Overview
Problem
Approach
Architecture
Technology
Design
Implementation
Result
Gallery
Links
```

---

# 12. Work Relationships

Work：

```text
Work
 ├── Translation
 ├── Cover Media
 ├── Gallery Media
 ├── Category
 └── Tags
```

因此需要支持：

```text
Work ↔ Category
Work ↔ Tag
Work ↔ Media
```

---

# 13. Lab

Lab 表示实验项目。

例如：

```text
AI Experiment
WebGL Experiment
Prototype
Interaction
UI Experiment
Technical Research
```

## Fields

```text
id
slug
status
featured
sort_order
cover_media_id
github_url
demo_url
project_url
published_at
created_at
updated_at
```

---

# 14. Lab Status

```text
DRAFT
PUBLISHED
ARCHIVED
```

---

# 15. Lab Translation

## Fields

```text
id
lab_id
locale
title
subtitle
summary
content
seo_title
seo_description
created_at
updated_at
```

Unique：

```text
(lab_id, locale)
```

---

# 16. Writing

Writing 表示文章和长期内容资产。

## Fields

```text
id
slug
status
featured
sort_order
cover_media_id
author_id
reading_time
published_at
created_at
updated_at
```

---

# 17. Writing Status

```text
DRAFT
PUBLISHED
ARCHIVED
```

---

# 18. Writing Translation

## Fields

```text
id
writing_id
locale
title
subtitle
excerpt
content
seo_title
seo_description
created_at
updated_at
```

Unique：

```text
(writing_id, locale)
```

---

# 19. Writing Author

V1 支持 Author Relation：

```text
Writing
   ↓
User
```

即：

```text
writing.author_id
```

这样未来支持多人作者时不需要重新设计核心模型。

V1 默认只有一个 Admin Author。

---

# 20. Experience

Experience 表示个人职业经历。

## Fields

```text
id
company
role
employment_type
location
start_date
end_date
is_current
sort_order
created_at
updated_at
```

---

# 21. Experience Translation

## Fields

```text
id
experience_id
locale
company_name
role_name
summary
content
created_at
updated_at
```

Unique：

```text
(experience_id, locale)
```

---

# 22. Experience Employment Type

建议使用：

```text
FULL_TIME
PART_TIME
FREELANCE
CONTRACT
SELF_EMPLOYED
OTHER
```

---

# 23. Category

Category 用于内容分类。

可关联：

```text
Work
Lab
Writing
```

## Fields

```text
id
slug
sort_order
created_at
updated_at
```

Category 本身支持多语言。

---

# 24. Category Translation

```text
id
category_id
locale
name
description
created_at
updated_at
```

Unique：

```text
(category_id, locale)
```

---

# 25. Tag

Tag 用于更细粒度的内容标记。

例如：

```text
Vue
Nuxt
AI
Agent
TypeScript
Amazon
E-commerce
WebGL
Frontend
Backend
```

## Fields

```text
id
slug
created_at
updated_at
```

---

# 26. Tag Translation

虽然 Tag 可以直接使用统一名称，但为了保持整个 CMS 的国际化一致性，V1 使用：

```text
Tag
TagTranslation
```

## TagTranslation

```text
id
tag_id
locale
name
created_at
updated_at
```

Unique：

```text
(tag_id, locale)
```

---

# 27. Content Classification

Work / Lab / Writing 都可以使用 Category 与 Tag。

结构：

```text
Work
 ├── Categories
 └── Tags

Lab
 ├── Categories
 └── Tags

Writing
 ├── Categories
 └── Tags
```

使用多对多关系。

---

# 28. Many-to-Many Tables

推荐显式 Join Table。

例如：

```text
work_categories
work_tags

lab_categories
lab_tags

writing_categories
writing_tags
```

而不是完全依赖隐式多对多。

原因：

- 更容易扩展
- 更容易增加 sort_order
- 更容易维护
- 数据库关系更清晰

---

# 29. WorkCategory

```text
work_id
category_id
```

Primary Key：

```text
(work_id, category_id)
```

---

# 30. WorkTag

```text
work_id
tag_id
```

Primary Key：

```text
(work_id, tag_id)
```

---

# 31. LabCategory

```text
lab_id
category_id
```

Primary Key：

```text
(lab_id, category_id)
```

---

# 32. LabTag

```text
lab_id
tag_id
```

Primary Key：

```text
(lab_id, tag_id)
```

---

# 33. WritingCategory

```text
writing_id
category_id
```

Primary Key：

```text
(writing_id, category_id)
```

---

# 34. WritingTag

```text
writing_id
tag_id
```

Primary Key：

```text
(writing_id, tag_id)
```

---

# 35. Media

Media 是整个网站的媒体资源中心。

## Fields

```text
id
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
created_at
updated_at
```

---

# 36. Media Storage

文件本体：

```text
Object Storage
```

数据库只保存：

```text
storage_key
url
metadata
```

禁止将图片二进制存入 PostgreSQL。

---

# 37. Media Type

根据 MIME Type 判断：

```text
IMAGE
VIDEO
DOCUMENT
OTHER
```

V1 Public Website 重点支持：

```text
IMAGE
VIDEO
```

V1 上传管线当前**实际只接受 IMAGE**，且限定为以下四种格式（其余一律拒绝）：

```text
image/jpeg
image/png
image/webp
image/avif
```

VIDEO / DOCUMENT / OTHER 仍是数据库层面的类型分类，尚无上传与渲染实现（deferred）。

---

# 38. Media Metadata

`metadata` 可以使用 PostgreSQL JSONB。

例如：

```json
{
  "format": "webp",
  "provider": "object-storage",
  "variants": {
    "thumbnail": "...",
    "medium": "...",
    "large": "..."
  }
}
```

不要把频繁查询的核心字段全部塞进 JSONB。

---

# 39. Content Media Relations

Work：

```text
cover_media_id
```

Lab：

```text
cover_media_id
```

Writing：

```text
cover_media_id
```

Gallery 使用显式关系表。

例如：

```text
work_media
lab_media
writing_media
```

---

# 40. WorkMedia

```text
work_id
media_id
sort_order
caption
```

Primary Key：

```text
(work_id, media_id)
```

---

# 41. LabMedia

```text
lab_id
media_id
sort_order
caption
```

Primary Key：

```text
(lab_id, media_id)
```

---

# 42. WritingMedia

```text
writing_id
media_id
sort_order
caption
```

Primary Key：

```text
(writing_id, media_id)
```

---

# 43. ContactMessage

ContactMessage 保存访客提交的信息。

## Fields

```text
id
name
email
subject
message
status
ip_hash
user_agent
created_at
updated_at
```

---

# 44. ContactMessage Status

```text
UNREAD
READ
ARCHIVED
```

V1 不直接物理删除消息。

优先使用：

```text
ARCHIVED
```

---

# 45. Contact Security

不保存不必要的敏感数据。

IP 地址如果需要用于防滥用，应保存：

```text
ip_hash
```

而不是默认长期保存原始 IP。

Email 是业务联系数据，需要受到访问权限保护。

---

# 46. SiteSetting

SiteSetting 保存全局网站配置。

## Fields

```text
id
key
value
type
description
created_at
updated_at
```

---

# 47. SiteSetting Examples

例如：

```text
site.title
site.description
site.email
site.github
site.linkedin
site.location
site.availability
site.default_locale
site.theme
```

---

# 48. SiteSetting Value

`value` 可以使用：

```text
JSONB
```

并通过：

```text
type
```

解释：

```text
STRING
NUMBER
BOOLEAN
JSON
```

避免所有配置都必须使用字符串。

---

# 49. SiteSetting Constraint

```text
key UNIQUE
```

---

# 50. Publication Model

Work / Lab / Writing 统一使用：

```text
DRAFT
PUBLISHED
ARCHIVED
```

逻辑：

```text
DRAFT
  │
  ▼
PUBLISHED
  │
  ▼
ARCHIVED
```

允许：

```text
DRAFT → PUBLISHED
PUBLISHED → DRAFT
PUBLISHED → ARCHIVED
ARCHIVED → DRAFT
```

---

# 51. Public Visibility

Public API 只允许：

```text
status = PUBLISHED
```

并且：

```text
published_at IS NOT NULL
```

的数据。

---

# 52. Featured Content

Work / Lab / Writing 都可以：

```text
featured BOOLEAN
```

首页只显示：

```text
featured = true
AND
status = PUBLISHED
```

最终数量由 API 控制。

---

# 53. Sorting

需要人工排序的实体使用：

```text
sort_order INTEGER
```

默认：

```text
0
```

排序：

```text
sort_order ASC
created_at DESC
```

具体排序规则由 API 层定义。

---

# 54. Slug

Public Content 使用：

```text
slug
```

例如：

```text
ai-agent-platform
eson-web
amazon-automation
interactive-webgl-lab
```

Slug 必须：

```text
UNIQUE
LOWERCASE
URL SAFE
```

---

# 55. Slug Scope

Work：

```text
work.slug UNIQUE
```

Lab：

```text
lab.slug UNIQUE
```

Writing：

```text
writing.slug UNIQUE
```

不同内容类型可以拥有相同 slug，因为 URL namespace 不同。

例如：

```text
/work/eson
/lab/eson
/writing/eson
```

---

# 56. Foreign Key Strategy

主要关系：

```text
Work → WorkTranslation
Work → Category
Work → Tag
Work → Media

Lab → LabTranslation
Lab → Category
Lab → Tag
Lab → Media

Writing → WritingTranslation
Writing → Category
Writing → Tag
Writing → Media
Writing → User

Experience → ExperienceTranslation

ContactMessage → none

SiteSetting → none
```

---

# 57. Delete Strategy

对于 Translation：

```text
CASCADE
```

例如：

```text
Work
 ↓ delete
WorkTranslation
 ↓
Cascade Delete
```

对于 Category / Tag：

默认：

```text
RESTRICT
```

避免删除分类时意外删除内容。

对于 Media：

默认：

```text
RESTRICT
```

如果媒体正在被使用，不允许直接删除数据库记录。

---

# 58. Index Strategy

必须为以下字段建立 Index：

```text
slug
status
published_at
featured
sort_order
created_at
```

---

# 59. Composite Index

Work：

```text
(status, published_at)
(status, featured)
```

Lab：

```text
(status, published_at)
(status, featured)
```

Writing：

```text
(status, published_at)
(status, featured)
```

---

# 60. Translation Index

Translation 表：

```text
(work_id, locale)
(lab_id, locale)
(writing_id, locale)
(experience_id, locale)
(category_id, locale)
(tag_id, locale)
```

这些同时作为：

```text
UNIQUE
```

因此天然拥有索引。

---

# 61. Content Query Optimization

首页典型查询：

```text
Featured Work
Featured Lab
Latest Writing
```

应该避免：

```text
SELECT *
```

而只读取需要的数据。

例如：

```text
id
slug
title
summary
cover
publishedAt
```

---

# 62. Pagination

Writing / Work / Lab 列表必须支持 Pagination。

V1 使用：

```text
page
pageSize
```

例如：

```text
?page=1&pageSize=12
```

默认 `pageSize = 12`，最大 `pageSize = 100`。

API 分页参数禁止使用 `limit`。

未来数据量明显增加后，可以迁移到 Cursor Pagination。

---

# 63. Transaction Strategy

以下操作需要 Transaction：

```text
Create Work
 ├── Work
 ├── Translation
 ├── Categories
 └── Tags
```

以及：

```text
Update Work
 ├── Translation
 ├── Categories
 └── Tags
```

确保数据不会出现：

```text
Work 已创建
Translation 创建失败
Category 更新失败
```

这种部分成功状态。

---

# 64. Admin Content Save

Admin 保存一个 Work 时：

```text
Admin
 ↓
API
 ↓
Validation
 ↓
Transaction
 ├── Work
 ├── Translations
 ├── Categories
 ├── Tags
 └── Media Relations
 ↓
Commit
```

如果任意关键操作失败：

```text
Rollback
```

---

# 65. Draft Strategy

Draft 数据可以：

```text
Admin
```

查看。

Public：

```text
不可见
```

Admin API 可以支持：

```text
?status=draft
```

---

# 66. Bilingual Content Rule

V1 原则：

```text
zh-CN
en-US
```

两种语言可以独立发布。

例如：

```text
Work
 ├── zh-CN → Published
 └── en-US → Draft
```

中文页面可以正常发布。

英文页面仍然可以处于 Draft。

---

# 67. Missing Translation Behavior

如果当前语言不存在翻译：

```text
Current Locale
      ↓
Translation exists?
   ┌──┴──┐
  YES    NO
   │      │
   ▼      ▼
 Render  Fallback
         ↓
      zh-CN
```

V1 默认：

```text
Fallback Locale = zh-CN
```

但 Admin 应该明确显示：

```text
Translation Missing
```

避免管理员误以为英文内容已经完成。

---

# 68. Database Diagram

整体关系：

```text
                         ┌──────────────┐
                         │     User     │
                         └──────┬───────┘
                                │
                                │ author
                                ▼
                         ┌──────────────┐
                         │   Writing    │
                         └──────┬───────┘
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
             WritingTranslation      WritingMedia
                     │                     │
                     │                     ▼
                     │                  Media
                     │
                     ├──────────────┐
                     ▼              ▼
                  Category         Tag


┌──────────────┐
│     Work     │
└──────┬───────┘
       │
 ┌─────┼─────────────┐
 ▼     ▼             ▼
Trans  Category      Tag
 │
 ▼
Media


┌──────────────┐
│     Lab      │
└──────┬───────┘
       │
 ┌─────┼─────────────┐
 ▼     ▼             ▼
Trans  Category      Tag
 │
 ▼
Media


┌──────────────────┐
│    Experience    │
└────────┬─────────┘
         │
         ▼
 ExperienceTranslation


┌──────────────────┐
│ ContactMessage   │
└──────────────────┘


┌──────────────────┐
│   SiteSetting    │
└──────────────────┘
```

---

# 69. Proposed Table List

V1 数据库最终预计包含：

```text
users

works
work_translations
work_categories
work_tags
work_media

labs
lab_translations
lab_categories
lab_tags
lab_media

writings
writing_translations
writing_categories
writing_tags
writing_media

experiences
experience_translations

categories
category_translations

tags
tag_translations

media

contact_messages

site_settings
```

总计：

```text
25 tables
```

表数量以上述清单为准，V1 不为凑数量增加任何新表。

---

# 70. Prisma Model Mapping

Prisma Model 使用 PascalCase：

```text
User

Work
WorkTranslation
WorkCategory
WorkTag
WorkMedia

Lab
LabTranslation
LabCategory
LabTag
LabMedia

Writing
WritingTranslation
WritingCategory
WritingTag
WritingMedia

Experience
ExperienceTranslation

Category
CategoryTranslation

Tag
TagTranslation

Media

ContactMessage

SiteSetting
```

数据库 table 使用 snake_case。

---

# 71. Prisma Relation Naming

关系必须使用明确名称。

例如：

```text
WorkTranslation.work
Work.coverMedia

Work.categories
Work.tags
Work.media
```

避免 Prisma 自动生成难以理解的 Relation Name。

---

# 72. Database Migration

数据库变更必须通过 Prisma Migration。

禁止直接在 Production 数据库手动修改 Schema。

标准流程：

```text
Modify schema.prisma
        ↓
prisma migrate dev
        ↓
Review Migration
        ↓
Test
        ↓
Commit Migration
        ↓
Production Migration
```

---

# 73. Production Migration

Production 使用：

```text
prisma migrate deploy
```

禁止在 Production 使用：

```text
prisma migrate dev
```

## 73.1 Production Database Initialization（Phase 5-D，已实现）

生产数据库必须是**全新的空数据库**，不复用开发库、不导入开发库 dump。

初始化顺序：

```text
1. 创建空的 production database（不使用开发库、不复制 volume / dump）
2. prisma migrate deploy            ← 只应用已提交的 migration，不生成新 migration
3. 禁止 prisma db seed              ← seed 仅用于开发/QA（源码内已有 NODE_ENV=production 护栏）
4. 运行 Admin Bootstrap（见 §75）创建唯一管理员
5. 启动 backend，验证 /api/v1/health 与 /api/v1/auth/login
```

执行 migration 的位置：CI/部署步骤，或使用生产镜像的 **build 阶段镜像**（`prisma` CLI 不在 runtime 镜像中）：

```bash
docker build --target build -f docker/backend.prod.Dockerfile -t eson-web-backend:build .
docker run --rm --network <app-network> \
  -e DATABASE_URL="postgresql://<user>:<password>@postgres:5432/<db>?schema=public" \
  -w /app eson-web-backend:build pnpm --filter backend exec prisma migrate deploy
```

初始化完成后应验证：

```text
business tables = 25（+ _prisma_migrations）
_prisma_migrations 无 pending / failed
所有业务表为空（除 bootstrap 创建的管理员，users = 1）
不存在 seed 占位内容 / QA contact messages / 开发默认管理员
```

---

# 74. Seed Data

Development 环境需要 Seed。

至少包含：

```text
1 Admin User
Sample Categories
Sample Tags
Sample Work
Sample Lab
Sample Writing
Sample Experience
Site Settings
```

Seed 数据必须明确标记为 Development/Test 数据。

---

# 75. Admin Seed

Development 默认创建一个 Admin。

密码不能硬编码进 Production。

推荐通过：

```text
ADMIN_EMAIL
ADMIN_PASSWORD
```

等环境变量初始化。

## 75.1 Admin Bootstrap（Phase 5-D，已实现）

生产环境使用一次性 CLI 创建管理员（**不参与应用启动流程**，不会自动创建账号）：

```bash
# 生产容器内（dist 已包含该命令，runtime 镜像无需 prisma CLI）
docker compose -f docker-compose.prod.yml exec backend node dist/bootstrap-admin.js

# 等价 npm script（需要已构建的 dist）
pnpm --filter backend admin:bootstrap
```

必填环境变量：

```text
DATABASE_URL        目标数据库（bootstrap 只打印 host:port/database，不含凭据）
ADMIN_EMAIL         管理员邮箱（统一小写，与登录查询方式一致）
ADMIN_PASSWORD      管理员密码
ADMIN_NAME          可选，默认 Admin
```

行为与安全约束：

```text
密码使用 argon2id 哈希（与登录 argon2.verify 同一机制），数据库不保存明文
创建后回读并校验哈希可用于登录，失败则报 VERIFICATION_FAILED
拒绝开发默认账号（admin@example.com / dev-only-password）与短于 12 位的密码
邮箱已存在 → 明确失败（ADMIN_ALREADY_EXISTS），不修改已有账号、不创建重复账号
错误信息只包含配置键与稳定错误码，绝不输出密码或连接串
```

稳定错误码：

```text
MISSING_EMAIL / INVALID_EMAIL / MISSING_PASSWORD
WEAK_PASSWORD / DEV_DEFAULT_NOT_ALLOWED
ADMIN_ALREADY_EXISTS / VERIFICATION_FAILED
```

验证登录：

```bash
curl -X POST https://<domain>/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}'
```

---

# 76. Database Backup

Production PostgreSQL 必须具备：

```text
Automated Backup
Point-in-Time Recovery（如果托管服务支持）
```

至少保证：

```text
Database
Media
```

都可以恢复。

## 76.1 Implemented Backup（Phase 5-G）

实际实现（`docker/backup/backup-db.sh`，一次性 `backup` 服务）：

```bash
docker compose -f docker-compose.prod.yml run --rm backup /scripts/backup-db.sh
```

```text
格式      pg_dump --format=custom（-Fc，可用 pg_restore 恢复）
产物      backup-data 卷：db/eson_web_db_<UTC>.dump + .sha256 + .meta.json
元数据    host / port / db 名 / 时间 / 格式 / 大小 / sha256 / pg_dump 版本 / Prisma migration 名
自检      生成后立即 pg_restore --list
权限      文件 0600、目录 0700（umask 077）
恢复      restore-db.sh（恢复进隔离目标库；拒绝 eson_web / 源库 / 已存在库）
验证      verify-recovery.sh（schema + 行数 + 关系 + admin + DB↔Media 一致性）
```

> 备份卷 `backup-data` 与 `postgres-data` / `media-data` 完全分离；
> 备份产物绝不进入 Git 或 Docker 镜像。完整流程见 [docs/RECOVERY.md](RECOVERY.md)。

---

# 77. Media Backup

数据库 Backup 不等于 Media Backup。

必须分别考虑：

```text
PostgreSQL Backup
+
Object Storage Backup
```

否则恢复数据库后可能出现：

```text
Media URL exists
File missing
```

## 77.1 Implemented Media Backup（Phase 5-G）

```bash
docker compose -f docker-compose.prod.yml run --rm backup /scripts/backup-media.sh
```

```text
产物      backup-data 卷：media/eson_web_media_<UTC>.tar.gz + .sha256 + .manifest.sha256 + .meta.json
结构      保留 media/<yyyy>/<mm>/<uuid>.<ext>，object key 与 storage_key 完全一致
清单      manifest 记录每个文件相对路径 + sha256；恢复时逐文件比对
恢复      restore-media.sh（拒绝直接覆盖线上媒体目录，需显式开关）
一致性    verify-recovery.sh 检查 DB → File（存在 / 大小 / mime）与 File → DB（孤儿文件）
```

> `media.url` 是上传时写入数据库的绝对 URL；同域恢复无需修改，
> 换域名恢复需要按 [docs/RECOVERY.md](RECOVERY.md) §14 更新。

---

# 78. Data Integrity Rules

禁止：

```text
Orphan Translation
Orphan Join Record
Broken Media Relation
Duplicate Slug
Duplicate Locale Translation
```

数据库 Foreign Key 与 Unique Constraint 必须承担第一层保护。

---

# 79. Content Integrity

Published Content 必须至少具备：

```text
slug
status
translation
title
summary/content
```

具体发布校验由 Backend Service 负责。

例如：

```text
Work Publish
 ↓
Check zh-CN Translation
 ↓
Check title
 ↓
Check summary
 ↓
Check content
 ↓
Check slug
 ↓
Publish
```

---

# 80. Database Security

数据库凭据：

```text
DATABASE_URL
```

只能通过 Environment Configuration 注入。

禁止：

```text
Git
Source Code
Frontend
Public API
```

暴露数据库连接信息。

PostgreSQL 不允许直接暴露给 Public Internet，除非基础设施明确要求并经过安全配置。

---

# 81. Future Database Extensions

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

但 V1 不创建这些表。

---

# 82. V1 Database Scope

V1 必须实现：

```text
[✓] User
[✓] Work
[✓] Work Translation
[✓] Lab
[✓] Lab Translation
[✓] Writing
[✓] Writing Translation
[✓] Experience
[✓] Experience Translation
[✓] Category
[✓] Category Translation
[✓] Tag
[✓] Tag Translation
[✓] Media
[✓] Contact Message
[✓] Site Setting
[✓] Relations
[✓] Indexes
[✓] Constraints
[✓] Migration
[✓] Seed
```

---

# 83. Database Acceptance Criteria

DATABASE.md 通过标准：

```text
[ ] 所有核心实体已经定义
[ ] 所有多语言实体已经定义
[ ] 所有 Foreign Key 已定义
[ ] 所有 Unique Constraint 已定义
[ ] 所有重要 Index 已定义
[ ] Status Enum 已定义
[ ] Locale Strategy 已定义
[ ] Media Strategy 已定义
[ ] Delete Strategy 已定义
[ ] Transaction Strategy 已定义
[ ] Migration Strategy 已定义
[ ] Seed Strategy 已定义
[ ] Backup Strategy 已定义
```

---

# 84. Final Database Architecture

```text
                    PostgreSQL
                         │
        ┌────────────────┼────────────────┐
        │                │                │
       CMS             Content          System
        │                │                │
        ▼                ▼                ▼
      User         Work / Lab /       Settings
                    Writing /
                   Experience
                         │
                         ▼
                    Translation
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           Category      Tag       Media
                         │
                         ▼
                  Object Storage

                   ContactMessage
```

---

# 85. Document Status

```text
Document: DATABASE.md
Version: 1.0
Status: APPROVED
Project: Eson_web

Database:
PostgreSQL

ORM:
Prisma

Locale:
zh-CN / en-US

Primary Key:
UUID

Timestamp:
UTC / TIMESTAMPTZ

Migration:
Prisma Migration
```

数据库设计完成后，下一阶段必须进入：

```text
docs/API.md
```

API.md 将严格根据本数据库设计定义：

- Endpoint
- Request
- Response
- DTO
- Validation
- Pagination
- Filtering
- Sorting
- Authentication
- Authorization
- Error Codes
- Public API
- Admin API
- Contact API
- Media Upload API
- Swagger/OpenAPI 规范
