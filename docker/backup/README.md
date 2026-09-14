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

约定：

- 备份文件绝不进入 Git / Docker 镜像 / `media-data` volume / `postgres-data` volume
- 备份目录与媒体目录必须相互独立（脚本会拒绝互相包含的路径）
- 所有时间戳为 UTC；所有失败 exit non-zero；不打印任何 secret
