#!/bin/sh
# 媒体恢复（Phase 5-G）
#
# 用法：restore-media.sh <archive.tar.gz> <target-root>
# 环境：MEDIA_ROOT（用于防呆比较） ALLOW_RESTORE_OVER_LIVE_MEDIA=1（默认 0 = 拒绝覆盖线上媒体）
#
# 恢复后立即用备份 manifest 逐文件校验 sha256；任何不一致直接 FAIL。

set -eu
. "$(dirname "$0")/common.sh"

[ $# -eq 2 ] || fail "usage: restore-media.sh <archive.tar.gz> <target-root>"
ARCHIVE="$1"
TARGET_ROOT="${2%/}"
require_file "$ARCHIVE"
verify_sha256 "$ARCHIVE"

MANIFEST="$ARCHIVE.manifest.sha256"
[ -s "$MANIFEST" ] || fail "manifest missing or empty: $(basename "$MANIFEST")"

LIVE_ROOT="${MEDIA_ROOT:-/srv/eson-media}"
LIVE_ROOT="${LIVE_ROOT%/}"

if [ "$TARGET_ROOT" = "$LIVE_ROOT" ] && [ "${ALLOW_RESTORE_OVER_LIVE_MEDIA:-0}" != "1" ]; then
	fail "refusing to restore over live media root ($LIVE_ROOT); set ALLOW_RESTORE_OVER_LIVE_MEDIA=1 for real disaster recovery"
fi

STARTED="$(now_epoch)"
mkdir -p "$TARGET_ROOT" || fail "cannot create target root: $TARGET_ROOT"
log "media restore start: target=$TARGET_ROOT file=$(basename "$ARCHIVE")"

tar -xzf "$ARCHIVE" -C "$TARGET_ROOT" || fail "tar extract failed"

# 逐文件比对：备份时的 sha256 必须与恢复后的文件完全一致
( cd "$TARGET_ROOT" && sha256sum -c "$MANIFEST" > /dev/null ) \
	|| fail "restored media does not match backup manifest"

RESTORED="$(find "$TARGET_ROOT" -type f | wc -l | tr -d ' ')"
log "media restore done: target=$TARGET_ROOT files=$RESTORED duration=$(elapsed_since "$STARTED")s"
