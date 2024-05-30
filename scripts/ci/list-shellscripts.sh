#!/bin/bash
set -eu -o pipefail
unset IFS

function filter_ignored_files {
	case $1 in
	# Ignore third party packages
	scripts/docker-helper/simple_curses.sh) ;;
	*/test_helper/bats-assert/*) ;;
	*/test_helper/bats-support/*) ;;
	# Return the rest
	*)
		echo "$1"
		;;
	esac
}

for f in $(git ls-files); do
	case $f in
	*.bats | *.sh | *.bash)
		filter_ignored_files "$f"
		;;
	*)
		# Check for shebang containing "bash" for scripts missing extension
		if head -n1 "$f" | grep -Eq '#!/(.)+bash'; then
			filter_ignored_files "$f"
		fi
		;;
	esac
done
