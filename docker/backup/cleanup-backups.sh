#!/bin/sh
# 备份保留策略执行入口（Phase 5-G）
#
# 用法：
#   cleanup-backups.sh --dry-run        # 默认行为：只输出计划，不删除
#   cleanup-backups.sh --apply          # 显式执行删除
#
# 环境：BACKUP_DIR（默认 /backups）
# 说明：策略逻辑在 retention.mjs（node --test docker/backup/retention.spec.mjs 可验证）。
#       postgres:17-alpine 内没有 node，请使用 compose 的 backup-retention 服务执行 —— 见 docs/RECOVERY.md。

set -eu
. "$(dirname "$0")/common.sh"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
require_dir "$BACKUP_DIR"

command -v node > /dev/null 2>&1 \
	|| fail "node not found: run retention via 'docker compose -f docker-compose.prod.yml run --rm backup-retention --apply' (see docs/RECOVERY.md)"

exec node "$(dirname "$0")/retention.mjs" --dir "$BACKUP_DIR" "$@"
