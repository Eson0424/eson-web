#!/bin/sh
# 备份文件完整性校验（Phase 5-G）
#
# 用法：verify-backup.sh <backup-file>
# 校验：sha256（缺失/不一致即 FAIL）+ 备份自身可读性（pg_restore --list / tar -tzf）

set -eu
. "$(dirname "$0")/common.sh"

[ $# -eq 1 ] || fail "usage: verify-backup.sh <backup-file>"
FILE="$1"
require_file "$FILE"

verify_sha256 "$FILE"

case "$FILE" in
*.dump)
	require_pg_env
	pg_restore --list "$FILE" > /dev/null || fail "pg_restore cannot read dump: $(basename "$FILE")"
	log "pg_restore OK: $(basename "$FILE")"
	;;
*.tar.gz)
	tar -tzf "$FILE" > /dev/null || fail "tar cannot read archive: $(basename "$FILE")"
	log "tar OK: $(basename "$FILE")"
	[ -s "$FILE.manifest.sha256" ] || fail "manifest missing or empty: $(basename "$FILE").manifest.sha256"
	log "manifest present: $(basename "$FILE").manifest.sha256"
	;;
*)
	fail "unknown backup type: $(basename "$FILE")"
	;;
esac

log "verify OK: $(basename "$FILE")"
