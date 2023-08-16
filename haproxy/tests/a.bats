setup() {
	load 'test_helper/bats-support/load' # this is required by bats-assert
	load 'test_helper/bats-assert/load'

	set -eu -o pipefail
}

[[ -n "${DEBUG_BATS:-}" ]] && set -x

@test "HTTP acme-challenge should not redirect" {
	run curl -Ism5 http://cht-nginx:80/.well-known/acme-challenge/
	assert_success
 	refute_line --index 0 'HTTP/1.1 301 Moved Permanently'
	assert_line --partial --index 0 'HTTP/1.1 404 Not Found'
}

