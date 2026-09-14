#!/bin/sh
# 数据库恢复（恢复到**隔离**目标库，Phase 5-G）
#
# 用法：restore-db.sh <backup-file>
# 环境：PGHOST PGPORT PGUSER PGPASSWORD TARGET_DB
#       ALLOW_RESTORE_INTO_EXISTING=1  允许删除并重建已存在的目标库（默认 0 = 拒绝）
#
# 安全防线（防止误伤开发库 / 生产库）：
# - 拒绝恢复到 eson_web / postgres / template0 / template1
# - 拒绝恢复到与源库（PGDATABASE）同名的库
# - 目标库已存在时默认拒绝

set -eu
. "$(dirname "$0")/common.sh"

[ $# -eq 1 ] || fail "usage: restore-db.sh <backup-file>"
FILE="$1"
require_file "$FILE"
require_pg_env
require_env TARGET_DB
verify_sha256 "$FILE"

case "$TARGET_DB" in
eson_web | postgres | template0 | template1)
	fail "refusing to restore into protected database: $TARGET_DB"
	;;
esac

[ "$TARGET_DB" = "$PGDATABASE" ] && fail "refusing to restore into the source database: $TARGET_DB"

EXISTING="$(psql -t -A -c "select 1 from pg_database where datname = '$TARGET_DB'" | tr -d '[:space:]')"

if [ "$EXISTING" = "1" ]; then
	[ "${ALLOW_RESTORE_INTO_EXISTING:-0}" = "1" ] \
		|| fail "target database already exists (set ALLOW_RESTORE_INTO_EXISTING=1 to recreate): $TARGET_DB"
	log "dropping existing target database: $TARGET_DB"
	dropdb --if-exists "$TARGET_DB" || fail "dropdb failed: $TARGET_DB"
fi

STARTED="$(now_epoch)"
log "db restore start: target=$TARGET_DB file=$(basename "$FILE")"

createdb "$TARGET_DB" || fail "createdb failed: $TARGET_DB"

pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TARGET_DB" "$FILE" \
	|| fail "pg_restore failed (target=$TARGET_DB)"

TABLES="$(psql -d "$TARGET_DB" -t -A -c "select count(*) from information_schema.tables where table_schema = 'public'" | tr -d '[:space:]')"

log "db restore done: target=$TARGET_DB tables=$TABLES duration=$(elapsed_since "$STARTED")s"
