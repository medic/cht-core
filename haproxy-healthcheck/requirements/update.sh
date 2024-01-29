#!/bin/bash
###############################################################################
#
#    ./update.sh
#
#  Script to lock the python package versions specified in {base,test}.txt to
#  its respective freeze file
#
###############################################################################

set -eu -o pipefail
unset IFS

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"

err() {
	echo >&2 "ERROR: $*"
	exit 1
}

get_extra() {
	case $1 in
	"base")
		echo ""
		return
		;;
	*)
		echo "[$1]"
		return
		;;
	esac
}

update_requirements() {
	echo "===== Updating requirements $1 ====="
	local VENV_DIR="$TEMPDIR/$1-venv"
	local FREEZE_FILE="$SCRIPT_DIR/$1-freeze.txt"
	local EXTRA_REQ
	EXTRA_REQ="$(get_extra "$1")"

	$PYTHON -m venv "$VENV_DIR"

	"$VENV_DIR/bin/pip" install "$SCRIPT_DIR/..$EXTRA_REQ"
	cat <<EOF >"$FREEZE_FILE"
##################################################
# Autogenerated file, do not update manually
# Instead update pyproject.toml and run update.sh
##################################################
EOF
	"$VENV_DIR/bin/pip" freeze --exclude=haproxy-healthcheck >>"$SCRIPT_DIR/$1-freeze.txt"

	echo "===== Finished updating $1 ====="
}

# Extract major.minor version e.g. "python 3.8.17" => "3.8"
PYTHON_VERSION="$(
	grep 'python ' "$SCRIPT_DIR/../.tool-versions" |
		head -n1 |
		sed 's/^python \(3\.[0-9]\{1,\}\)\.[0-9]\{1,\}$/\1/'
)"

[[ "$PYTHON_VERSION" =~ ^3\.[0-9]+$ ]] || PYTHON_VERSION=3

PYTHON="$(command -v "python$PYTHON_VERSION")" ||
	err "python$PYTHON_VERSION specified in .tool-versions not found"

TEMPDIR="$(mktemp -d)"
echo "Using temporary directory $TEMPDIR"
trap 'rm -rf $TEMPDIR' EXIT

update_requirements base
update_requirements test
