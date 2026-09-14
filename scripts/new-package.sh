#!/usr/bin/env bash
set -euo pipefail

if [ -t 1 ]; then
	GREEN=$'\033[38;5;150m'
	DIM=$'\033[38;5;244m'
	BOLD=$'\033[1m'
	RESET=$'\033[0m'
else
	GREEN=""; DIM=""; BOLD=""; RESET=""
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PACKAGES_DIR="$ROOT/packages"

prompt() {
	local label="$1" default="${2:-}" value=""
	if [ -n "$default" ]; then
		printf '%s? %s %s(%s)%s: ' "$GREEN" "$label" "$DIM" "$default" "$RESET" >&2
		read -r value
		echo "${value:-$default}"
	else
		printf '%s? %s%s: ' "$GREEN" "$label" "$RESET" >&2
		read -r value
		echo "$value"
	fi
}

prompt_required() {
	local label="$1" hint="${2:-}" value=""
	while [ -z "$value" ]; do
		if [ -n "$hint" ]; then
			printf '%s? %s %s(%s)%s: ' "$GREEN" "$label" "$DIM" "$hint" "$RESET" >&2
		else
			printf '%s? %s%s: ' "$GREEN" "$label" "$RESET" >&2
		fi
		read -r value
		[ -z "$value" ] && echo "${DIM}  required${RESET}" >&2
	done
	echo "$value"
}

slugify() {
	echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g'
}

echo
echo "${BOLD}${GREEN}pak${RESET}${BOLD} new package${RESET}"
echo "${DIM}build a packages/<slug>/{package.yml,package.pak} pair${RESET}"
echo

name=$(prompt_required "package name")
slug=$(slugify "$(prompt "slug" "$(slugify "$name")")")

if [ -d "$PACKAGES_DIR/$slug" ]; then
	echo "${DIM}packages/$slug already exists, aborting${RESET}"
	exit 1
fi

version=$(prompt "version" "0.1.0")
description=$(prompt "description")
homepage=$(prompt "homepage url")
license=$(prompt "license" "MIT")
maintainer=$(prompt_required "maintainer" "the upstream project's maintainer, not you")
deps_raw=$(prompt "dependencies, comma separated")

cc=$(prompt "CC (compiler, blank if none)")
src=$(prompt "SRC (source repo url)" "$homepage")
bin=$(prompt "BIN (built binary path)" "./$slug")
lib=$(prompt "LIB (built lib path, 0 if none)" "0")
install_bin=$(prompt "INSTALL_BIN" "y")
default_install_lib="n"
[ "$lib" != "0" ] && default_install_lib="y"
install_lib=$(prompt "INSTALL_LIB" "$default_install_lib")

echo "${DIM}BUILD_SCRIPT commands, one per line, blank line to finish${RESET}"
build_lines=()
while true; do
	read -r -p "  " line
	[ -z "$line" ] && break
	build_lines+=("$line")
done
[ ${#build_lines[@]} -eq 0 ] && build_lines=("true")

deps=()
IFS=',' read -ra raw_parts <<<"$deps_raw"
for part in "${raw_parts[@]}"; do
	trimmed=$(echo "$part" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')
	[ -n "$trimmed" ] && deps+=("$trimmed")
done

mkdir -p "$PACKAGES_DIR/$slug"

{
	echo "name: $name"
	echo "slug: $slug"
	echo "version: $version"
	echo "description: $description"
	echo "homepage: $homepage"
	echo "license: $license"
	echo "maintainer: $maintainer"
	echo "dependencies:"
	for d in "${deps[@]}"; do
		echo "  - $d"
	done
} >"$PACKAGES_DIR/$slug/package.yml"

deps_pak=""
if [ ${#deps[@]} -gt 0 ]; then
	deps_pak="(${deps[*]})"
fi

{
	echo "CC=$cc"
	echo "SRC=$src"
	echo "DEPENDENCIES=$deps_pak"
	echo "BUILDDIR=/tmp/pak/imports/$slug"
	echo "BIN=$bin"
	echo "LIB=$lib"
	echo "INSTALL_BIN=$install_bin"
	echo "INSTALL_LIB=$install_lib"
	echo "BUILD_SCRIPT=("
	for l in "${build_lines[@]}"; do
		echo "    $l"
	done
	echo ")"
} >"$PACKAGES_DIR/$slug/package.pak"

echo
echo "${GREEN}created${RESET} packages/$slug/package.yml and package.pak"
