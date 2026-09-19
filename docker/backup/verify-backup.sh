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
	MANIFEST="$FILE.manifest.sha256"
	[ -f "$MANIFEST" ] || fail "manifest missing: $(basename "$MANIFEST")"

	# Phase 5-H.2-J 修复：空媒体数据集下 manifest 合法地为空（0 条目）。
	# 完整性判据改为「manifest 条目数必须与归档内容一致」：
	#   - manifest 非空 -> 正常记录条目数
	#   - manifest 为空 -> 仅当归档确实不含任何文件时才接受
	if [ -s "$MANIFEST" ]; then
		log "manifest present: $(basename "$MANIFEST") ($(wc -l < "$MANIFEST" | tr -d ' ') entries)"
	else
		ARCHIVED="$(tar -tzf "$FILE" | grep -v '/$' | grep -v '^\.$' | wc -l | tr -d ' ')"
		[ "$ARCHIVED" -eq 0 ] \
			|| fail "manifest is empty but archive contains $ARCHIVED entries: $(basename "$FILE")"
		log "manifest empty and archive has 0 files (empty media dataset) — accepted"
	fi
	;;
*)
	fail "unknown backup type: $(basename "$FILE")"
	;;
esac

log "verify OK: $(basename "$FILE")"
