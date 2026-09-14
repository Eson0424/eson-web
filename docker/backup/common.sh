#!/bin/sh
# Eson_web Backup / Recovery 公共函数（Phase 5-G）
#
# 约束：
# - 绝不输出 DATABASE_URL / PGPASSWORD / 任何 secret（只输出 host / port / db 名 / 文件名）
# - 任何失败都必须 exit non-zero，不吞错误
# - 所有时间戳统一使用 UTC
# - 脚本可重复执行，不做隐式破坏性操作

set -eu

# 备份是高敏感数据（含全部数据库内容）：新建文件/目录默认仅 owner 可读写
# （0600 / 0700），不做 world-readable。
umask 077

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

fail() {
	printf '[%s] ERROR: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2
	exit 1
}

now_epoch() {
	date -u +%s
}

elapsed_since() {
	printf '%s' "$(( $(now_epoch) - $1 ))"
}

utc_stamp() {
	date -u +%Y%m%d_%H%M%S
}

require_env() {
	eval "value=\${$1:-}"
	[ -n "$value" ] || fail "missing required environment variable: $1"
}

require_file() {
	[ -f "$1" ] || fail "file not found: $1"
}

require_dir() {
	[ -d "$1" ] || fail "directory not found: $1"
}

sha256_of() {
	sha256sum "$1" | awk '{print $1}'
}

file_size() {
	wc -c < "$1" | tr -d ' '
}

# 数据库连接参数（缺失即失败；不打印任何密码）
require_pg_env() {
	require_env PGHOST
	require_env PGPORT
	require_env PGUSER
	require_env PGPASSWORD
	require_env PGDATABASE
}

# 校验 <file>.sha256；缺失或不一致直接 FAIL
verify_sha256() {
	file="$1"
	[ -f "$file.sha256" ] || fail "checksum file missing: $(basename "$file").sha256"
	( cd "$(dirname "$file")" && sha256sum -c "$(basename "$file").sha256" > /dev/null ) \
		|| fail "sha256 mismatch: $(basename "$file")"
	log "sha256 OK: $(basename "$file")"
}

# 防呆：两个目录不得互相包含（避免备份写进被备份的目录 / 备份自己备份自己）
assert_separate_paths() {
	left="$1"
	right="$2"
	case "$right" in
	"$left" | "$left"/*) fail "path conflict: $right must not be inside $left" ;;
	esac
	case "$left" in
	"$right" | "$right"/*) fail "path conflict: $left must not be inside $right" ;;
	esac
}
