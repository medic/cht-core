###############################################################################
#
# Tests to validate output of generate.sh
#
# If you recently made updates with error pages see readme in that folder
#
###############################################################################
setup() {
	load 'test_helper/bats-support/load' # this is required by bats-assert
	load 'test_helper/bats-assert/load'

	set -eu -o pipefail

	DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)"
	TMP_WORK_DIR="$(mktemp -d)"

	ACTUAL_ERRORS_DIR="$DIR/../nginx_error_pages"
	TMP_ERRORS_DIR="$TMP_WORK_DIR/nginx_error_pages"

	mkdir "$TMP_ERRORS_DIR"
	cp "$ACTUAL_ERRORS_DIR"/{generate.sh,template.html,template.json} "$TMP_ERRORS_DIR"
}

teardown() {
	[[ -d "$TMP_WORK_DIR" ]] && rm -rf "$TMP_WORK_DIR"
}

[[ -n "${DEBUG_BATS:-}" ]] && set -x

@test "errors/generate.sh should be possible to run" {
	run "$TMP_ERRORS_DIR/generate.sh"
	assert_success
}

@test "correct number of error files" {
	"$TMP_ERRORS_DIR/generate.sh" >/dev/null
	assert_equal \
		"$(find "$ACTUAL_ERRORS_DIR"/*.{html,json} | wc -l)" \
		"$(find "$TMP_ERRORS_DIR"/*.{html,json} | wc -l)"
}

@test "file content should match for all error files	" {
	"$TMP_ERRORS_DIR/generate.sh" >/dev/null

	file_count=0
	for file in "$ACTUAL_ERRORS_DIR"/*.{html,json}; do
		filename="$(basename "$file")"
		assert_equal \
			"$(cat "$ACTUAL_ERRORS_DIR/$filename")" \
			"$(cat "$TMP_ERRORS_DIR/$filename")"
		file_count=$((file_count + 1))
	done
	[[ file_count -ge 2 ]]
}
