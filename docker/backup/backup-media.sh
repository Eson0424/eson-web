#!/bin/sh
# 媒体备份（tar.gz + sha256 + 恢复用 manifest，Phase 5-G）
#
# 用法：backup-media.sh
# 环境：MEDIA_ROOT（默认 /srv/eson-media） BACKUP_DIR（默认 /backups）
# 产出：<BACKUP_DIR>/media/eson_web_media_<UTC>.tar.gz + .sha256 + .manifest.sha256 + .meta.json
#
# 说明：
# - 保留目录结构与 object key（media/<yyyy>/<mm>/<uuid>.<ext>）
# - manifest 记录每个文件的相对路径 + sha256，恢复后逐文件比对，证明字节一致
# - 备份目录不得位于 MEDIA_ROOT 内（否则会备份自己）

set -eu
. "$(dirname "$0")/common.sh"

MEDIA_ROOT="${MEDIA_ROOT:-/srv/eson-media}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
MEDIA_ROOT="${MEDIA_ROOT%/}"
BACKUP_DIR="${BACKUP_DIR%/}"

require_dir "$MEDIA_ROOT"
assert_separate_paths "$MEDIA_ROOT" "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/media" || fail "cannot create backup dir: $BACKUP_DIR/media"

STAMP="$(utc_stamp)"
ARCHIVE="$BACKUP_DIR/media/eson_web_media_${STAMP}.tar.gz"
MANIFEST="$ARCHIVE.manifest.sha256"
STARTED="$(now_epoch)"

log "media backup start: root=$MEDIA_ROOT"

# 1) 清单（相对路径 + sha256）。object key 为 uuid 形式，不含空白字符。
#
# Phase 5-H.2-J 修复：媒体目录为空时不得让 xargs 以「无参数」方式调用 sha256sum ——
# 那会让 sha256sum 去读 stdin 并输出一条无关哈希，使 manifest 条目数（1）与归档
# 条目数（0）不一致，导致空数据集下备份必然失败。空目录时应产出空 manifest。
MEDIA_FILES="$(find "$MEDIA_ROOT" -type f | wc -l | tr -d ' ')"
if [ "$MEDIA_FILES" -eq 0 ]; then
	: > "$MANIFEST"
else
	(
		cd "$MEDIA_ROOT" && find . -type f | LC_ALL=C sort | xargs sha256sum
	) > "$MANIFEST" || fail "failed to build media manifest"
fi

FILE_COUNT="$(wc -l < "$MANIFEST" | tr -d ' ')"
TOTAL_BYTES="$(
	cd "$MEDIA_ROOT" && find . -type f -exec wc -c {} + | awk 'NF == 2 { sum += $1 } END { print sum + 0 }'
)"

# 2) 归档（保留目录结构）
tar -czf "$ARCHIVE" -C "$MEDIA_ROOT" . || fail "tar failed"

# 3) 自检：归档可读，且条目数与清单一致
tar -tzf "$ARCHIVE" > /dev/null || fail "archive is not readable"
ARCHIVED_FILES="$(tar -tzf "$ARCHIVE" | grep -v '/$' | wc -l | tr -d ' ')"
[ "$ARCHIVED_FILES" = "$FILE_COUNT" ] \
	|| fail "archive file count ($ARCHIVED_FILES) != manifest file count ($FILE_COUNT)"

sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"
CHECKSUM="$(sha256_of "$ARCHIVE")"
ARCHIVE_SIZE="$(file_size "$ARCHIVE")"

cat > "$ARCHIVE.meta.json" <<EOF
{
  "type": "media",
  "fileName": "$(basename "$ARCHIVE")",
  "createdAtUtc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "mediaRoot": "$MEDIA_ROOT",
  "format": "tar.gz",
  "fileCount": $FILE_COUNT,
  "mediaBytes": $TOTAL_BYTES,
  "archiveSizeBytes": $ARCHIVE_SIZE,
  "sha256": "$CHECKSUM",
  "manifest": "$(basename "$MANIFEST")"
}
EOF

log "media backup done: $(basename "$ARCHIVE") files=$FILE_COUNT media=${TOTAL_BYTES}B archive=${ARCHIVE_SIZE}B duration=$(elapsed_since "$STARTED")s"
