# Eson_web — v1.2.0 生产部署 Runbook

> 项目：Eson_web　品牌：ESON　正式域名：esonji.cn
> 生产目录：`/opt/eson-web`　生产环境文件：`/etc/eson-web/eson-web.production.env`
> 文档性质：**部署操作手册**。执行前请完整读完第 5、6 节（Migration 与回滚）。

---

## 1. Release 信息

| 项 | 值 |
|---|---|
| Version | **v1.2.0** |
| Release 标识 | 注解 tag `v1.2.0`（`git tag -a v1.2.0 -m "Eson_web v1.2.0 production launch"`） |
| Release commit | `git rev-parse v1.2.0^{commit}` ← 用命令解析，不在本文档写死 |
| 部署基线（当前线上） | `988f29e`（`docs: sync backup and recovery documentation`，v1.1.0 时代快照） |
| 文档版本 | 1.0 |
| 编写时间 | 2026-09-21（部署准备阶段） |

> **为什么 commit SHA 不硬编码在本文档里**：本文档本身属于 v1.2.0 的提交内容，
> 若把 commit SHA 写进文档，会形成「文档内容依赖 commit 结果、commit 又依赖文档内容」的自引用，
> 每次修改 SHA 都会产生新 commit。因此以 **tag 作为唯一发布标识**，SHA 在执行时解析。
> 生产上确认版本一律用 `git rev-parse v1.2.0^{commit}`，不要依赖人工抄写。

### 1.1 变更摘要（相对 `988f29e`）

**上线前 P0 修复**

1. Admin Messages：新增 `GET/PATCH /api/v1/admin/messages` 与完整后台收件箱
2. ICP Footer：新增 `NUXT_PUBLIC_ICP_BEIAN` → Footer 展示备案号并链接工信部
3. Contact 正式联系方式：`jikang0424@163.com`（Footer + `/contact`），不渲染 GitHub / LinkedIn
4. 去除开发阶段占位文案（`下一阶段` / `待配置` / `检查内容` / Experience 占位 / About Current focus）
5. `/robots.txt`（Nitro server route）
6. `/sitemap.xml`（Nitro server route，含真实已发布 slug）
7. `favicon.ico`（16/32/48 多尺寸，替换旧的 1×1 透明 GIF）
8. `apple-touch-icon.png`（180×180）
9. `site.webmanifest`
10. `og-image.png`（1200×630）+ 全站默认 `og:image`（详情页封面优先）

**生产加固**

11. `NUXT_PUBLIC_SITE_URL` 生产 fail-fast（非 https / localhost 时进程拒绝启动）
12. Docker 日志轮转 `json-file max-size=10m max-file=3`
13. 容器 `stop_grace_period`
14. CORS origin 规范化（trim / 去空项）＋ 生产禁止 `*`
15. 对应测试：Frontend 298 / Backend 276 全部通过

---

## 2. 部署前检查

| 项 | 值 | 检查命令 |
|---|---|---|
| 服务器 | `ubuntu@49.233.137.28`（密钥 `esonji.pem`，sudo 免密） | `ssh -i <key> ubuntu@49.233.137.28 'hostname; whoami'` |
| 生产目录 | `/opt/eson-web`（`root:root`，**不是 git 仓库**） | `ls -la /opt/eson-web` |
| 生产环境文件 | `/etc/eson-web/eson-web.production.env`（`root:root 0600`） | `sudo ls -l /etc/eson-web/` |
| 域名 | `esonji.cn`（A → `49.233.137.28`） | `curl -I https://esonji.cn/` |
| 容器 | caddy / frontend / backend / postgres | 见第 4 节 B 步 |
| 磁盘余量 | 部署前要求 ≥ 10 GB 可用 | `df -h /` |

### 2.1 关键前置事实（来自 2026-09-21 只读检查）

- `/opt/eson-web` **不是 git 仓库**（无 `.git`），是 root 拥有的文件快照 → 服务器上**不存在 `git pull` 这条路**，必须用第 4 节 A 步的文件同步方式。
- 只有 caddy 发布宿主端口（80/443）；backend / frontend / postgres / Caddy-admin(2019) 均不可从公网直达。
- 真实证书：Let's Encrypt `CN=esonji.cn`（**SAN 仅含 apex，不含 www**）。
- 已存在：`eson-backup.timer`（enabled / active），`/var/lib/eson-backup/LAST_SUCCESS`。
- **`www.esonji.cn` 目前 TLS 不匹配 → 属独立后续任务，本版本不处理**（见第 14 节）。

---

## 3. 生产环境变量

文件：`/etc/eson-web/eson-web.production.env`（`root:root 0600`，**绝不进 Git**）

### 3.1 必须在文件中存在

```bash
SITE_DOMAIN=esonji.cn
NUXT_PUBLIC_ICP_BEIAN=粤ICP备2026142725号-1
```

- `SITE_DOMAIN`：v1.2.0 起派生 `CORS_ORIGIN` / `NUXT_PUBLIC_SITE_URL` / `NUXT_PUBLIC_API_BASE` / `MEDIA_PUBLIC_BASE_URL`，**只需这一个域名变量**。
- `NUXT_PUBLIC_ICP_BEIAN`：**v1.2.0 新增**。只读检查确认当前线上文件里**不存在**该 key，必须在本版本部署前补上，否则 Footer 不显示备案号。

### 3.2 只需变量名（值保持现状；禁止在文档 / 聊天 / 工单中记录）

```text
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
JWT_SECRET
JWT_REFRESH_SECRET
CONTACT_IP_SALT
ADMIN_EMAIL
ADMIN_PASSWORD
ADMIN_NAME
```

### 3.3 不需要在文件中出现（由 compose 派生 / 内置）

```text
NUXT_PUBLIC_SITE_URL      ← 默认 https://${SITE_DOMAIN}
NUXT_PUBLIC_API_BASE      ← 默认 https://${SITE_DOMAIN}/api/v1
MEDIA_PUBLIC_BASE_URL     ← 默认 https://${SITE_DOMAIN}
NUXT_API_BASE_SERVER      ← compose 内置 http://backend:3001/api/v1
CADDY_TLS_DIRECTIVE       ← 生产必须留空（= automatic HTTPS）
```

> **`CADDY_TLS_DIRECTIVE` 必须留空**。设成 `tls internal` 会让生产使用 Caddy 内部 CA，浏览器直接不信任。

### 3.4 追加 ICP 变量的操作（人工执行，不要用脚本自动改）

```bash
# 只在需要时执行一次；先备份，再追加，最后只核对 key 名（不要 cat 全文）
sudo cp -a /etc/eson-web/eson-web.production.env \
           /etc/eson-web/eson-web.production.env.bak-$(date +%Y%m%d%H%M%S)
sudo sh -c 'printf "\nNUXT_PUBLIC_ICP_BEIAN=粤ICP备2026142725号-1\n" >> /etc/eson-web/eson-web.production.env'
sudo cut -d= -f1 /etc/eson-web/eson-web.production.env | sort
```

**失败即停止**：备份命令失败就不要继续追加。

---

## 4. 部署流程

> 约定：`KEY=E:\Secrets\esonji.pem`（本地）　`HOST=ubuntu@49.233.137.28`
> `ENVF=/etc/eson-web/eson-web.production.env`
> `COMPOSE="sudo docker compose --env-file $ENVF -f /opt/eson-web/docker-compose.prod.yml"`

### A. 代码同步（服务器不是 git 仓库 → 用 tag 导出 + 同步）

**A-0（本地）确认待发布内容就是 tag 内容**

```bash
cd E:/Projects/Eson_web
git status --short                      # 期望：空
git rev-parse v1.2.0^{commit}           # 记录这个 SHA
git archive --format=tar v1.2.0 -o v1.2.0.tar
```

**预期**：`git status` 为空；`v1.2.0.tar` 生成。
**失败即停止**：工作区不干净时不要继续（说明有未提交改动会被漏掉）。

**A-1（服务器）先给当前部署目录做快照（只打包，不删除任何东西）**

```bash
ssh -i $KEY $HOST 'sudo tar -czf /root/eson-web-pre-v1.2.0-$(date +%Y%m%d%H%M%S).tar.gz -C /opt eson-web; ls -lh /root/eson-web-pre-*.tar.gz | tail -3'
```

**预期**：`/root/` 下生成 `eson-web-pre-v1.2.0-*.tar.gz`。
**失败即停止**：没有可回滚的目录快照，不要进入 A-2。

**A-2（本地 → 服务器）上传并解包**

```bash
scp -i $KEY v1.2.0.tar $HOST:/tmp/v1.2.0.tar
ssh -i $KEY $HOST 'sudo tar -xf /tmp/v1.2.0.tar -C /opt/eson-web && rm -f /tmp/v1.2.0.tar'
```

**预期**：`/opt/eson-web` 内容被 v1.2.0 覆盖（`docs/DEPLOY_V1.2.0.md` 出现即代表新版本到位）。
**失败即停止**：不要用 `rm -rf /opt/eson-web` 重来，直接用 A-1 的快照恢复。

> `git archive` 不包含 `.git` / `.env` / `node_modules` / `dist` / `.output`，
> 也不包含本地 `data/`（已在 `.gitignore` 中根目录锚定忽略），因此不会把 secret 或本地素材带上服务器。

### B. 服务器确认目标版本

```bash
ssh -i $KEY $HOST '
  ls -l /opt/eson-web/docs/DEPLOY_V1.2.0.md
  ls -l /opt/eson-web/frontend/server/routes/robots.txt.ts /opt/eson-web/frontend/public/favicon.svg
  sudo cut -d= -f1 /etc/eson-web/eson-web.production.env | sort | grep -E "SITE_DOMAIN|NUXT_PUBLIC_ICP_BEIAN"
  sudo docker compose --env-file /etc/eson-web/eson-web.production.env -f /opt/eson-web/docker-compose.prod.yml ps
'
```

**预期**：新文件存在；`SITE_DOMAIN` 与 `NUXT_PUBLIC_ICP_BEIAN` 两个 key 都在；4 个容器 `Up ... (healthy)`、`restarts=0`。
**失败即停止**：缺 `NUXT_PUBLIC_ICP_BEIAN` 就先做第 3.4 节，再继续。

### C. `docker compose config` 校验

```bash
ssh -i $KEY $HOST 'sudo docker compose --env-file /etc/eson-web/eson-web.production.env -f /opt/eson-web/docker-compose.prod.yml config > /tmp/eson-config.yml; echo "config_exit=$?"; grep -E "NUXT_PUBLIC_SITE_URL|NUXT_PUBLIC_API_BASE|MEDIA_PUBLIC_BASE_URL|CORS_ORIGIN|NUXT_PUBLIC_ICP_BEIAN" /tmp/eson-config.yml; echo "max-size count: $(grep -c max-size /tmp/eson-config.yml)"; rm -f /tmp/eson-config.yml'
```

**预期**：`config_exit=0`；四个派生值均为 `https://esonji.cn...`；`max-size count: 4`。
**失败即停止**：`config` 非 0（缺必填变量 / YAML 语法错误）时绝对不要进入 D 步。

### D. 保留旧镜像 + 构建新镜像

> **关键**：compose 中的镜像名是 `eson-web-frontend:${IMAGE_TAG:-local}`。
> 构建会覆盖 `:local`，所以**必须先把当前运行的镜像另存为回滚 tag**，否则第 6 节回滚无镜像可用。

**D-1（服务器）保存当前镜像为回滚 tag**

```bash
ssh -i $KEY $HOST '
  sudo docker tag eson-web-frontend:local eson-web-frontend:v1.1.0-rollback
  sudo docker tag eson-web-backend:local  eson-web-backend:v1.1.0-rollback
  sudo docker images | grep -E "eson-web-(frontend|backend)"
'
```

**预期**：出现 `v1.1.0-rollback` 两个新 tag。
**失败即停止**：没有回滚镜像就不要继续构建。

**D-2（服务器）构建**

```bash
ssh -i $KEY $HOST 'cd /opt/eson-web && sudo docker compose --env-file /etc/eson-web/eson-web.production.env -f docker-compose.prod.yml build frontend backend'
```

**预期**：两个镜像构建成功，无 `ERROR`。本步**不重启任何容器**，旧版本继续对外服务。
**失败即停止**：镜像未更新时不要执行 F 步。

### E. `prisma migrate deploy`

见第 5 节。**必须**在 F 步之前独立完成并确认结果。

### F. 启动新版本

```bash
ssh -i $KEY $HOST 'cd /opt/eson-web && sudo docker compose --env-file /etc/eson-web/eson-web.production.env -f docker-compose.prod.yml up -d'
```

**预期**：frontend / backend 因镜像变化被重建；caddy / postgres 不变；全部 healthy。
**失败即停止**：立刻进入第 6 节回滚，不要反复执行 `up -d`。

> 本步是整份 Runbook 中**唯一**会替换线上应用容器的动作；执行前请确认 D-1 的回滚镜像已存在。

### G. Health check

```bash
ssh -i $KEY $HOST '
  sudo docker compose --env-file /etc/eson-web/eson-web.production.env -f /opt/eson-web/docker-compose.prod.yml ps
  curl -s -o /dev/null -w "frontend=%{http_code}\n" http://127.0.0.1:3000/
  curl -s https://esonji.cn/api/v1/health
'
```

**预期**：4 容器 healthy；`frontend=200`；health 返回 `"status":"ok"` 且 `"database":"up"`。
**失败即停止**：任一不满足 → 回滚（第 6 节）。

### H. Smoke test

执行第 7 节全部检查。**任何一项 FAIL 都视为部署失败**，按第 6 节回滚并保留现场日志。

**保留现场（只读，仅出问题时需要）**

```bash
ssh -i $KEY $HOST 'sudo docker compose --env-file /etc/eson-web/eson-web.production.env -f /opt/eson-web/docker-compose.prod.yml logs --tail=200 frontend backend'
```

---

## 5. Migration 安全策略

### 5.1 事实（v1.2.0 不新增 migration）

2026-09-21 只读检查确认生产库 `_prisma_migrations` 只有 **1 条**：`20260913000000_init`（2026-09-14 05:47:27 应用）。
v1.2.0 **没有新增任何 Prisma migration**（只改应用代码与配置），因此 `migrate deploy` 应当是 **no-op**。

### 5.2 执行前：先看状态（只读）

```bash
ssh -i $KEY $HOST 'sudo docker exec -i eson-web-prod-postgres-1 sh -c "psql -U \$POSTGRES_USER -d \$POSTGRES_DB -c \"select migration_name, to_char(finished_at, '"'"'YYYY-MM-DD HH24:MI:SS'"'"') as finished_at from _prisma_migrations order by finished_at;\""'
```

**预期**：恰好 1 行 `20260913000000_init`；无 failed / rolled_back 记录。
**失败即停止**：出现未完成或失败记录时**不要执行 migrate deploy**，先人工分析。

### 5.3 执行 `migrate deploy`

生产 **runtime 镜像不含 prisma CLI**（已在 `docker/backend.prod.Dockerfile` 中裁剪），
因此必须使用 **build 阶段镜像**执行：

```bash
ssh -i $KEY $HOST '
  cd /opt/eson-web &&
  sudo docker build --target build -f docker/backend.prod.Dockerfile -t eson-web-backend:build . &&
  sudo docker run --rm --network eson-web-prod_internal \
    -e DATABASE_URL="postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>?schema=public" \
    -w /app eson-web-backend:build pnpm --filter backend exec prisma migrate deploy
'
```

- 网络名以 `sudo docker network ls | grep eson-web` 的实际输出为准。
- `DATABASE_URL` 中的三段请用 `$ENVF` 中的真实值拼装，**不要粘贴到文档或聊天里**。

**预期**：输出 `No pending migrations to apply.`（v1.2.0 的正常结果）。
**失败即停止**：出现 `Error` / `P3009`（存在失败 migration）时**立即停止**，不要重试、不要手工改库。

### 5.4 硬性红线

```text
✅ 允许：prisma migrate deploy   （只应用已提交的 migration）
✅ 允许：prisma migrate status   （只读）
❌ 禁止：prisma db push          → 绕过 migration 历史，破坏可追溯性
❌ 禁止：prisma migrate dev      → 会生成 / 交互，生产绝对不用
❌ 禁止：prisma migrate reset    → 会清库
❌ 禁止：seed / INSERT / UPDATE / DELETE / ALTER
❌ 禁止：手工修改生产库结构（包括「临时加个字段救急」）
❌ 禁止：修改 _prisma_migrations 表
```

**migration 失败 = 停止部署**，不允许「先跳过、后面再补」。

### 5.5 后续版本新增 migration 时的要求

先在**隔离库**演练（`docs/RECOVERY.md` §7 的 `restore-db.sh` + 隔离 `TARGET_DB`），
确认可重复执行、耗时与锁行为，再进入生产。破坏性变更（DROP / 类型收窄 / NOT NULL 无默认值）
必须走「先加新列 → 双写 → 回填 → 切换 → 删旧列」的分阶段方案，并在部署窗口前完成容量评估。

---

## 6. Rollback

### 6.1 回滚目标与前提

| 项 | 值 |
|---|---|
| 回滚目标 | v1.1.0（线上基线 `988f29e`） |
| 回滚方式 | 切换镜像 tag + `up -d`（**不重新构建**） |
| 需要的镜像 | `eson-web-frontend:v1.1.0-rollback` / `eson-web-backend:v1.1.0-rollback`（D-1 已保存） |
| 需要的源码 | `/opt/eson-web` 部署前 tar 快照（A-1 已保存） |
| 数据库 | **无需回滚**（v1.2.0 无新增 migration） |

### 6.2 触发条件

任一条成立即回滚：容器非 healthy 且 5 分钟内未自愈；`/api/v1/health` 非 200 或 `database != up`；
HTTPS 首页非 200；Smoke test 出现 FAIL；出现不可接受的 5xx 错误率。

### 6.3 回滚步骤

**R-1 用旧镜像重建应用容器**

```bash
ssh -i $KEY $HOST '
  cd /opt/eson-web &&
  sudo IMAGE_TAG=v1.1.0-rollback \
    docker compose --env-file /etc/eson-web/eson-web.production.env \
    -f docker-compose.prod.yml up -d --no-build frontend backend
'
```

> 原理：compose 镜像名是 `eson-web-frontend:${IMAGE_TAG:-local}`；
> 用 `IMAGE_TAG=v1.1.0-rollback` 让容器指向旧镜像，**不需要改 compose 文件、不需要任何 git 操作**。
> 注意：之后每次 `up -d` 都必须带同一个 `IMAGE_TAG`，否则会跳回 `:local`。

**R-2 恢复源码目录（仅当需要与镜像一致时）**

```bash
ssh -i $KEY $HOST 'ls -t /root/eson-web-pre-v1.2.0-*.tar.gz | head -1'
# 确认快照文件名后：
ssh -i $KEY $HOST 'sudo tar -xzf /root/eson-web-pre-v1.2.0-<TIMESTAMP>.tar.gz -C /'
```

> A-1 是 `-C /opt` 打包的，因此解包到 `/` 会还原 `/opt/eson-web`。
> **不要**先 `rm -rf /opt/eson-web`；tar 直接覆盖即可。

**R-3 验证回滚**

```bash
ssh -i $KEY $HOST '
  sudo docker compose --env-file /etc/eson-web/eson-web.production.env -f /opt/eson-web/docker-compose.prod.yml ps
  curl -s https://esonji.cn/api/v1/health
  curl -s -o /dev/null -w "%{http_code}\n" https://esonji.cn/
'
```

**预期**：4 容器 healthy；health `database:up`；首页 200。
回滚后线上会退回「无 robots / 无 sitemap / favicon 为占位 / 无 ICP」的旧状态 —— 这是预期行为。

### 6.4 数据库已执行 migration 时怎么办（重要）

v1.2.0 不涉及，但后续版本必须遵守：

```text
1) prisma migrate deploy 没有自动 down。回滚代码 ≠ 回滚 schema。
2) 新版本已应用 migration 而应用需要回滚时：
   - 只回滚应用、保留 schema：仅当新 schema 对旧代码「向后兼容」（只加列 / 只加表 / 加索引）才安全。
   - 需要删除新列 / 新表：不得为回滚而手工 DROP；应前滚修复（forward fix）。
3) 判定顺序：先看 migration 是否向后兼容 → 再决定「回滚应用」还是「前滚修复」。
4) 任何情况下都不得手工编辑 _prisma_migrations。
5) 唯一允许的数据库「回退」是：在隔离库演练通过后，用备份恢复到隔离库验证，
   再按 docs/RECOVERY.md 的流程决定是否切换生产 —— 这属于灾难恢复，不属于常规回滚。
```

### 6.5 数据侧注意事项

- 回滚**不会**丢失 v1.2.0 期间新增的数据（内容与联系消息都在 PostgreSQL，与应用镜像无关）。
- 但旧版 frontend **没有** `/admin/messages` 页面 → 回滚窗口内后台看不到联系消息；
  消息仍会安全写入 `contact_messages`，恢复新版本后即可看到。回滚期间请关注 `contact_messages` 计数（第 11 节）。

---

## 7. 线上 Smoke Test

全部使用 `curl`，只读，无需登录。请保留原始输出作为验收证据。

### 7.1 页面（期望全部 200）

```bash
for p in / /about /work /lab /writing /experience /contact; do
  printf "%-14s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://esonji.cn$p)"
done
printf "%-14s %s\n" "/admin" "$(curl -s -o /dev/null -w '%{http_code}' https://esonji.cn/admin)"
printf "%-14s %s\n" "/missing" "$(curl -s -o /dev/null -w '%{http_code}' https://esonji.cn/this-page-does-not-exist)"
```

**预期**：7 个公开页面 200；`/admin` 200（CSR shell）；不存在的路径 **404**（不得为 500）。

### 7.2 SEO / 静态资源（期望全部 200）

```bash
for p in /robots.txt /sitemap.xml /favicon.ico /favicon.svg \
         /apple-touch-icon.png /site.webmanifest /og-image.png; do
  printf "%-24s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://esonji.cn$p)"
done
```

**内容断言**

```bash
curl -s https://esonji.cn/robots.txt
# 期望包含：User-agent: * / Allow: / / Disallow: /admin/ / Disallow: /design-system
#            以及 Sitemap: https://esonji.cn/sitemap.xml

curl -s https://esonji.cn/sitemap.xml | head -30
# 期望：application/xml；loc 全部为 https://esonji.cn/...
#       不含 localhost；不含 /admin；不含 design-system

curl -s https://esonji.cn/favicon.ico -o /tmp/f.ico && head -c 8 /tmp/f.ico | xxd
# 期望：00 00 01 00 03 00（ICO magic + 3 个尺寸）
#       —— 线上旧版本是 78 字节的 1×1 透明 GIF，修复后必须不再是它
```

### 7.3 首页 head（不得出现 localhost）

```bash
curl -s https://esonji.cn/ | grep -oE 'rel="canonical"|property="og:(url|image)"|name="twitter:image"' | sort -u
curl -s https://esonji.cn/ | grep -oE '<link[^>]*(icon|manifest|apple-touch)[^>]*>'
curl -s https://esonji.cn/ | grep -c localhost        # 期望 0
```

**预期**：canonical / og:url = `https://esonji.cn/`；og:image = `https://esonji.cn/og-image.png`；
存在 icon / apple-touch / manifest 三类 link；**localhost 出现 0 次**。

### 7.4 API

```bash
curl -s https://esonji.cn/api/v1/health
# 期望：{"success":true,"data":{"status":"ok","process":"up","database":"up",...},"meta":null}

curl -s -o /dev/null -w "%{http_code}\n" https://esonji.cn/api/docs
# 期望：404（生产已关闭 Swagger）
```

### 7.5 HTTPS / Caddy 安全头

```bash
curl -sI https://esonji.cn/ | grep -Ei 'HTTP/|strict-transport-security|x-content-type-options|referrer-policy|permissions-policy|x-frame-options'
curl -sI http://esonji.cn/ | grep -Ei 'HTTP/|location'
```

**预期**：HTTPS 200 且 5 个安全头齐全；HTTP 308 → `https://esonji.cn/`。

### 7.6 失败处理

任一断言不满足 → **视为部署失败**，执行第 6 节回滚，并保留 `curl` 原始输出与容器日志。
不要「先上线再修」。

---

## 8. ICP 验证

```bash
curl -s https://esonji.cn/ | grep -o '粤ICP备[0-9号-]*'
# 期望输出：粤ICP备2026142725号-1

curl -s https://esonji.cn/ | grep -o 'https://beian.miit.gov.cn/'
# 期望输出：https://beian.miit.gov.cn/

curl -s https://esonji.cn/ | grep -o 'rel="noopener noreferrer"'
# 期望：外链带 target="_blank" + rel="noopener noreferrer"
```

三条全部命中才算 PASS。

**若未显示，按顺序排查（全部只读，不要改配置）**

```bash
# ① 环境变量 key 是否存在
ssh -i $KEY $HOST 'sudo cut -d= -f1 /etc/eson-web/eson-web.production.env | sort | grep NUXT_PUBLIC_ICP_BEIAN'
#   不存在 → 按第 3.4 节补上（属新的变更，需另行授权），再重建 frontend 容器

# ② 容器 env 是否已带该变量
ssh -i $KEY $HOST 'sudo docker inspect --format "{{.Config.Env}}" eson-web-prod-frontend-1 | tr " " "\n" | grep -c NUXT_PUBLIC_ICP_BEIAN'

# ③ 运行的镜像是否是本次构建的
ssh -i $KEY $HOST 'sudo docker inspect --format "{{.Config.Image}}" eson-web-prod-frontend-1'
#   仍是 :local 且未重建 → 回到 F 步重新 up -d
```

---

## 9. Contact 验证

```bash
C=$(curl -s https://esonji.cn/contact)
echo "$C" | grep -c 'jikang0424@163.com'            # 期望 >=1（可见文本）
echo "$C" | grep -c 'mailto:jikang0424@163.com'     # 期望 >=1（可点击）
echo "$C" | grep -c '>发送<'                        # 期望 1（按钮文案）
echo "$C" | grep -c '下一阶段'                       # 期望 0
echo "$C" | grep -c '待配置'                         # 期望 0
echo "$C" | grep -c '检查内容'                       # 期望 0
echo "$C" | grep -ciE 'github|linkedin'             # 期望 0（未提供，不渲染空链接）
```

页脚同样检查邮箱：

```bash
curl -s https://esonji.cn/ | grep -c 'mailto:jikang0424@163.com'   # 期望 >=1
```

**表单链路验证（人工，仅 1 次）**

1. 访问 `https://esonji.cn/contact`，提交 **1 条**真实测试消息
2. 到 `/admin/messages` 确认能收到
3. 在后台标记已读 → 再归档，确认状态流转正常

> **不要用脚本批量提交**（后端限流 5 次 / 小时 / IP，且会在生产留下垃圾数据）。

---

## 10. Admin Messages 验证

访问 `https://esonji.cn/admin` 登录后进入 `/admin/messages`（该页为 CSR，需浏览器手动验证）。

| 检查 | 期望 |
|---|---|
| 未登录保护 | 未登录访问 `/admin/messages` 被重定向到 `/admin/login`（`admin-auth` middleware） |
| 接口鉴权 | 无 token 请求 `/api/v1/admin/messages` → 401；非 ADMIN 角色 → 403 |
| 列表 | 显示 name / subject / 日期 / 状态徽标；未读项带圆点标记 |
| 筛选 | 全部 / 未读 / 已读 / 已归档 四个按钮；切换筛选后 `page` 回到 1 |
| 详情 | 选中后显示 发件人、邮箱、接收时间、正文（保留换行，按纯文本渲染，不解析 HTML） |
| 未读 → 已读 | 点「标记已读」后徽标立即变为「已读」，刷新页面后仍为已读 |
| 已读 → 未读 | 点「标记未读」可回到未读状态 |
| 归档 | 点「归档」后状态为「已归档」；在「已归档」筛选下可见 |
| 取消归档 | 已归档项显示「取消归档」，点击后回到已读 |
| 分页 | 消息超过 20 条时显示上一页 / 下一页与「第 x / y 页 · 共 n 条」 |
| 排序 | 默认 UNREAD 优先 + 最新在前（由后端默认值决定，前端不传 sort） |
| 隐私 | 响应中**不含** `ipHash` / `userAgent`（可在浏览器 Network 面板确认） |

命令行辅助（只读；没有 token 就跳过，**不要把 token 粘贴到聊天或工单里**）：

```bash
# curl -s -H "Authorization: Bearer <TOKEN>" 'https://esonji.cn/api/v1/admin/messages?page=1&pageSize=20'
```

---

## 11. 数据库验证

**只读 SELECT；禁止任何写入；禁止在 smoke test 中 seed demo 数据。**

```bash
cat > /tmp/eson-verify.sql <<'SQL'
\pset pager off
select 'users' as item, count(*)::text as value from users
union all select 'contact_messages', count(*)::text from contact_messages
union all select 'works', count(*)::text from works
union all select 'labs', count(*)::text from labs
union all select 'writings', count(*)::text from writings
union all select 'experiences', count(*)::text from experiences
order by item;

select 'works' as entity, status::text, count(*) from works group by status
union all select 'labs', status::text, count(*) from labs group by status
union all select 'writings', status::text, count(*) from writings group by status
order by entity, status;

select migration_name, to_char(finished_at, 'YYYY-MM-DD HH24:MI:SS') as finished_at
from _prisma_migrations order by finished_at;
SQL
ssh -i $KEY $HOST "sudo docker exec -i eson-web-prod-postgres-1 sh -c 'psql -U \$POSTGRES_USER -d \$POSTGRES_DB -v ON_ERROR_STOP=1'" < /tmp/eson-verify.sql
rm -f /tmp/eson-verify.sql
```

**基线（2026-09-21 只读检查实测）**

```text
users = 1        contact_messages = 0
works = 0        labs = 0        writings = 0        experiences = 0
_prisma_migrations: 20260913000000_init | 2026-09-14 05:47:27   （1 行）
```

**判定**

| 情况 | 结论 |
|---|---|
| `users = 1`、migration 仍为 1 行、业务表计数与部署前一致 | PASS（v1.2.0 不改 schema） |
| `users = 1` 但业务表出现非预期数据 | WARN —— 说明有非预期写入，需查来源 |
| migration 行数 > 1 | STOP —— v1.2.0 不应新增 migration，说明执行了意外操作 |
| `users = 0` 或 `users > 1` | STOP —— 管理员账号被改动 |

> 内容计数为 0 属**正常**（内容尚未录入），不是部署故障。内容录入是独立于本 Runbook 的任务。

---

## 12. Backup

```bash
ssh -i $KEY $HOST 'systemctl status eson-backup.timer --no-pager | head -8'
ssh -i $KEY $HOST 'sudo cat /var/lib/eson-backup/LAST_SUCCESS'
ssh -i $KEY $HOST 'sudo cat /var/lib/eson-backup/LAST_FAILURE 2>/dev/null || echo "no failure marker"'
```

**预期**

| 项 | 期望 |
|---|---|
| timer | `enabled` + `active (waiting)`；Trigger 为次日 03:30 CST 左右 |
| `LAST_SUCCESS` | 存在，且时间为**最近 24 小时内**的 UTC 时间戳；`durationSeconds` 个位数 |
| `LAST_FAILURE` | 不存在（存在即 WARN，需查看 `/var/log/eson-backup-failures.log`） |

**部署当天要求**：部署完成后**不要手动触发备份**；等下一次 timer 自动执行后再用上面的命令确认 `LAST_SUCCESS` 时间已刷新。

**仍然存在的缺口（本次不处理）**：offsite 备份与外部告警渠道仍未实施 ——
见 `docs/RECOVERY.md` §21.8（G2 / G5 / G6，以及 EXTERNAL ALERT CHANNEL = NOT CONFIGURED）。

---

## 13. 部署完成标准

以下 **11 项全部 PASS** 才可标记 `RELEASED`；任一项 FAIL → 执行第 6 节回滚。

| # | 判据 | 验证方式 |
|---|---|---|
| 1 | Docker healthy | 4 容器 `Up (healthy)`、`restarts=0` |
| 2 | API healthy | `/api/v1/health` → 200 且 `database:up` |
| 3 | DB healthy | 第 11 节查询成功；`users=1`；migration 仍为 1 行 |
| 4 | HTTPS healthy | `https://esonji.cn/` 200；HTTP 308；5 个安全头齐全 |
| 5 | ICP visible | 第 8 节三条 grep 全部命中 |
| 6 | Contact healthy | 第 9 节断言全部通过；真实测试消息可在后台读到 |
| 7 | Admin messages healthy | 第 10 节表格全部通过 |
| 8 | SEO endpoints healthy | `/robots.txt`、`/sitemap.xml` 均 200 且内容断言通过 |
| 9 | favicon / OG healthy | `/favicon.ico` 为 ICO(3 尺寸)；`/og-image.png` 200；首页 og:image = `https://esonji.cn/og-image.png` |
| 10 | no localhost | 首页 HTML 中 `localhost` 出现 0 次（canonical / og:url / og:image / JSON-LD） |
| 11 | backup healthy | timer active/enabled；`LAST_SUCCESS` 在 24 小时内；无 `LAST_FAILURE` |

**标记方式（11 项全部 PASS 后由人工执行）**

```bash
ssh -i $KEY $HOST 'echo "released v1.2.0 $(date -u +%Y-%m-%dT%H:%M:%SZ) by <operator>" | sudo tee /opt/eson-web/.released'
```

> 该文件仅作发布标记，不参与构建，也不被应用读取。

**部署后 24 小时内持续观察**

- `sudo docker compose ... logs --tail=200 frontend backend`（确认无 5xx 堆积）
- 定时抽查 `/api/v1/health`
- `contact_messages` 计数是否随真实提交增长（验证联系表单全链路）
- 下一次 03:30 自动备份后确认 `LAST_SUCCESS` 已刷新

---

## 14. 本次不处理（明确排除）

| 项 | 状态 | 说明 |
|---|---|---|
| `www.esonji.cn` | **后续独立任务** | 证书 SAN 仅含 apex，`https://www.esonji.cn` TLS 校验失败。后续单独任务：申请含 www 的证书，或把 www **301** 到 `https://esonji.cn`。**本版本禁止修改 Caddy / DNS** |
| CSP | 未启用（deferred） | 需要 nonce / hash 方案与全站回归 |
| HSTS `includeSubDomains` / `preload` | 未启用 | 待确认所有子域均覆盖 HTTPS 后再评估 |
| `X-Powered-By: Nuxt` | 保留 | 仅暴露技术栈名，无版本号 |
| HTTP 308 响应上的 `Server: Caddy` | 保留 | 重定向路径未去掉该头，无版本号；低风险 |
| `eson_locale` Cookie 无 `Secure` | 保留 | 仅语言偏好，非敏感数据 |
| 图片优化管线（srcset / 压缩 / CDN） | 未实施 | 当前直接使用原始上传文件 |
| offsite 备份 / 外部告警 | NOT IMPLEMENTED | 见 `docs/RECOVERY.md` §21.8 |
| 内容录入 | 待办 | 生产业务表计数为 0，需通过 `/admin` 录入真实内容 |

---

## 15. 执行记录（部署时填写）

| 项 | 值 |
|---|---|
| 执行人 | |
| 执行时间（CST） | |
| Release commit（`git rev-parse v1.2.0^{commit}`） | |
| 部署前目录快照文件名（A-1） | |
| 回滚镜像 tag 是否已保存（D-1） | ☐ 是 |
| `migrate deploy` 输出 | |
| Smoke test 结果（逐项 PASS / FAIL） | |
| ICP 验证结果 | |
| 最终结论 | ☐ RELEASED　☐ ROLLED BACK |
