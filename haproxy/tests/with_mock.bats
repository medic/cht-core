setup() {
	load 'test_helper/bats-support/load' # this is required by bats-assert
	load 'test_helper/bats-assert/load'

	set -eu -o pipefail
}

[[ -n "${DEBUG_BATS:-}" ]] && set -x

@test "should respond before timeout" {
	run timeout 15 bash -c "until curl -fksm5 http://127.0.0.1:5984; do sleep 0.1; done"
	assert_success
}

@test "should receive response from couchdb" {
	run bash -c "curl -fksm5 http://127.0.0.1:5984/ | jq .couchdb"
	assert_success
	assert_output '"Welcome to mock-couchdb"'
}

@test "should receive 404 response if path doesn't exist" {
	run curl -Iksm5 http://127.0.0.1:5984/doesnotexist
	assert_line --partial --index 0 'HTTP/1.1 404 Not Found'
}

@test "should return json with on connection drop" {
	run bash -c "curl -ksm5 http://127.0.0.1:5984/error/drop | jq .error"
	assert_success
	assert_output '"503 Service Unavailable"'
}
