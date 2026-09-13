# Eson_web
## UI/UX & Design System

**Project:** Eson_web  
**Brand:** ESON  
**Document:** `docs/DESIGN.md`  
**Version:** 1.0  
**Status:** Design Specification  
**Default Language:** 中文  
**Secondary Language:** English

---

# 1. Design Philosophy

Eson_web is not a traditional developer portfolio.

The design should communicate:

> **Software Engineer + Builder + Digital Product + Experimentation**

The visual experience should feel:

- Technical
- Professional
- Premium
- Minimal
- Futuristic
- Interactive
- Immersive
- Human

The website should look like it was **engineered**, not assembled from a template.

---

# 2. Core Design Principles

## 2.1 Content First

Visual effects must support content.

Never sacrifice:

- readability
- navigation
- performance
- accessibility

for visual effects.

---

## 2.2 Controlled Complexity

The interface can be sophisticated internally while remaining simple externally.

Users should see:

```text
Simple interface
+
Rich interaction
+
Clear hierarchy
```

Not:

```text
Lots of UI
+
Lots of effects
+
Lots of information
```

---

## 2.3 Motion With Purpose

Every major animation should have a reason.

Valid reasons:

- establish hierarchy
- indicate interaction
- reveal information
- communicate state
- create continuity
- improve navigation
- reinforce brand identity

Avoid animation that exists only because it looks impressive.

---

## 2.4 Engineering Aesthetic

The visual language should subtly reference software systems.

Possible visual vocabulary:

```text
SYSTEM
STATUS
GRID
NODE
SIGNAL
DATA
PROCESS
BUILD
RUN
```

But these elements must remain subtle.

Do not turn the website into a cyberpunk terminal.

---

# 3. Visual Direction

## 3.1 Overall Style

Primary direction:

> **Dark Technology + Immersive Portfolio**

Secondary characteristics:

> Editorial + Minimal + Experimental

---

## 3.2 Background

The background must not be pure black.

Base background:

```text
#07080C
```

Secondary surfaces:

```text
#0B0D12
#10131A
#141820
```

The exact production values may be adjusted during implementation after visual testing.

---

## 3.3 Color System

### Background

```text
Background Primary
#07080C

Background Secondary
#0B0D12

Surface
#10131A

Surface Elevated
#141820
```

### Text

```text
Text Primary
#F2F4F7

Text Secondary
#A7ADB8

Text Muted
#6E7582
```

### Border

```text
Border
rgba(255,255,255,0.08)

Border Strong
rgba(255,255,255,0.14)
```

---

## 3.4 Accent Color

The design uses one primary dynamic accent.

Recommended direction:

```text
Electric Blue
```

with optional transition toward:

```text
Blue → Violet
```

Accent should be used for:

- active states
- links
- important buttons
- system indicators
- selected elements
- subtle glow
- interactive highlights

Do not use the accent color everywhere.

---

# 4. Typography

Typography is one of the primary visual elements.

## 4.1 Font Strategy

Chinese:

> Modern system / Noto Sans CJK style font stack.

English:

> Modern sans-serif.

Recommended conceptual stack:

```text
Inter
Noto Sans
Noto Sans SC
system-ui
sans-serif
```

The final implementation should use an optimized production font strategy.

---

# 5. Typography Scale

## Display

Used by Hero.

```text
Desktop:
72–140px

Tablet:
64–96px

Mobile:
42–64px
```

Hero typography should be responsive rather than fixed.

---

## H1

```text
Desktop: 56–80px
Mobile: 40–52px
```

---

## H2

```text
Desktop: 40–56px
Mobile: 32–40px
```

---

## H3

```text
Desktop: 24–32px
Mobile: 22–28px
```

---

## Body

```text
Desktop: 16–18px
Mobile: 15–17px
```

---

## Small / Meta

```text
12–14px
```

Used for:

- categories
- dates
- status
- metadata
- technical labels

---

# 6. Typography Rules

Headings should generally use:

```text
font-weight: 500–700
```

Body:

```text
font-weight: 400–450
```

Technical metadata may use:

```text
letter-spacing: 0.08em
```

Uppercase English labels can use increased tracking.

Avoid excessive uppercase text in paragraphs.

---

# 7. Layout System

## 7.1 Container

Desktop maximum width:

```text
1440px
```

Recommended horizontal padding:

```text
Desktop:
40–64px

Tablet:
32px

Mobile:
20px
```

---

## 7.2 Grid

Primary grid:

```text
12 columns
```

Mobile:

```text
4 columns
```

Tablet:

```text
8 columns
```

The grid should remain invisible by default.

It can occasionally become visible as a visual system element.

---

# 8. Spacing System

Use a consistent spacing scale.

Base unit:

```text
4px
```

Recommended values:

```text
4
8
12
16
24
32
48
64
80
96
128
160
192
```

Large sections should have generous vertical spacing.

---

# 9. Border Radius

The design should avoid excessive rounded-card UI.

Recommended:

```text
Small:
6px

Medium:
10px

Large:
16px
```

Large visual sections may use minimal rounding or no rounding.

---

# 10. Global Navigation

Navigation should be minimal and persistent.

Desktop:

```text
┌────────────────────────────────────────────────────────────┐

ESON                       WORK   LAB   WRITING   ABOUT
                                      中文 / EN

└────────────────────────────────────────────────────────────┘
```

---

## 10.1 Navigation Behavior

Initial state:

- transparent
- integrated with background

After scrolling:

- subtle backdrop
- slight blur
- border
- reduced height

Do not create a large opaque navbar.

---

## 10.2 Mobile Navigation

Mobile uses:

```text
ESON                           MENU
```

Menu opens as a full-screen or large overlay.

Navigation items:

```text
WORK
LAB
WRITING
ABOUT
EXPERIENCE
CONTACT

中文 / EN
```

---

# 11. Hero Design

Hero is the most important visual section.

## 11.1 Concept

Hero should feel like entering a digital environment.

Recommended structure:

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

---

## 11.2 Hero Background

Possible layers:

```text
Layer 1
Dark gradient

Layer 2
Large ambient light

Layer 3
Subtle grid

Layer 4
Noise / grain

Layer 5
Cursor interaction

Layer 6
Optional WebGL
```

Not every layer must be enabled simultaneously.

---

## 11.3 Cursor Interaction

Desktop:

- ambient glow follows cursor
- interactive elements respond subtly
- hover may change typography or border state

The cursor effect must never interfere with clicking.

---

## 11.4 Hero Animation

Recommended sequence:

```text
Page Load
 ↓
Ambient background appears
 ↓
SYSTEM ONLINE
 ↓
ESON
 ↓
SOFTWARE ENGINEER & BUILDER
 ↓
Description
 ↓
Status
 ↓
Scroll indicator
```

Animation should be fast enough to avoid blocking content.

---

# 12. Section Headers

Each major section should have a consistent visual identity.

Example:

```text
01 / WORK

SELECTED
WORK
```

or:

```text
01
SELECTED WORK
```

Metadata can use:

```text
01 / 05
```

This creates a subtle system/editorial feeling.

---

# 13. Intro Section

The Intro section should use large typography.

Example structure:

```text
I BUILD THINGS
THAT LIVE ON
THE WEB.
```

Secondary text:

```text
Software engineer focused on frontend engineering,
AI systems, digital products and experimentation.
```

---

# 14. Work Design

Work should not use a generic card grid as the primary layout.

Preferred layout:

```text
Work 01
──────────────────────────────

Large visual

Work Title
Category
Technology

→ VIEW WORK
```

Work should feel editorial.

---

## 14.1 Work Item Hover

Desktop hover may include:

- image scale
- subtle cursor interaction
- metadata reveal
- accent line
- title movement

Animation duration:

```text
250–600ms
```

---

# 15. Work Detail

Work detail pages should feel like case studies.

Structure:

```text
WORK

Title
Summary
Technology
Date

Hero Image

Overview

Problem

Approach

Architecture

Technology

Implementation

Results

Gallery

GitHub / Demo

Next Work
```

## 15.1 Cover 与 Gallery（Public 渲染规则，已实现）

本节记录**当前已实现**的封面与图库渲染规则（Phase 4-F.5.1 / 4-F.6.2）。

### Cover

```text
数据        只使用内容 API 返回的 cover.url（前端不拼接存储地址）
尺寸        使用 media 提供的 width / height（避免 CLS）
alt         media.alt → 内容标题 → 空字符串
加载失败    回退为品牌化 PlaceholderVisual（不显示破图、不塌陷）
加载策略    detail hero：eager + high priority；列表 / 卡片：lazy
语义        Cover 与 Gallery 是两种不同语义，Cover 独立展示
SEO         Cover 是唯一的 og:image 来源
```

### Gallery

```text
范围        Work ✅ / Lab ✅ / Writing ✖（不实现）
比例        使用图片固有比例（media.width / height），绝不裁切
禁止        object-cover、任何裁掉内容的 CSS、服务端裁剪
缺尺寸      使用稳定比例容器 + object-contain（不塌陷、不变形）
布局        desktop 2 列 / tablet 2 列 / mobile 1 列（沿用现有网格与 spacing token）
加载        lazy + async decoding；不使用 fetchpriority（不参与首屏 LCP）
失败处理    单张失败只影响该张，回退同一个 PlaceholderVisual
Caption     为空 / null 时不渲染任何 caption 节点，不自动生成
交互        静态展示：无 lightbox / zoom / fullscreen / 键盘图片导航 / 手势导航
动效        复用现有 v-reveal（逐项 delay），遵循 prefers-reduced-motion
结构化数据  不进入 JSON-LD
```

> 视觉语言保持现有 ESON dark 体系：只使用既有 background / border / radius / typography / spacing，不新增渐变、玻璃或阴影系统。
> 图片当前直接使用原始上传文件（无 srcset / 压缩 / CDN，属后续工作）。

---

# 16. Lab Design

Lab should visually differ slightly from Work.

Work:

> Structured / professional

Lab:

> Experimental / playful / technical

Possible presentation:

```text
LAB

EXPERIMENT 01
AI AGENT WORKFLOW

EXPERIMENT 02
GENERATIVE UI

EXPERIMENT 03
WEBGL SYSTEM

EXPERIMENT 04
AUTOMATION TOOL
```

---

## 16.1 Lab Interaction

Lab may support stronger interaction than Work.

Possible effects:

- live preview
- hover simulation
- animated diagrams
- cursor response
- interactive canvas
- small WebGL experiments

However, the page must remain usable without these effects.

---

# 17. Writing Design

Writing should use an editorial layout.

Avoid:

```text
[Card]
[Card]
[Card]
[Card]
```

as the only presentation.

Preferred:

```text
WRITING

01
WRITING TITLE
Category · Date
────────────────────────

02
WRITING TITLE
Category · Date
────────────────────────
```

---

## 17.1 Writing Detail Page

Writing detail layout:

```text
Category

Writing Title

Excerpt

Date · Reading Time

────────────────────────

Writing Content

────────────────────────

Related Writing
```

Content width should be constrained for readability.

Recommended:

```text
650–760px
```

---

# 18. Experience Design

Experience can use a timeline.

Example:

```text
2026
────────────────────────
Software / Product / AI

2024
────────────────────────
Frontend Engineering

2022
────────────────────────
...
```

Timeline should remain visually lightweight.

---

# 19. About Design

About should feel personal but still technical.

Possible sections:

```text
ABOUT

WHO I AM

WHAT I BUILD

HOW I THINK

TECHNOLOGY

CURRENT FOCUS
```

Avoid overly corporate presentation.

---

# 20. Contact Design

Contact should be a strong visual ending.

Example:

```text
LET'S BUILD
SOMETHING.

Have an idea,
a product or an interesting problem?

GET IN TOUCH →
```

Contact form can appear below or through an interaction.

---

# 21. Buttons

Primary button:

```text
→ VIEW PROJECT
```

Secondary:

```text
→ READ ARTICLE
```

Text links:

```text
EXPLORE →
```

Avoid large rounded CTA buttons everywhere.

---

# 22. Interaction States

All interactive components should define:

```text
Default
Hover
Focus
Active
Disabled
Loading
Error
```

---

# 23. Hover Rules

Hover should generally be subtle.

Examples:

```text
Image:
scale 1.02–1.05

Text:
small translate / opacity change

Border:
increase contrast

Accent:
subtle glow
```

Never use excessive bounce effects.

---

# 24. Page Transitions

Page transitions should be smooth but fast.

Recommended:

```text
Exit:
150–250ms

Enter:
250–500ms
```

Possible transition:

```text
fade
+
translate
+
clip reveal
```

Avoid long cinematic transitions that delay navigation.

---

# 25. Scroll Behavior

Smooth scrolling may be used.

However:

- native scrolling must remain functional
- keyboard scrolling must work
- reduced motion must be respected
- mobile performance must be tested

---

# 26. Motion System

Animation durations:

```text
Micro:
120–200ms

UI:
200–350ms

Content:
350–600ms

Large transition:
600–1000ms
```

Easing should generally be:

```text
ease-out
custom cubic-bezier
```

Avoid linear animation for normal UI interactions.

---

# 27. Reduced Motion

If:

```text
prefers-reduced-motion: reduce
```

then:

- disable parallax
- reduce large transforms
- disable unnecessary cursor effects
- simplify page transitions
- reduce animation duration

Content must remain fully accessible.

---

# 28. WebGL / Canvas Rules

WebGL is optional.

Use it only where it improves the experience.

Potential locations:

```text
Hero
Lab
Experimental sections
```

Do not use WebGL for:

- simple cards
- navigation
- normal buttons
- basic backgrounds

Fallback must always exist.

---

# 29. Image Direction

Images should feel:

- clean
- high quality
- editorial
- technical
- product-oriented

Avoid generic stock photography.

Work images should prioritize:

- UI screenshots
- architecture diagrams
- product images
- technical visuals
- prototypes
- real work artifacts

---

# 30. Cards

Cards should be used selectively.

Do not build the entire site out of cards.

Recommended card usage:

```text
Lab
Writing
Admin
Small content groups
```

Work should primarily use editorial layouts.

---

# 31. Glassmorphism

Glass effects can be used sparingly.

Recommended:

```text
backdrop-filter
+
low opacity surface
+
subtle border
```

Do not use glassmorphism for every component.

---

# 32. Glow

Glow should be ambient.

Good:

```text
large soft light
subtle accent glow
cursor light
```

Avoid:

```text
strong neon borders
glowing every button
glowing every text element
```

---

# 33. Grain / Noise

A very subtle grain texture may be used.

Purpose:

- reduce digital flatness
- add visual depth

Opacity must remain extremely low.

---

# 34. System Elements

Optional system-style elements:

```text
SYSTEM ONLINE
BUILDING
AVAILABLE
STATUS
01 / 05
SCROLL
LOCAL TIME
```

These should function as visual accents rather than fake technical information.

Never display misleading system states.

---

# 35. Footer

Footer should remain minimal.

Suggested:

```text
ESON

SOFTWARE ENGINEER & BUILDER

WORK
LAB
WRITING
ABOUT
CONTACT

GitHub
LinkedIn
Email

© ESON
```

Optional:

```text
SYSTEM ONLINE
```

---

# 36. Mobile Design

Mobile is not a scaled-down desktop.

Mobile should be intentionally designed.

Priority:

```text
Typography
Content hierarchy
Touch interaction
Performance
Navigation
```

---

## 36.1 Mobile Hero

Avoid overly large text that causes excessive vertical scrolling.

Recommended:

```text
ESON

SOFTWARE
ENGINEER
&
BUILDER
```

Then:

```text
Description
Status
Explore
```

---

## 36.2 Mobile Interaction

Hover-only functionality must never be required.

Every important interaction must work with touch.

---

# 37. Responsive Breakpoints

Recommended baseline:

```text
Mobile:
< 640px

Tablet:
640–1024px

Desktop:
1024–1440px

Large Desktop:
> 1440px
```

The exact implementation may use framework-standard breakpoints.

---

# 38. Accessibility

Required:

- semantic HTML
- keyboard navigation
- visible focus
- readable contrast
- alt text
- form labels
- accessible buttons
- accessible navigation
- reduced motion support

Do not rely only on color to communicate state.

---

# 39. Loading States

Every asynchronous content area must define:

```text
Loading
Success
Empty
Error
```

Example:

```text
WORK

Loading...

No work items available.

Unable to load work items.
Try again.
```

---

# 40. Empty States

Empty states should remain visually consistent with the brand.

Example:

```text
NO EXPERIMENTS YET.

The lab is currently being built.
```

Do not expose raw API/database errors.

---

# 41. Error States

User-facing error messages must be understandable.

Bad:

```text
500 INTERNAL SERVER ERROR
```

Preferred:

```text
Something went wrong.

Please try again.
```

Technical details may be logged separately.

---

# 42. Form Design

Contact forms should use:

```text
Name
Email
Subject
Message
Submit
```

Validation should happen:

```text
Client
+
Server
```

Errors should appear next to the relevant field.

---

# 43. Admin UI

Admin does not need the immersive visual style of the public website.

Admin priorities:

```text
Clarity
Speed
Consistency
Productivity
Accessibility
```

Admin can use:

```text
Dark neutral UI
+
simple surfaces
+
tables
+
forms
+
sidebar navigation
```

---

# 44. Admin Layout

Recommended:

```text
┌──────────────┬─────────────────────────────────┐
│              │                                 │
│ Dashboard    │                                 │
│ Work         │          CONTENT AREA           │
│ Lab          │                                 │
│ Writing      │                                 │
│ Experience  │                                 │
│ Categories   │                                 │
│ Tags         │                                 │
│ Media        │                                 │
│ Messages     │                                 │
│ Settings     │                                 │
│              │                                 │
└──────────────┴─────────────────────────────────┘
```

---

# 45. Design Tokens

Implementation should centralize design tokens.

Example categories:

```text
colors
typography
spacing
radius
shadows
motion
breakpoints
z-index
container
```

Do not hard-code repeated design values throughout components.

---

# 46. Component Design System

Core shared components should include:

```text
Button
Link
Icon
Badge
StatusIndicator
SectionHeader
Container
Image
WorkItem
WorkCard
LabItem
WritingItem
WritingMeta
Tag
Modal
Drawer
Input
Textarea
Select
FormField
LoadingState
EmptyState
ErrorState
Pagination
LanguageSwitcher
Navigation
Footer
```

Not every component must be created before it is needed.

Components should be extracted when reuse or consistency justifies it.

---

# 47. Component Architecture Rule

Prefer:

```text
Small reusable primitives
        ↓
Section components
        ↓
Page components
        ↓
Layouts
```

Avoid giant components such as:

```text
HomePage.vue
```

containing the entire website implementation.

---

# 48. Visual Hierarchy

Every page should establish:

```text
Level 1
Main title

Level 2
Section title

Level 3
Supporting content

Level 4
Metadata

Level 5
Decorative/system information
```

Decorative elements must never compete with primary content.

---

# 49. Internationalization UI

Language switch:

```text
中文 / EN
```

The active language should be visually clear but subtle.

Text expansion must be considered.

English and Chinese may have significantly different lengths.

Layouts must not depend on fixed text widths.

---

# 50. SEO Visual Requirements

SEO content should not conflict with the visual design.

Each content page should support:

```text
Title
Description
OG Image
Canonical URL
```

Writing pages should expose semantic structure.

---

# 51. Performance Rules

Visual effects must be progressively enhanced.

Priority:

```text
Content
 ↓
Layout
 ↓
Interaction
 ↓
Animation
 ↓
Advanced visual effects
```

If advanced effects reduce performance:

> Remove the effect before compromising usability.

---

# 52. Animation Performance

Prefer:

```text
transform
opacity
```

Avoid unnecessary animation of:

```text
width
height
top
left
box-shadow
large filter chains
```

Animations must be tested on:

- desktop
- mobile
- low-power devices

---

# 53. Design QA Checklist

Before a page is considered complete:

```text
[ ] Typography correct
[ ] Spacing consistent
[ ] Responsive
[ ] Mobile verified
[ ] Hover states
[ ] Focus states
[ ] Loading state
[ ] Empty state
[ ] Error state
[ ] Reduced motion
[ ] Images optimized
[ ] Accessibility checked
[ ] Performance checked
```

---

# 54. Visual Acceptance Criteria

The website should feel:

```text
Professional
        +
Technical
        +
Premium
        +
Interactive
        +
Personal
```

It should not feel:

```text
Generic Template
        or
Cyberpunk Demo
        or
Over-Animated Portfolio
```

---

# 55. Design Decision Summary

```text
Brand:
ESON

Style:
Dark / Technology / Immersive

Background:
Dark but not pure black

Accent:
Electric Blue / Blue-Violet

Typography:
Modern Sans

Layout:
Editorial + Grid

Navigation:
Minimal

Motion:
Subtle + purposeful

Hero:
Immersive

Work:
Case-study oriented

Lab:
Experimental

Writing:
Editorial

About:
Personal + technical

Admin:
Functional CMS

Language:
中文 / EN

Default:
中文

Responsive:
Mobile / Tablet / Desktop

Accessibility:
Required

Performance:
Required
```

---

# 56. Design Implementation Rule

The implementation team must treat this document as the visual source of truth.

If implementation conflicts with this document:

1. Preserve usability.
2. Preserve accessibility.
3. Preserve performance.
4. Preserve information hierarchy.
5. Then preserve visual effects.

Visual polish must never override engineering quality.

---

# 57. Next Phase

After this document is approved:

```text
DESIGN.md
      ↓
ARCHITECTURE.md
      ↓
DATABASE.md
      ↓
API.md
      ↓
Project Initialization
```

The next technical document should define:

- Frontend architecture
- Backend architecture
- Module boundaries
- Technology stack
- Data flow
- Authentication architecture
- API architecture
- Deployment architecture
- Development workflow
- Codex integration
