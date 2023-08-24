setup() {
	load 'test_helper/bats-support/load' # this is required by bats-assert
	load 'test_helper/bats-assert/load'

	set -eu -o pipefail
}

[[ -n "${DEBUG_BATS:-}" ]] && set -x

@test "API should respond before timeout" {
	run timeout 15 bash -c "until curl -fksm5 https://localhost:1443; do sleep 0.1; done"
	assert_success
}

@test "HTTP request should redirect to HTTPS" {
	run curl -Ifsm5 --http1.1 http://localhost:1080 
	assert_success
	assert_line --partial --index 0 'HTTP/1.1 301 Moved Permanently'
	assert_line --partial 'Location: https://localhost/'
}

@test "HTTP acme-challenge should not redirect" {
	run curl -Ism5 --http1.1 http://localhost:1080/.well-known/acme-challenge/
	assert_success
 	refute_line --index 0 'HTTP/1.1 301 Moved Permanently'
	assert_line --partial --index 0 'HTTP/1.1 404 Not Found'
}

@test "Should receive response from CHT api" {
	run curl -fksm5 --http1.1 https://localhost:1443/
	assert_success
	assert_output 'Hello from CHT api mock'

	run curl -fksm5 https://localhost:1443/somepath
	assert_success
	assert_output 'Test'
}

@test "Should work with http 1.1" {
	run curl -Iksm5 --http1.1 https://localhost:1443/doesnotexist
	assert_line --partial --index 0 'HTTP/1.1 404 Not Found'
}


@test "Should work with http 2" {
	run curl -Iksm5 --http2 https://localhost:1443/doesnotexist
	assert_line --partial --index 0 'HTTP/2 404'
	
}

@test "Should return 502 on connection drop" {
	run curl -iksm5 --http1.1 https://localhost:1443/error/drop
	assert_success
	assert_line --partial --index 0 'HTTP/1.1 502 Bad Gateway'
	assert_line '  <title>502 Bad Gateway</title>'
}

@test "Should return json with on connection drop with accept header" {
	run bash -c "curl -ksm5 -H 'Accept: application/json' https://localhost:1443/error/drop | jq .error"
	assert_success
	assert_output '"502 Bad Gateway"'
}
