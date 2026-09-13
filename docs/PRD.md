# Eson_web
## Product Requirements Document

**Document Version:** 1.0  
**Product Version:** V1  
**Project:** Eson_web  
**Brand:** ESON  
**Default Language:** 简体中文  
**Secondary Language:** English  
**Status:** Draft for Confirmation

---

# 1. 产品概述

## 1.1 产品名称

**Eson_web**

品牌名称：

**ESON**

---

## 1.2 产品定位

Eson_web 是一个以 **ESON 个人品牌**为核心的专业软件工程师个人网站。

网站不仅用于展示个人经历和项目作品，同时作为一个长期运营的个人数字平台，用于展示：

- 软件工程能力
- Frontend Engineering
- AI / AI Agent
- Backend Engineering
- Digital Product
- E-commerce
- Automation
- Open Source
- Technical Writing
- Product Experiments
- Personal Projects
- Professional Experience

核心定位：

> **A professional software engineer personal brand website.**

中文定位：

> **一个专业的软件工程师个人品牌网站。**

---

# 2. 产品目标

## 2.1 第一目标

访问者进入网站后，应在短时间内理解：

1. ESON 是谁
2. ESON 擅长什么
3. ESON 做过什么
4. ESON 正在研究什么
5. 如何联系 ESON

---

## 2.2 第二目标

建立一个具有明显个人品牌特征的技术型 Portfolio。

网站应该区别于传统：

- 简历网站
- 程序员作品集模板
- 普通博客
- 企业官网

核心体验：

> **Technology + Personal Brand + Portfolio + Interactive Experience**

---

## 2.3 第三目标

建立一个可长期运营的内容平台。

未来可以持续增加：

- 项目
- AI 实验
- 技术文章
- 开源项目
- 产品
- 工作经历
- 技术研究
- 自动化工具

因此 V1 必须具备真正可用的 CMS/Admin 能力。

---

# 3. 目标用户

Eson_web 面向多个用户群体。

## 3.1 潜在客户

关注：

- 能做什么
- 做过什么
- 项目质量
- 产品能力
- 联系方式

---

## 3.2 潜在雇主 / Recruiter

关注：

- 技术能力
- 项目经验
- 工作经历
- 技术栈
- 工程思维

---

## 3.3 开发者 / 技术社区

关注：

- 技术项目
- GitHub
- AI Agent
- Frontend
- Engineering
- Technical Writing
- Lab Experiments

---

## 3.4 Amazon / E-commerce Business Partner

关注：

- 电商经验
- 产品思维
- 自动化
- 数据
- 软件工具
- 商业实践

---

## 3.5 普通访客

关注：

- 个人介绍
- 项目
- 文章
- 联系方式

---

# 4. 品牌定位

## 4.1 Brand

**ESON**

---

## 4.2 Hero 主标题

正式使用：

> **SOFTWARE ENGINEER & BUILDER**

---

## 4.3 品牌关键词

```text
ENGINEERING
AI
PRODUCT
INTERACTION
EXPERIMENT
BUILD
```

---

## 4.4 品牌气质

整体视觉应该体现：

- Professional
- Technical
- Futuristic
- Minimal
- Interactive
- Premium
- Experimental

避免：

- 廉价科技感
- 过度霓虹
- 过度赛博朋克
- 大量粒子
- 无意义 3D
- 模板化 Portfolio
- 过度动画

---

# 5. 视觉方向

## 5.1 整体风格

采用：

> **Dark / Technology / Immersive**

但不是纯黑网站。

背景应使用深色层级，例如：

```text
#07080C
#0B0D12
#10131A
```

具体颜色将在 Design System 阶段正式确定。

---

## 5.2 动效

网站需要具有明显的动态体验。

推荐使用：

- Scroll Reveal
- Smooth Transition
- Parallax
- Cursor Interaction
- Light Field
- Text Animation
- Image Reveal
- Page Transition
- Subtle WebGL
- Hover Interaction

原则：

> 动效必须服务于信息表达和品牌体验。

不能为了动画而动画。

---

# 6. 多语言

## 6.1 支持语言

V1 支持：

```text
中文
English
```

---

## 6.2 默认语言

默认：

> **中文**

---

## 6.3 语言切换

导航栏提供：

```text
中文 / EN
```

语言切换不应导致明显的整站刷新体验。

---

## 6.4 内容要求

核心页面均应支持双语：

- Home
- About
- Work
- Lab
- Writing
- Experience
- Contact

Admin 中的可管理内容也应考虑双语字段。

---

# 7. 信息架构

## 7.1 前台

```text
/
├── Home
├── About
├── Work
│   └── /work/:slug
├── Lab
│   └── /lab/:slug
├── Writing
│   └── /writing/:slug
├── Experience
└── Contact
```

---

## 7.2 后台

```text
/admin                （Dashboard）
├── /admin/login
├── /admin/work
├── /admin/lab
├── /admin/writing
├── /admin/experience
├── /admin/categories
├── /admin/tags
├── /admin/media
├── /admin/messages
└── /admin/settings
```

---

# 8. Global Navigation

桌面端导航保持极简。

```text
ESON

WORK
LAB
WRITING
ABOUT

中文 / EN
```

不建议将所有页面直接放入导航。

例如：

- Experience
- Contact

可以通过首页和 About / Footer 进入。

---

# 9. Home 首页

Home 是整个产品最重要的页面。

首页结构：

```text
HOME
│
├── HERO
├── INTRO
├── SELECTED WORK
├── CAPABILITIES
├── LAB
├── WRITING
├── EXPERIENCE
└── CONTACT
```

---

## 9.1 HERO

### 目标

建立第一印象。

用户应该快速知道：

- 品牌：ESON
- 职业：Software Engineer
- 定位：Builder
- 关注领域：Software / AI / Digital Products

---

### 推荐结构

```text
[ SYSTEM ONLINE ]

ESON

SOFTWARE
ENGINEER
&
BUILDER

I BUILD DIGITAL PRODUCTS,
AI SYSTEMS & INTERACTIVE EXPERIENCES.

● AVAILABLE

↓ EXPLORE
```

具体文案可以在 UI/Content 阶段进一步调整。

---

## 9.2 INTRO

目标：

进一步介绍个人定位。

核心内容：

- Software Engineering
- AI
- Digital Product
- Frontend
- Automation
- E-commerce

---

## 9.3 SELECTED WORK

展示精选项目。

每个项目至少包含：

- Title
- Summary
- Category
- Technology
- Cover
- Link

支持：

> View Work

进入项目详情。

---

# 10. Work

Work 是正式项目作品集合。

URL：

```text
/work
```

---

## 10.1 Work 列表

支持：

- 项目展示
- 分类
- Tag
- Featured
- 排序

---

## 10.2 Work Detail

URL：

```text
/work/:slug
```

项目详情至少包含：

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
GitHub
Demo
Next Work
```

> 状态（Phase 4-F.6.2）：`Gallery` 已实现（Work 与 Lab 的详情页均渲染 Gallery；Writing 不含 Gallery）。
> Gallery 为静态展示，不含 lightbox / zoom / fullscreen。渲染规则见 docs/DESIGN.md §15.1。

具体字段在数据库设计阶段确定。

---

# 11. Lab

Lab 是 Eson_web 的特色内容区域。

URL：

```text
/lab
```

---

## 11.1 Lab 定位

Lab 用于展示：

- Prototype
- Experiment
- AI Agent
- Frontend Experiment
- WebGL
- Automation
- Tools
- Product Ideas
- Technical Experiments

---

## 11.2 Work 与 Lab 的区别

```text
WORK
正式项目
成熟作品
完整案例

LAB
实验
Prototype
概念验证
技术探索
```

---

## 11.3 Lab Detail

URL：

```text
/lab/:slug
```

内容可以包括：

- Experiment
- Motivation
- Technology
- Demo
- Source
- Result
- Notes

---

# 12. Writing

URL：

```text
/writing
```

Writing 是技术内容中心。

内容方向：

```text
Engineering
AI
Frontend
Product
E-commerce
Business
Thoughts
```

---

## 12.1 Writing Detail

URL：

```text
/writing/:slug
```

包含：

- Title
- Category
- Tags
- Published Date
- Reading Time
- Content
- Related Writing

---

# 13. Experience

URL：

```text
/experience
```

用于展示：

- 工作经历
- 项目经历
- 专业经验
- 技术成长

可以使用时间线或其他具有品牌感的展示方式。

---

# 14. About

URL：

```text
/about
```

内容：

```text
Introduction
What I Do
Engineering Philosophy
Technology
Interests
Current Focus
Contact
```

---

# 15. Contact

URL：

```text
/contact
```

目标：

让访客能够快速建立联系。

支持：

- Contact Form
- Email
- GitHub
- LinkedIn
- 其他社交 / 联系方式

Contact Form 至少支持：

```text
Name
Email
Subject
Message
```

---

# 16. Admin

Admin 是真正可用的内容管理系统。

---

## 16.1 Login

```text
/admin/login
```

功能：

- 登录
- 身份认证
- Session / Token 管理
- Logout

---

## 16.2 Dashboard

路径：

```text
/admin
```

展示：

```text
Work
Lab
Writing
Messages
```

以及：

- 最近项目
- 最近文章
- 最近消息
- 系统状态

---

# 17. Work Management

Admin：

```text
/admin/work
```

支持：

- Create
- Read
- Update
- Delete
- Publish
- Unpublish
- Featured
- Sort

---

# 18. Lab Management

Admin：

```text
/admin/lab
```

支持：

- Create
- Edit
- Delete
- Publish
- Draft
- Featured
- Sort

---

# 19. Writing Management

Admin：

```text
/admin/writing
```

支持：

- Create
- Edit
- Delete
- Draft
- Publish
- Categories
- Tags
- Featured

---

# 20. Experience Management

Admin：

```text
/admin/experience
```

支持：

- Create
- Edit
- Delete
- Sort
- Publish / Hide

---

# 21. Categories / Tags

用于管理：

```text
Categories
Tags
```

可以应用于：

- Work
- Lab
- Writing

---

# 22. Media

Admin：

```text
/admin/media
```

用于统一管理：

- Work Images
- Writing Images
- Lab Images
- Avatar
- Cover
- Other Assets

V1 应建立统一媒体管理能力，而不是把图片路径硬编码到页面中。

---

# 23. Messages

Contact Form 提交的数据进入：

```text
/admin/messages
```

支持：

- 查看
- 标记已读
- 标记未读
- 删除

---

# 24. Settings

Admin：

```text
/admin/settings
```

用于管理：

- Site Title
- Description
- Social Links
- Contact Email
- SEO
- Language
- Site Status
- Other Global Settings

---

# 25. 用户流程

## 25.1 普通访问

```text
Home
 ↓
Hero
 ↓
Intro
 ↓
Work
 ↓
Lab
 ↓
Writing
 ↓
Experience
 ↓
Contact
```

---

## 25.2 查看项目

```text
Home
 ↓
Selected Work
 ↓
Work
 ↓
Work Detail
 ↓
GitHub / Demo
```

---

## 25.3 阅读文章

```text
Home
 ↓
Writing
 ↓
Writing Detail
 ↓
Related Writing
```

---

## 25.4 联系

```text
Home
 ↓
Contact
 ↓
Contact Form
 ↓
Submit
 ↓
Success
```

---

# 26. 内容模型

核心内容类型：

```text
Work
Lab
Writing
Experience
Category
Tag
Media
ContactMessage
User
SiteSetting
```

---

# 27. 权限

V1 暂定：

```text
Admin
```

Admin 才能：

- 登录后台
- 创建内容
- 编辑内容
- 删除内容
- 发布内容
- 管理消息
- 修改网站设置

普通访客：

```text
Public / Visitor
```

只能：

- 查看公开内容
- 提交 Contact Message

---

# 28. SEO

V1 必须支持基础 SEO。

包括：

- Page Title
- Meta Description
- Canonical URL
- Open Graph
- Twitter/X Card
- Sitemap
- robots.txt
- Semantic HTML
- Writing metadata

每个：

```text
Work
Lab
Writing
```

都应支持独立 SEO 信息。

---

# 29. Responsive

必须支持：

```text
Desktop
Tablet
Mobile
```

重点保证：

- Navigation
- Hero
- Work Showcase
- Lab
- Writing
- Contact
- Admin

在移动端仍然具有完整体验。

---

# 30. Performance

动画和视觉效果不能以牺牲性能为代价。

必须考虑：

- Lazy Loading
- Image Optimization
- Code Splitting
- Animation Optimization
- WebGL 降级
- Mobile Performance
- Loading State
- Error State

对于低性能设备，应允许降低部分视觉效果。

---

# 31. Accessibility

V1 应满足基本 Web Accessibility 要求：

- Keyboard Navigation
- Focus State
- Semantic HTML
- Alt Text
- Color Contrast
- Reduced Motion Support
- Form Accessibility

如果用户启用了：

```text
prefers-reduced-motion
```

应减少非必要动画。

---

# 32. Security

Admin 系统必须考虑：

- Password Hashing
- Authentication
- Authorization
- Input Validation
- XSS Protection
- CSRF 风险控制
- Rate Limiting
- CORS
- SQL Injection 防护
- Secure Cookie / Token
- Environment Secrets
- File Upload Validation

敏感配置不得提交到 Git。

---

# 33. Error Handling

系统必须具备：

```text
404
500
Network Error
API Error
Form Error
Upload Error
Authentication Error
Permission Error
```

同时提供友好的用户反馈。

---

# 34. Loading States

所有异步页面至少需要考虑：

```text
Loading
Success
Empty
Error
```

例如：

```text
Writing Loading
Writing Empty
Writing Error
```

不能只设计成功状态。

---

# 35. V1 范围

## P0 — 必须完成

### 前台

- Home
- About
- Work
- Work Detail
- Lab
- Lab Detail
- Writing
- Writing Detail
- Experience
- Contact

### 多语言

- 中文
- English
- 中文默认

### Admin

- Login
- Dashboard
- Work CRUD
- Lab CRUD
- Writing CRUD
- Experience CRUD
- Category
- Tag
- Media
- Messages
- Settings

### 工程能力

- Responsive
- SEO
- Loading
- Error Handling
- Authentication
- Authorization
- Security
- Testing
- Production Build
- Deployment

---

# 36. P1 功能

V1 完成后可以增加：

- Search
- Analytics
- GitHub API
- RSS
- Newsletter
- Comments
- Advanced WebGL
- AI Content Assistant
- AI Search
- GitHub Activity
- External Data Integration

---

# 37. 明确不在 V1 的功能

为了避免项目无限膨胀，以下暂不作为 V1 核心需求：

- 用户注册系统
- 多角色复杂权限
- 社交系统
- 评论社区
- Newsletter 系统
- 复杂 Analytics 平台
- 电商支付
- 在线课程
- 大型 SaaS 功能

---

# 38. V1 完成定义

Eson_web V1 只有在以下条件全部满足时，才认为完成：

```text
[ ] 前台所有 P0 页面完成
[ ] Admin 完成
[ ] 数据库完成
[ ] API 完成
[ ] 前后端完成真实连接
[ ] 中文完成
[ ] English 完成
[ ] Responsive 完成
[ ] SEO 完成
[ ] Loading / Empty / Error 完成
[ ] Authentication 完成
[ ] Security 基础能力完成
[ ] Unit Test 完成
[ ] Integration Test 完成
[ ] E2E Test 完成
[ ] Production Build 成功
[ ] Deployment 成功
[ ] Production 环境验证通过
```

---

# 39. 产品核心原则

## Principle 01

> **Content First**

视觉服务于内容，而不是反过来。

---

## Principle 02

> **Engineering Quality**

网站本身必须体现软件工程质量。

---

## Principle 03

> **Interactive but Controlled**

有交互，但不堆砌动画。

---

## Principle 04

> **Personal Brand**

网站不是模板化 Portfolio。

---

## Principle 05

> **Built to Evolve**

架构必须允许未来持续扩展。

---

## Principle 06

> **Production Ready**

V1 不是 Demo。

V1 必须能够：

> **真实使用、真实管理、真实部署。**

---

# 40. 下一阶段

PRD 确认后进入：

```text
PHASE 1
PRD
      ↓
PHASE 2
UI / UX
      ↓
PHASE 3
System Architecture
      ↓
PHASE 4
Database
      ↓
PHASE 5
API Contract
      ↓
PHASE 6
Project Initialization
      ↓
PHASE 7
Backend
      ↓
PHASE 8
Frontend
      ↓
PHASE 9
Integration
      ↓
PHASE 10
QA
      ↓
PHASE 11
Code Review
      ↓
PHASE 12
Deployment
```

---

# 41. 当前状态

```text
Project Name       Eson_web
Brand              ESON
Product Type       Personal Brand Website
Audience            Multiple
Positioning        Software Engineer & Builder
Frontend Direction  Vue
Language            Chinese + English
Default Language    Chinese
Visual              Dark / Technology / Immersive
Admin               Yes
V1                  Production Ready
Sitemap             Defined
PRD                 V1 Draft
```

**Next Document:**

`docs/DESIGN.md`

用于正式定义：

- Visual Direction
- Design System
- Typography
- Color System
- Spacing
- Grid
- Components
- Motion
- Hero
- Navigation
- Work
- Lab
- Writing
- Responsive UI
- Mobile UI
- Accessibility
- Interaction Rules
