#!/bin/sh
# 恢复完整性验证（Phase 5-G）
#
# 用法：verify-recovery.sh
# 环境：PGHOST PGPORT PGUSER PGPASSWORD DB（恢复后的目标库） MEDIA_ROOT（恢复后的媒体目录）
#
# 验证内容：
#   1) schema：业务表数量（25）、Prisma migration 元数据
#   2) 核心表行数（全部 25 张表）
#   3) 关系完整性：translation / join / cover 孤儿 + 内容状态约束
#   4) admin 用户存在
#   5) DB → File：每个 media.storage_key 在恢复目录中存在、大小与 DB 一致、magic bytes 与 mime 一致
#   6) File → DB：孤儿文件检测（文件系统存在但 DB 无记录）
#
# 任一检查失败：脚本 exit 1（不吞错误）

set -eu
. "$(dirname "$0")/common.sh"

require_pg_env
require_env DB
require_dir "$MEDIA_ROOT"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

CHECKS=0
FAILURES=0

psql_q() {
	psql -d "$DB" -t -A -c "$1"
}

pass() {
	CHECKS=$((CHECKS + 1))
	log "PASS: $*"
}

bad() {
	CHECKS=$((CHECKS + 1))
	FAILURES=$((FAILURES + 1))
	log "FAIL: $*"
}

check_eq() {
	if [ "$2" = "$3" ]; then
		pass "$1 = $2"
	else
		bad "$1 = $2 (expected $3)"
	fi
}

check_zero() {
	check_eq "$1" "$2" "0"
}

check_min() {
	if [ "$2" -ge "$3" ] 2> /dev/null; then
		pass "$1 = $2 (>= $3)"
	else
		bad "$1 = $2 (expected >= $3)"
	fi
}

# 只识别 V1 允许的四种图片格式（PNG / JPEG / WebP / AVIF）
detect_image_mime() {
	HEX="$(od -An -tx1 -N16 "$1" | tr -d ' \n')"

	case "$HEX" in
	89504e470d0a1a0a*) printf 'image/png' ;;
	ffd8ff*) printf 'image/jpeg' ;;
	52494646*)
		case "$HEX" in
		# RIFF(4B) + size(4B) + WEBP(4B)：WEBP 位于第 9–12 字节
		????????????????57454250*) printf 'image/webp' ;;
		*) printf 'unknown' ;;
		esac
		;;
	????????66747970*)
		case "$(printf '%s' "$HEX" | cut -c17-24)" in
		61766966 | 61766973) printf 'image/avif' ;;
		*) printf 'unknown' ;;
		esac
		;;
	*) printf 'unknown' ;;
	esac
}

log "=== recovery verification start: db=$DB media=$MEDIA_ROOT ==="

# ── 1. schema ────────────────────────────────────────────────
log "--- schema ---"
check_eq "business table count" "$(psql_q "select count(*) from information_schema.tables where table_schema = 'public' and table_name <> '_prisma_migrations'")" "25"
check_eq "applied migrations" "$(psql_q "select count(*) from _prisma_migrations where finished_at is not null")" "1"
check_zero "failed migrations" "$(psql_q "select count(*) from _prisma_migrations where finished_at is null or rolled_back_at is not null")"
log "latest migration: $(psql_q "select migration_name from _prisma_migrations order by finished_at desc limit 1")"

# ── 2. 行数 ──────────────────────────────────────────────────
log "--- row counts ---"
for TABLE in users works work_translations work_categories work_tags work_media \
	labs lab_translations lab_categories lab_tags lab_media \
	writings writing_translations writing_categories writing_tags writing_media \
	experiences experience_translations \
	categories category_translations tags tag_translations \
	media contact_messages site_settings; do
	log "rowcount $TABLE = $(psql_q "select count(*) from \"$TABLE\"")"
done

# ── 3. 关系完整性 ────────────────────────────────────────────
log "--- relations ---"
check_zero "orphan work_translations" "$(psql_q "select count(*) from work_translations t left join works p on p.id = t.work_id where p.id is null")"
check_zero "orphan lab_translations" "$(psql_q "select count(*) from lab_translations t left join labs p on p.id = t.lab_id where p.id is null")"
check_zero "orphan writing_translations" "$(psql_q "select count(*) from writing_translations t left join writings p on p.id = t.writing_id where p.id is null")"
check_zero "orphan experience_translations" "$(psql_q "select count(*) from experience_translations t left join experiences p on p.id = t.experience_id where p.id is null")"
check_zero "orphan category_translations" "$(psql_q "select count(*) from category_translations t left join categories p on p.id = t.category_id where p.id is null")"
check_zero "orphan tag_translations" "$(psql_q "select count(*) from tag_translations t left join tags p on p.id = t.tag_id where p.id is null")"
check_zero "orphan work_categories -> works" "$(psql_q "select count(*) from work_categories j left join works p on p.id = j.work_id where p.id is null")"
check_zero "orphan work_categories -> categories" "$(psql_q "select count(*) from work_categories j left join categories p on p.id = j.category_id where p.id is null")"
check_zero "orphan work_tags -> works" "$(psql_q "select count(*) from work_tags j left join works p on p.id = j.work_id where p.id is null")"
check_zero "orphan work_tags -> tags" "$(psql_q "select count(*) from work_tags j left join tags p on p.id = j.tag_id where p.id is null")"
check_zero "orphan work_media -> works" "$(psql_q "select count(*) from work_media j left join works p on p.id = j.work_id where p.id is null")"
check_zero "orphan work_media -> media" "$(psql_q "select count(*) from work_media j left join media p on p.id = j.media_id where p.id is null")"
check_zero "orphan lab_categories -> labs" "$(psql_q "select count(*) from lab_categories j left join labs p on p.id = j.lab_id where p.id is null")"
check_zero "orphan lab_categories -> categories" "$(psql_q "select count(*) from lab_categories j left join categories p on p.id = j.category_id where p.id is null")"
check_zero "orphan lab_tags -> labs" "$(psql_q "select count(*) from lab_tags j left join labs p on p.id = j.lab_id where p.id is null")"
check_zero "orphan lab_tags -> tags" "$(psql_q "select count(*) from lab_tags j left join tags p on p.id = j.tag_id where p.id is null")"
check_zero "orphan lab_media -> labs" "$(psql_q "select count(*) from lab_media j left join labs p on p.id = j.lab_id where p.id is null")"
check_zero "orphan lab_media -> media" "$(psql_q "select count(*) from lab_media j left join media p on p.id = j.media_id where p.id is null")"
check_zero "orphan writing_categories -> writings" "$(psql_q "select count(*) from writing_categories j left join writings p on p.id = j.writing_id where p.id is null")"
check_zero "orphan writing_categories -> categories" "$(psql_q "select count(*) from writing_categories j left join categories p on p.id = j.category_id where p.id is null")"
check_zero "orphan writing_tags -> writings" "$(psql_q "select count(*) from writing_tags j left join writings p on p.id = j.writing_id where p.id is null")"
check_zero "orphan writing_tags -> tags" "$(psql_q "select count(*) from writing_tags j left join tags p on p.id = j.tag_id where p.id is null")"
check_zero "orphan writing_media -> writings" "$(psql_q "select count(*) from writing_media j left join writings p on p.id = j.writing_id where p.id is null")"
check_zero "orphan writing_media -> media" "$(psql_q "select count(*) from writing_media j left join media p on p.id = j.media_id where p.id is null")"
check_zero "works cover -> media" "$(psql_q "select count(*) from works c left join media m on m.id = c.cover_media_id where c.cover_media_id is not null and m.id is null")"
check_zero "labs cover -> media" "$(psql_q "select count(*) from labs c left join media m on m.id = c.cover_media_id where c.cover_media_id is not null and m.id is null")"
check_zero "writings cover -> media" "$(psql_q "select count(*) from writings c left join media m on m.id = c.cover_media_id where c.cover_media_id is not null and m.id is null")"

# ── 4. 内容状态约束 ──────────────────────────────────────────
log "--- content state rules ---"
check_zero "PUBLISHED works without published_at" "$(psql_q "select count(*) from works where status = 'PUBLISHED' and published_at is null")"
check_zero "PUBLISHED labs without published_at" "$(psql_q "select count(*) from labs where status = 'PUBLISHED' and published_at is null")"
check_zero "PUBLISHED writings without published_at" "$(psql_q "select count(*) from writings where status = 'PUBLISHED' and published_at is null")"
check_zero "experiences is_current with end_date" "$(psql_q "select count(*) from experiences where is_current = true and end_date is not null")"

# ── 5. admin 用户 ────────────────────────────────────────────
log "--- admin ---"
check_min "admin users" "$(psql_q "select count(*) from users where role = 'ADMIN'")" "1"
check_min "active admin users" "$(psql_q "select count(*) from users where role = 'ADMIN' and is_active = true")" "1"

# ── 6. DB → File ─────────────────────────────────────────────
log "--- db -> file ---"
psql_q "select storage_key || '|' || coalesce(size, 0) || '|' || mime_type from media order by storage_key" > "$WORK/media_rows.txt"
MEDIA_ROWS="$(wc -l < "$WORK/media_rows.txt" | tr -d ' ')"
log "media records = $MEDIA_ROWS"

MISSING=0
SIZE_MISMATCH=0
MIME_MISMATCH=0
CHECKED=0

while IFS='|' read -r KEY DB_SIZE DB_MIME; do
	[ -n "$KEY" ] || continue
	ON_DISK="$MEDIA_ROOT/$KEY"

	if [ ! -f "$ON_DISK" ]; then
		MISSING=$((MISSING + 1))
		log "FAIL: missing file for storage_key=$KEY"
		continue
	fi

	FS_SIZE="$(file_size "$ON_DISK")"
	if [ "$DB_SIZE" != "$FS_SIZE" ]; then
		SIZE_MISMATCH=$((SIZE_MISMATCH + 1))
		log "FAIL: size mismatch storage_key=$KEY db=$DB_SIZE fs=$FS_SIZE"
	fi

	DETECTED="$(detect_image_mime "$ON_DISK")"
	if [ "$DETECTED" != "$DB_MIME" ]; then
		MIME_MISMATCH=$((MIME_MISMATCH + 1))
		log "FAIL: mime mismatch storage_key=$KEY db=$DB_MIME detected=$DETECTED"
	fi

	CHECKED=$((CHECKED + 1))
done < "$WORK/media_rows.txt"

check_eq "media files checked" "$CHECKED" "$MEDIA_ROWS"
check_zero "missing media files" "$MISSING"
check_zero "media size mismatches" "$SIZE_MISMATCH"
check_zero "media mime mismatches" "$MIME_MISMATCH"

# ── 7. File → DB（孤儿检测） ─────────────────────────────────
log "--- file -> db (orphans) ---"
(
	cd "$MEDIA_ROOT" && find . -type f | sed 's|^\./||' | LC_ALL=C sort
) > "$WORK/fs_files.txt"

# media_rows 的格式是 storage_key|size|mime，必须只取第一列作为 key
awk -F'|' 'NR == FNR { db[$1] = 1; next } !($0 in db) { print }' "$WORK/media_rows.txt" "$WORK/fs_files.txt" > "$WORK/orphans.txt"

FS_FILES="$(wc -l < "$WORK/fs_files.txt" | tr -d ' ')"
ORPHANS="$(wc -l < "$WORK/orphans.txt" | tr -d ' ')"
log "filesystem files = $FS_FILES"

if [ "$ORPHANS" != "0" ]; then
	head -n 10 "$WORK/orphans.txt" | while IFS= read -r ORPHAN; do
		log "FAIL: orphan file (not in DB): $ORPHAN"
	done
fi

check_zero "orphan media files" "$ORPHANS"
check_eq "file count matches media records" "$FS_FILES" "$MEDIA_ROWS"

# ── 8. 汇总 ─────────────────────────────────────────────────
log "=== checks=$CHECKS failures=$FAILURES ==="

if [ "$FAILURES" -ne 0 ]; then
	fail "recovery verification FAILED ($FAILURES of $CHECKS checks failed)"
fi

log "recovery verification PASSED ($CHECKS checks)"
