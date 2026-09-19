# Eson_web — Backup / Recovery Runbook

Version: 1.0（Phase 5-G）
Audience: 运维 / 未来的自己
Goal: **只看本文件就能完成一次完整的备份与灾难恢复。**

> 状态声明（Phase 5-G 结束时的真实状态）：
>
> - `isolated production-like recovery drill: VERIFIED`（隔离恢复库 + 临时媒体目录，真实执行）
> - `real production backup: NOT YET VERIFIED`（当前没有正式 VPS / 域名 / 定时任务）
> - 定时调度（cron / systemd timer）与 offsite 落地属 **Phase 5-H+**

---

## 1. Recovery Objectives

| 目标 | 值 | 说明 |
|---|---|---|
| RPO | ≤ 24 小时 | 依赖「每日备份」节奏；调度器尚未部署（见 §16/§18） |
| RTO | ≤ 1 小时 | 恢复流程本身只需数分钟（实测见 §19） |

恢复优先级：

```text
1. PostgreSQL（内容 / 用户 / 媒体元数据）
2. Media 文件（object key 必须与数据库 storage_key 对应）
3. 应用容器（backend / frontend / caddy）
```

---

## 2. Backup Architecture

```text
postgres-data volume ──(pg_dump -Fc)──┐
                                      ├──► backup-data volume（独立卷 /backups）
media-data volume ────(tar.gz + manifest)──┘

backup-data 与 postgres-data / media-data 完全分离；
备份容器只把 media-data 以 **只读** 方式挂载。
```

备份内容：

| 类型 | 命令 | 产物 |
|---|---|---|
| 数据库 | `docker compose -f docker-compose.prod.yml run --rm backup /scripts/backup-db.sh` | `db/eson_web_db_<UTC>.dump` + `.sha256` + `.meta.json` |
| 媒体 | `docker compose -f docker-compose.prod.yml run --rm backup /scripts/backup-media.sh` | `media/eson_web_media_<UTC>.tar.gz` + `.sha256` + `.manifest.sha256` + `.meta.json` |

**调用方式（Phase 5-H.2-J 明确）**：`docker/backup/*.sh` 在 Git 中记录为 **100644（无可执行位）**，
而 compose 的 `backup` 服务 entrypoint 是 `/bin/sh` —— 因此上面两条命令实际等价于
`sh /scripts/backup-db.sh`。**统一采用这一种方式**（不要依赖可执行位，也不要混用两种调用方式）：

- 通过 compose：`docker compose … run --rm backup /scripts/<script>.sh [args]`
- 直接在容器内：`sh /scripts/<script>.sh [args]`
- 例外：`cleanup-backups.sh` 需要 `node`，只能通过 `backup-retention` 服务执行（见 §16）

---

## 3. Backup Locations

| 位置 | 说明 |
|---|---|
| Docker volume `backup-data` | 默认（`BACKUP_DIR=/backups`），与数据库/媒体卷分离 |
| 宿主目录 | 可把 `backup-data` 改为 host mount（例如 `/var/backups/eson-web`），要求 0700 权限 |
| Offsite | 见 §17（当前仅策略定义，未接入账号） |

**绝不允许**：备份写入 `media-data`、`postgres-data`、仓库目录或 Docker 镜像。

---

## 4. Database Backup

```bash
# 生产（仓库根目录执行）
docker compose -f docker-compose.prod.yml run --rm backup /scripts/backup-db.sh
```

要求与行为：

- 只使用 `pg_dump --format=custom`（`-Fc`），文本 SQL dump 不作为生产备份
- 生成后立即用 `pg_restore --list` 自检（不可恢复立刻失败）
- 产物权限 0600、目录 0700（脚本内 `umask 077`）
- `.meta.json` 记录：host / port / db / 时间 / 格式 / 大小 / sha256 / pg_dump 版本 / Prisma migration 名
- 日志**不输出** `DATABASE_URL` 或任何密码

---

## 5. Media Backup

```bash
docker compose -f docker-compose.prod.yml run --rm backup /scripts/backup-media.sh
```

- 保留完整目录结构（object key `media/<yyyy>/<mm>/<uuid>.<ext>`）
- 生成 `manifest.sha256`：每个文件的相对路径 + sha256（恢复后逐文件比对）
- 归档条目数与清单文件数不一致 → 直接失败
- 备份目录位于媒体目录内 → 直接失败（避免备份自己）

---

## 6. Checksum Verification

```bash
docker compose -f docker-compose.prod.yml run --rm backup \
  /scripts/verify-backup.sh /backups/db/<file>.dump
docker compose -f docker-compose.prod.yml run --rm backup \
  /scripts/verify-backup.sh /backups/media/<file>.tar.gz
```

- 校验和文件缺失或不匹配 → **FAIL，禁止继续恢复**
- 数据库备份额外验证 `pg_restore --list`；媒体备份额外验证 `tar -tzf` 与 manifest 存在
- 恢复流程内部也会自动再次校验 checksum（`restore-db.sh` / `restore-media.sh` 开头）

---

## 7. Database Restore

### 7.1 演练（隔离恢复库，推荐先做）

```bash
# 1) 起一个隔离的恢复用 PostgreSQL（不得指向生产/开发库）
docker run -d --name eson-recovery-db --network <prod-network> \
  -e POSTGRES_USER=eson -e POSTGRES_PASSWORD=<temporary-password> postgres:17-alpine

# 2) 恢复到隔离目标库（脚本会拒绝 eson_web / postgres / 与源库同名 / 已存在的库）
docker compose -f docker-compose.prod.yml run --rm backup \
  -e PGHOST=eson-recovery-db -e TARGET_DB=eson_web_recovery \
  /scripts/restore-db.sh /backups/db/<file>.dump
```

### 7.2 真实灾难恢复（覆盖生产库）

```bash
# 1) 停止应用写入（避免恢复过程中产生新数据）
docker compose -f docker-compose.prod.yml stop backend frontend caddy

# 2) 备份当前（可能已损坏的）库，以便回滚
docker compose -f docker-compose.prod.yml run --rm backup /scripts/backup-db.sh

# 3) 覆盖恢复：允许删除并重建目标库
docker compose -f docker-compose.prod.yml run --rm backup \
  -e PGHOST=postgres -e TARGET_DB=eson_web -e ALLOW_RESTORE_INTO_EXISTING=1 \
  /scripts/restore-db.sh /backups/db/<file>.dump

# 4) 重新启动应用
docker compose -f docker-compose.prod.yml up -d
```

恢复脚本使用 `pg_restore --exit-on-error`：任何一条语句失败都会终止并返回非零退出码。

---

## 8. Media Restore

```bash
# 演练：恢复到独立目录/卷
docker compose -f docker-compose.prod.yml run --rm backup \
  -v eson-recovery-media:/recovery-media \
  /scripts/restore-media.sh /backups/media/<file>.tar.gz /recovery-media

# 真实灾难恢复：显式允许覆盖线上媒体目录
docker compose -f docker-compose.prod.yml run --rm backup \
  -e ALLOW_RESTORE_OVER_LIVE_MEDIA=1 \
  /scripts/restore-media.sh /backups/media/<file>.tar.gz /srv/eson-media
```

恢复后脚本立即用 manifest 逐文件校验 sha256；任何不一致 → FAIL。

---

## 9. DB / Media Consistency Check

```bash
docker compose -f docker-compose.prod.yml run --rm backup \
  -e PGHOST=eson-recovery-db -e DB=eson_web_recovery -e MEDIA_ROOT=/recovery-media \
  -v eson-recovery-media:/recovery-media \
  /scripts/verify-recovery.sh
```

验证内容（42 项，任一失败 exit 1）：

```text
schema          业务表数量 25、Prisma migration 元数据、无未完成 migration
row counts      25 张表逐表行数
relations       translation / join / cover 孤儿检测 + 内容状态约束
admin          ADMIN 用户存在且 active
db -> file     每个 media.storage_key 文件存在、大小与 DB 一致、magic bytes 与 mime 一致
file -> db     孤儿文件检测（文件系统存在但 DB 无记录）
```

---

## 10. Application Restart

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

顺序（compose 已内置）：postgres healthy → backend healthy → frontend healthy → caddy。

---

## 11. Health Check

```bash
curl -fsS https://<SITE_DOMAIN>/api/v1/health
docker compose -f docker-compose.prod.yml ps    # 所有服务 healthy
```

---

## 12. Login Verification

```bash
curl -sS -X POST https://<SITE_DOMAIN>/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}'
```

期望：`200` + `data.accessToken`，`Set-Cookie` 带 `HttpOnly; Secure; SameSite=Lax`。

> 登录接口限流 5 次 / 15 分钟 / IP（docs/API.md）；恢复演练时注意不要把自己限流掉。

---

## 13. Public Content Verification

```bash
curl -fsS https://<SITE_DOMAIN>/api/v1/work
curl -fsS https://<SITE_DOMAIN>/api/v1/lab
curl -fsS https://<SITE_DOMAIN>/api/v1/writing
curl -fsS https://<SITE_DOMAIN>/api/v1/experience
curl -fsS -o /dev/null -w '%{http_code}\n' https://<SITE_DOMAIN>/
```

期望：已发布内容可见，`DRAFT` / `ARCHIVED` 不可见，`/work/<slug>`、`/lab/<slug>`、`/writing/<slug>` 正常 200，无效 slug 返回 404。

---

## 14. Media URL Verification

```bash
curl -fsS -o /dev/null -w '%{http_code} %{content_type}\n' https://<SITE_DOMAIN>/media/<yyyy>/<mm>/<uuid>.<ext>
```

期望：`200 image/*`，字节与备份一致；`/media/*` 不得出现目录列表或路径泄露。

> **重要（换域名场景）**：`media.url` 是上传时写入数据库的绝对 URL。
> 如果恢复后对外域名改变（例如灾难恢复临时换域），必须同步更新：
>
> ```sql
> UPDATE media
> SET url = regexp_replace(url, '^https?://[^/]+', 'https://<new-domain>')
> WHERE url LIKE 'http%';
> ```
>
> 同域恢复（正常 DR 场景）无需任何更新。

---

## 15. Rollback / Failure Handling

| 失败点 | 处理 |
|---|---|
| checksum 不匹配 | **停止**，改用上一份备份（`verify-backup.sh` 逐份验证） |
| `pg_restore` 中途失败 | 目标库已被部分写入：删除目标库后重试（`ALLOW_RESTORE_INTO_EXISTING=1`） |
| 媒体 manifest 校验失败 | 删除目标目录后重新恢复；不要手工改文件名 / object key |
| 恢复后应用起不来 | 先看 backend 日志（`docker compose logs backend`）；确认 `DATABASE_URL` 指向恢复库、迁移完整（§9） |
| DB 恢复成功但媒体缺失 | 先恢复媒体再对外提供服务；`verify-recovery.sh` 会报出缺失文件 |
| 恢复后发现数据不对 | 用 §7.2 第 2 步留存的「恢复前备份」回滚 |

任何情况下都不要手工执行 `DROP` / `TRUNCATE` 生产表。

---

## 16. Retention

策略（V1，按前缀分别计算）：

```text
Daily    最近 7 个 UTC 日期各自最新
Weekly   最近 4 个 ISO 周各自最新
Monthly  最近 3 个 UTC 月各自最新
兜底     每前缀最新一份始终保留；未来时间戳保留；无法识别的文件名永不删除
```

```bash
# 默认 dry-run（只打印计划，不删除）
docker compose -f docker-compose.prod.yml run --rm backup-retention

# 显式执行删除（可用 --max-delete N 做安全阀）
docker compose -f docker-compose.prod.yml run --rm backup-retention \
  --dir /backups --apply --max-delete 50
```

策略实现：`docker/backup/retention.mjs`；单测：`node --test docker/backup/retention.spec.mjs`（无新增依赖）。

**自动化（Phase 5-H.2-J）**：retention 已纳入每日自动任务，且**只在 DB 备份 + media 备份 + 校验全部成功后**执行；
任一步失败则跳过 retention（不会出现「备份失败却删除旧备份」）。自动任务使用
`--max-delete 20` 作为误删安全阀。见 §21。

---

## 17. Offsite Copy

> **当前状态（Phase 5-H.2-K 预检后）**：`OFFSITE BACKUP = BLOCKED / NOT IMPLEMENTED`。
> 服务器上不存在任何已批准的 provider / endpoint / bucket / 凭据（无 offsite 环境变量、无 rclone/aws/s3cmd/mc/coscmd/ossutil、
> 无凭据文件、无 offsite systemd/cron 任务）。本地自动化备份已上线（§21），但**本地备份不等于 offsite 备份** ——
> 当前备份与生产数据位于同一台 VPS、同一个 Docker 数据根目录。
>
> 实施所需的**人工输入清单**与 **provider-neutral 设计**见 §22；在人工提供 provider 之前，本项保持 BLOCKED。

策略（**当前仅定义，未接入任何账号/凭据**）：

```text
VPS local backup（backup-data 卷）
        ↓ 每日一次（Phase 5-H+ 定时任务）
offsite copy（对象存储 / 远程主机）
```

候选（择一即可，V1 未绑定）：

- S3-compatible object storage
- Backblaze B2
- Cloudflare R2
- AWS S3

要求：

- 凭据只存在于 VPS 环境文件 / secret manager，**绝不进入仓库**
- 上传前验证 `.sha256`；上传后再校验一次远端 checksum
- offsite 保留策略与本地一致（§16）
- 至少每季度做一次「从 offsite 恢复」演练

---

## 18. RPO

| 项 | 值 |
|---|---|
| 目标 | ≤ 24 小时 |
| 达成方式 | 每日一次数据库 + 媒体备份（Phase 5-H+ 用 cron / systemd timer 落地） |
| 当前状态（Phase 5-H.2-J） | **已生效**：systemd timer 每日 03:30 自动执行 DB + media 备份与校验（见 §21）。RPO ≤ 24h 在调度器正常运行时成立；**若 timer 被停用或备份持续失败，RPO 不再受保障**（当前无外部告警通道，需人工查 `eson-backup-status.sh` 或 journal） |

---

## 19. RTO（本次隔离演练实测）

| 步骤 | 实测 | 说明 |
|---|---|---|
| DB backup | 0.88 s | 56,733 B dump（24 表业务数据 + 1 migration） |
| Media backup | 0.78 s | 4 文件 / 418 B → 555 B 归档 |
| DB restore（隔离库） | 1.09 s | 26 张表（25 业务 + `_prisma_migrations`） |
| Media restore | 0.80 s | 4 文件，manifest 逐文件校验通过 |
| 恢复完整性验证 | 1.57 s | 42 项检查全部 PASS |
| 恢复后应用验证 | < 5 s | 13 项检查全部 PASS（health / login / 公开内容 / 媒体可读 / draft 不可见） |
| **合计（不含人工判断）** | **约 10 秒** | 远低于 RTO 1 小时 |

> 该数据集远小于真实生产规模：**上线后必须在真实数据量下重新测量**（Phase 5-H+）。
> 时间主要由数据量与磁盘吞吐决定，脚本本身没有固定的长耗时步骤。

---

## 20. Disaster Recovery Checklist

```text
[ ] 1. 确认故障范围：DB？媒体？主机？仅应用？
[ ] 2. 停止写入：docker compose -f docker-compose.prod.yml stop backend frontend caddy
[ ] 3. 选定备份：ls -l /backups/db /backups/media（必要时先从 offsite 取回）
[ ] 4. 验证备份：verify-backup.sh（checksum + 可恢复性）
[ ] 5. 留存现状：backup-db.sh（恢复前快照，用于回滚）
[ ] 6. 恢复数据库：restore-db.sh（必要时 ALLOW_RESTORE_INTO_EXISTING=1）
[ ] 7. 恢复媒体：restore-media.sh（必要时 ALLOW_RESTORE_OVER_LIVE_MEDIA=1）
[ ] 8. 一致性验证：verify-recovery.sh（42 项必须全 PASS）
[ ] 9. 启动应用：docker compose -f docker-compose.prod.yml up -d
[ ] 10. 健康检查：/api/v1/health → 200
[ ] 11. 登录验证：/api/v1/auth/login → 200
[ ] 12. 公开内容验证：/work /lab /writing /experience + 首页 200
[ ] 13. 媒体 URL 验证：/media/<key> → 200 且 Content-Type 正确
[ ] 14. 记录：故障时间线、使用的备份文件、耗时、后续改进项
[ ] 15. 复盘：是否需要调整备份频率 / 保留策略 / offsite 方案
```

---

## 21. Automation（Phase 5-H.2-J — 本机自动备份 / 保留 / 失败告警）

本节描述**已在生产服务器实际部署并验证**的自动化。范围仅限 G1（调度）/ G3（保留自动化）/ G4（失败检测）；
**G2 offsite、G5 真实媒体恢复、G6 完整 DR 演练仍未实施/未验证**（见各节状态说明）。

### 21.1 调度器

| 项 | 值 |
|---|---|
| 类型 | **systemd timer**（未使用 cron；不部署第二套调度） |
| 单元 | `eson-backup.timer` → `eson-backup.service`（oneshot） |
| 计划 | **每日 03:30（Asia/Shanghai）**，`RandomizedDelaySec=300`，`Persistent=true`（错过则补跑） |
| 并发保护 | 运行器内 `flock -n /run/eson-backup.lock`（不会并发执行两份） |
| 失败依赖 | `OnFailure=eson-backup-alert.service` |

### 21.2 执行链（任一步失败即整体失败）

```text
1) DB backup      docker compose … run --rm backup /scripts/backup-db.sh
2) Media backup   docker compose … run --rm backup /scripts/backup-media.sh
3) Verify         校验最新 dump（pg_restore --list）与最新 media 归档（tar + manifest 一致性）
4) Retention      仅当 1–3 全部成功：backup-retention --dir /backups --daily 7 --weekly 4 --monthly 3 --max-delete 20 --apply
5) 成功标记       /var/lib/eson-backup/LAST_SUCCESS（并清除 LAST_FAILURE）
```

**不允许**出现的状态：DB 成功 / media 失败但任务仍报成功；**备份或校验失败时绝不执行 retention 删除**。

### 21.3 失败行为与告警（本机）

| 项 | 行为 |
|---|---|
| 退出码 | 任一步失败 → 运行器 exit 非零 → systemd `Result=exit-code`、`ExecMainStatus≠0` |
| 失败标记 | `/var/lib/eson-backup/LAST_FAILURE`（含 `failedAtUtc` / `step` / `host`，0600） |
| 告警单元 | `eson-backup-alert.service`（由 `OnFailure=` 触发） |
| 告警出口 | `journalctl -u eson-backup-alert`、`journalctl -t eson-backup-alert`、`/var/log/eson-backup-failures.log`（0600） |
| 外部通知渠道 | **EXTERNAL ALERT CHANNEL = NOT CONFIGURED**（未接入 SMTP / Telegram / Slack / webhook / 云服务；本阶段不注册任何账号） |

### 21.4 常用命令

```bash
# 手动立即执行一次完整任务（含 retention）
sudo systemctl start eson-backup.service

# 状态速查（timer / 上次成功 / 上次失败 / 备份清单 / 近期日志）
sudo /usr/local/bin/eson-backup-status.sh

# 单步手动执行（与自动任务同一条链）
docker compose --env-file /etc/eson-web/eson-web.production.env -f /opt/eson-web/docker-compose.prod.yml \
  run --rm backup /scripts/backup-db.sh
docker compose --env-file /etc/eson-web/eson-web.production.env -f /opt/eson-web/docker-compose.prod.yml \
  run --rm backup /scripts/backup-media.sh

# 手动校验某个备份
docker compose --env-file /etc/eson-web/eson-web.production.env -f /opt/eson-web/docker-compose.prod.yml \
  run --rm backup /scripts/verify-backup.sh /backups/db/<file>.dump

# 保留策略 dry-run（默认不删除）
docker compose --env-file /etc/eson-web/eson-web.production.env -f /opt/eson-web/docker-compose.prod.yml \
  run --rm backup-retention --dir /backups --daily 7 --weekly 4 --monthly 3

# 隔离恢复演练（绝不指向生产库；脚本自带保护）
sh docker/backup/restore-db.sh <backup-file>   # 需 TARGET_DB 等环境变量，见 §7.1
```

### 21.5 备份位置与权限

| 项 | 值 |
|---|---|
| 位置 | Docker volume `backup-data` → `/backups`（`db/` 与 `media/` 子目录） |
| 文件权限 | `0600`，属主 root（备份含全部数据库内容，禁止 world-readable） |
| 与生产隔离 | 与 `postgres-data` / `media-data` 卷分离；`media-data` 在备份容器中以**只读**挂载 |
| 暴露面 | **不经 Caddy 暴露、不映射任何 host 端口、不放入仓库或镜像** |

### 21.6 保留策略的实际语义（重要）

- 策略按 **UTC 日期 / ISO 周 / UTC 月** 分组，每组保留最新一份；**同一 UTC 日多次运行只保留最新一份**（较早的同日备份会被判定为被取代而删除）。
- 主文件的附属文件（`.sha256` / `.manifest.sha256` / `.meta.json`）**始终与主文件同组保留或删除**。
- 无法识别的文件名与未来时间戳永不删除。

### 21.7 本阶段验证过的事实

| 验证 | 结果 |
|---|---|
| scheduler 配置校验 | `systemd-analyze verify` 通过；timer `active/enabled`，next elapse 03:30 CST |
| 手动执行自动任务 | `Result=success`、`ExecMainStatus=0`、时长 2–3 s（DB + media + verify + retention） |
| 失败路径（真实） | media 备份失败 → exit 1 → `OnFailure` → 告警单元 → 标记 + 日志 + journal（已观测） |
| 失败路径（受控注入） | 临时指向不存在的 compose 文件 → exit 1 → 告警链路完整触发；注入已完全回滚 |
| 保留策略 | dry-run 与 apply 结果一致；`--max-delete 20` 生效；sidecar 成组处理 |
| 幂等性 | 连续两次运行生成不同时间戳文件，各自校验通过 |
| 生产影响 | 无：4 个生产容器未重启（restart count 0）、DB 未变更 |

### 21.8 仍未完成的项（勿误读为已完成）

| 项 | 状态 |
|---|---|
| G2 Offsite 备份 | **NOT IMPLEMENTED**（无目标、无凭据、无上传脚本、无调度） |
| G5 真实媒体恢复验证 | **NOT VERIFIED**（当前 production media dataset = 0；空数据集下的备份/校验已通过，但不构成真实文件恢复证明） |
| G6 完整站点 DR 演练 | **NOT DRILLED**（仅完成 PostgreSQL + 媒体一致性的隔离恢复演练） |
| 外部告警渠道 | **NOT CONFIGURED**（仅本机 journal / 日志 / 标记） |

---

## 22. Offsite Backup — Provider-Neutral Design（Phase 5-H.2-K 预检：未实施）

**状态：BLOCKED — 等待人工提供 offsite provider。**

本节是**设计**，不是已实现能力。服务器预检结果：无 provider、无 endpoint、无 bucket、无凭据、无上传工具。
因此本阶段**未创建任何云资源、未上传任何备份、未安装任何工具、未新增任何凭据文件**。

```text
Local Backup (backup-data volume)
      ↓  仅当 DB backup + DB verify + media backup + media verify 全部 PASS
Verified Backup Group（dump + .sha256 + .meta.json ／ tar.gz + .sha256 + .manifest.sha256 + .meta.json）
      ↓  本地 sha256 复核 → 加密/完整性策略
Offsite Uploader（host 级 systemd oneshot，独立于应用容器）
      ↓  put object + list prefix + get object（最小权限）
Private Remote Storage（bucket/prefix，禁止公开读）
      ↓  remote verification（size + checksum/read-back）
Group Completion Marker（`_complete/<group-id>.json` 最后写）
      ↓  写入 offsite 确认状态
Local Retention（仅删除已确认 offsite 的备份组）
```

### 22.1 设计决策（provider-neutral）

| 问题 | 设计结论 |
|---|---|
| uploader 从哪里运行 | **宿主 systemd oneshot**（新增 `eson-offsite.service`/`.timer` 或串联在 `eson-backup.service` 之后的 ExecStartPost），**不在应用容器内**。不修改 `docker-compose.prod.yml` 的运行时拓扑 |
| 使用什么权限 | **最小权限**：仅 `put object` / `list prefix` / `get object`；**禁止** bucket 删除、账号或 IAM 管理、访问无关资源。若 provider 无法收窄到该范围 → 停止实施 |
| credential 放在哪里 | 独立文件（建议 `/etc/eson-web/eson-offsite.env`，`root:root 0600`，ubuntu 不可读），或使用实例角色；**不得**进入 Git / Dockerfile / compose / unit 明文 / argv / shell history / journal / 备份 metadata / 文件名。凭据必须与 `POSTGRES_PASSWORD`、`JWT_SECRET`、`CONTACT_IP_SALT`、`ADMIN_PASSWORD` **完全独立** |
| 如何选择要上传的文件 | **不使用通配符**。由备份任务输出「本次已校验通过的组」的**显式文件名清单**（同一时间戳的一组：dump + sha256 + meta；tar.gz + sha256 + manifest + meta），uploader 只上传清单内文件 |
| 如何防止上传未验证备份 | uploader **只在上游 verify 成功后**被调用；uploader 自身**先复核本地 `.sha256`** 再上传；任一文件校验失败 → 非零退出，不上传该组 |
| 如何处理重复上传 | 采用**不可变时间戳对象名**（`<prefix>/db/eson_web_db_<UTC>.dump` 等）。上传前 `HEAD`/`list` 检查：**已存在且 size + checksum 一致 → 跳过**；存在但不一致 → **失败并告警，绝不静默覆盖** |
| 如何处理网络失败 | DNS 失败 / 超时 / RST / 5xx → 有界重试（指数退避，例如 3 次）；重试耗尽 → 非零退出 → 触发既有 `OnFailure` 告警链路（§21.3）。**不允许「上传失败但任务显示成功」** |
| 如何处理远端已有对象 | 见「重复上传」：一致则跳过；不一致则失败并保留现场，等待人工判断 |
| 如何处理本地 retention | **retention 不得删除尚未确认 offsite 的备份组**。实现方式：每组写入本地状态（例如 `/var/lib/eson-backup/offsite-confirmed/<group-id>`），retention 步骤在读该状态后跳过未确认组。**策略本身（daily 7 / weekly 4 / monthly 3）不变**，只增加「未确认 offsite 的组不删除」这一保护条件。本次**未修改** retention 行为 |
| 如何验证远端完整性 | 至少四层：① object exists；② 远端 size == 本地 size；③ 远端对象 `Content-MD5`/`ETag`（或对象自带的 sha256 metadata）与本地 `.sha256` 比对；④ 读回抽样（ranged GET）并本地重新计算哈希。**若 provider 无法提供 checksum，只能做到 ①②④，报告中必须如实说明实际层次，不得声称 "checksum verified"** |
| 组完成标记 | 所有对象上传 + 校验通过后，**最后**写入 `_complete/<group-id>.json`（含对象清单、每个对象的 sha256 与 size、上传时间、provider/bucket/prefix）。恢复与 retention 都以该 marker 为「这一组可用」的唯一依据 |
| 如何恢复 | 以 marker 为入口下载整组 → 逐文件 sha256 校验 → 使用 §7.1 的隔离恢复流程（`restore-db.sh` 拒绝生产库）→ `verify-recovery.sh` 全量验证 → 记录耗时。**永远不直接恢复到生产库** |
| 加密 | 优先使用 provider 的 **server-side encryption**（SSE，provider-managed key）。若需要客户自管密钥或客户端加密（如 age/gpg），**必须由人工提供密钥策略**（生成、保存、轮换、丢失后果）；**不得**复用任何现有生产 secret 作为备份加密密钥。本阶段未创建任何密钥 |

### 22.2 实施方式限制（预检结论）

- 上传工具（rclone / aws-cli / s3cmd / mc / coscmd / ossutil 之一）**当前均未安装**；安装属于服务器软件变更，需在实施阶段获得明确批准。
- 备份与生产数据当前位于同一 VPS、同一 Docker 数据根目录 → 单机故障即全损；offsite 是唯一的异地保障。

### 22.3 实施所需人工输入（Required manual inputs）

以下每一项都必须由人工明确提供后才能进入实施阶段（缺少任一项则保持 BLOCKED）：

| # | 需要提供 | 说明 |
|---|---|---|
| 1 | **provider** | Tencent COS / AWS S3 / Alibaba OSS / Backblaze B2 / Cloudflare R2 / 自建 S3-compatible，或明确指定其他 |
| 2 | **region** | 例如 `ap-beijing` / `us-east-1` 等 |
| 3 | **endpoint** | 非 AWS 或自建场景必需（例如 `https://cos.ap-beijing.myqcloud.com`） |
| 4 | **bucket / container** | 名称（需人工创建，本流程不自动创建） |
| 5 | **prefix** | 例如 `eson-web/prod`（用于隔离与生命周期规则） |
| 6 | **credential method** | access key pair 写入受保护文件 / 实例角色 / 其他；并确认该文件路径 |
| 7 | **credential permissions** | 确认已按最小权限授予（put + list prefix + get）；若无法收窄 → 停止 |
| 8 | **encryption policy** | provider-managed SSE / customer-managed SSE / 客户端加密（需给密钥策略） |
| 9 | **remote lifecycle** | 远端保留/版本化/生命周期规则（与本地 daily 7 / weekly 4 / monthly 3 的关系） |
| 10 | **操作批准** | 批准「安装上传工具」「创建 offsite 凭据文件」「把 offsite 步骤接入 systemd 调度」这三项变更 |
| 11 | **成本确认** | 确认存储与流量（含恢复时的出网流量）成本可接受 |

---

## 附：脚本与配置索引

| 位置 | 作用 |
|---|---|
| `docker/backup/backup-db.sh` | 数据库备份 |
| `docker/backup/backup-media.sh` | 媒体备份 |
| `docker/backup/verify-backup.sh` | 备份校验 |
| `docker/backup/restore-db.sh` | 数据库恢复（带隔离保护） |
| `docker/backup/restore-media.sh` | 媒体恢复（带 manifest 校验） |
| `docker/backup/verify-recovery.sh` | 恢复完整性验证 |
| `docker/backup/cleanup-backups.sh` | 保留策略入口（默认 dry-run） |
| `docker/backup/retention.mjs` / `retention.spec.mjs` | 保留策略实现与测试 |
| `docker-compose.prod.yml`（`backup` / `backup-retention`） | 一次性运维服务与 `backup-data` 卷 |

### 本机调度与告警（Phase 5-H.2-J）

| 位置 | 作用 |
|---|---|
| `/etc/systemd/system/eson-backup.timer` | 每日 03:30（Asia/Shanghai）触发，`Persistent=true`，随机延迟 ≤300s |
| `/etc/systemd/system/eson-backup.service` | oneshot：执行 `/usr/local/bin/eson-backup-run.sh`，`OnFailure=eson-backup-alert.service` |
| `/etc/systemd/system/eson-backup-alert.service` | 失败告警单元（本机：journal + 日志 + 标记文件） |
| `/usr/local/bin/eson-backup-run.sh` | 任务运行器：DB 备份 → media 备份 → 校验 → （仅成功时）retention |
| `/usr/local/bin/eson-backup-alert.sh` | 写 `/var/lib/eson-backup/LAST_FAILURE`、追加 `/var/log/eson-backup-failures.log`、`logger -t eson-backup-alert` |
| `/usr/local/bin/eson-backup-status.sh` | 状态速查（timer / 上次成功 / 上次失败 / 备份清单 / 近期日志） |
| `/etc/eson-web/eson-backup.conf` | 非敏感配置（路径、`ESON_RETENTION_MAX_DELETE`），root:root 0600 |
| `/etc/eson-web/eson-web.production.env` | 生产凭据来源（root:root 0600），**unit 文件中不含任何 secret** |
