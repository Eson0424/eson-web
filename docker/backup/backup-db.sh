#!/bin/sh
# PostgreSQL 生产备份（pg_dump custom format，Phase 5-G）
#
# 用法：backup-db.sh
# 环境：PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE BACKUP_DIR（默认 /backups）
# 产出：<BACKUP_DIR>/db/eson_web_db_<UTC>.dump + .sha256 + .meta.json
#
# 说明：
# - 只使用 pg_dump custom format（-Fc）；文本 SQL dump 不作为生产备份
# - dump 不进入 Git / 镜像，也不与 media volume、postgres data volume 混用
# - 元数据记录 host / port / db / 时间 / 格式 / 大小 / checksum / pg 版本 / migration 版本

set -eu
. "$(dirname "$0")/common.sh"

require_pg_env
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_DIR="${BACKUP_DIR%/}"
mkdir -p "$BACKUP_DIR/db" || fail "cannot create backup dir: $BACKUP_DIR/db"

STAMP="$(utc_stamp)"
TARGET="$BACKUP_DIR/db/eson_web_db_${STAMP}.dump"
STARTED="$(now_epoch)"

log "db backup start: db=$PGDATABASE host=$PGHOST port=$PGPORT"

pg_dump --format=custom --no-owner --no-privileges --file="$TARGET" "$PGDATABASE" \
	|| fail "pg_dump failed (db=$PGDATABASE)"

[ -s "$TARGET" ] || fail "dump file is empty: $(basename "$TARGET")"

# 立即自检：dump 必须能被 pg_restore 读取目录（否则备份不可用）
pg_restore --list "$TARGET" > /dev/null || fail "dump is not restorable: $(basename "$TARGET")"

sha256sum "$TARGET" > "$TARGET.sha256"

SIZE="$(file_size "$TARGET")"
CHECKSUM="$(sha256_of "$TARGET")"
PG_VERSION="$(pg_dump --version | awk '{print $NF}')"
MIGRATION="$(psql -t -A -c "select migration_name from _prisma_migrations where finished_at is not null order by finished_at desc limit 1" 2>/dev/null | tr -d '[:space:]')"
[ -n "$MIGRATION" ] || MIGRATION="unknown"

cat > "$TARGET.meta.json" <<EOF
{
  "type": "database",
  "fileName": "$(basename "$TARGET")",
  "createdAtUtc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "dbHost": "$PGHOST",
  "dbPort": "$PGPORT",
  "dbName": "$PGDATABASE",
  "format": "pg_dump-custom",
  "sizeBytes": $SIZE,
  "sha256": "$CHECKSUM",
  "pgDumpVersion": "$PG_VERSION",
  "prismaMigration": "$MIGRATION"
}
EOF

log "db backup done: $(basename "$TARGET") size=${SIZE}B duration=$(elapsed_since "$STARTED")s"
