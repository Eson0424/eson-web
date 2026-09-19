# docker/backup — Backup / Recovery 脚本（Phase 5-G）

这些脚本是**运维工具**，面向 Linux 生产容器（`postgres:17-alpine` / `node:24-slim`），
不参与应用运行时；使用方式与完整演练步骤见 [docs/RECOVERY.md](../../docs/RECOVERY.md)。

| 脚本 | 作用 |
|---|---|
| `backup-db.sh` | `pg_dump -Fc` 数据库备份 + `.sha256` + `.meta.json` |
| `backup-media.sh` | 媒体目录 `tar.gz` 归档 + `.sha256` + 恢复用 `.manifest.sha256` + `.meta.json` |
| `verify-backup.sh` | 校验 checksum 与备份可恢复性（`pg_restore --list` / `tar -tzf`） |
| `restore-db.sh` | 恢复到**隔离**目标库（拒绝 `eson_web` / 源库 / 已存在库） |
| `restore-media.sh` | 恢复到指定目录（拒绝直接覆盖线上媒体目录） |
| `verify-recovery.sh` | schema / 行数 / 关系 / admin / DB↔File / 孤儿文件 全量验证 |
| `cleanup-backups.sh` | 保留策略入口（默认 dry-run；`--apply` 才删除） |
| `retention.mjs` | 保留策略实现（daily 7 / weekly 4 / monthly 3） |
| `retention.spec.mjs` | 保留策略测试（`node --test`，无新增依赖） |

## 调用方式（Phase 5-H.2-J 统一约定）

这些脚本在 Git 中记录为 **100644（无可执行位）**，而 compose 的 `backup` 服务 entrypoint 是 `/bin/sh`：

```bash
# 推荐：经 compose（等价于 sh /scripts/<script>.sh）
docker compose -f docker-compose.prod.yml run --rm backup /scripts/backup-db.sh

# 容器内直接执行
sh /scripts/backup-db.sh
```

**不要**依赖可执行位（`/scripts/backup-db.sh` 直接执行会 Permission denied），也不要在同一套流程里混用两种调用方式。
`cleanup-backups.sh` 需要 `node`，只能通过 `backup-retention` 服务运行。

## 空媒体数据集（Phase 5-H.2-J 修复）

- `backup-media.sh`：媒体目录为空时不再让 `xargs` 以无参数方式调用 `sha256sum`（那会产生一条读 stdin 的无关哈希，
  使 manifest 条目数与归档条目数不一致而必然失败）；空目录直接产出空 manifest。
- `verify-backup.sh`：空 manifest 由「直接失败」改为**一致性判据** —— 仅当归档本身确实不含任何文件时才接受，
  否则仍判失败（保持完整性语义：空 manifest ⟺ 空归档）。

## 自动调度（Phase 5-H.2-J）

生产服务器由 **systemd timer** 每日 03:30（Asia/Shanghai）执行完整链路
（DB 备份 → media 备份 → 校验 → 仅成功后 retention），失败触发本机告警单元。
部署细节、常用命令与仍未完成项见 [docs/RECOVERY.md §21](../../docs/RECOVERY.md)。

约定：

- 备份文件绝不进入 Git / Docker 镜像 / `media-data` volume / `postgres-data` volume
- 备份目录与媒体目录必须相互独立（脚本会拒绝互相包含的路径）
- 所有时间戳为 UTC；所有失败 exit non-zero；不打印任何 secret
