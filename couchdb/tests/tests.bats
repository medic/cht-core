setup() {
	load 'test_helper/bats-support/load'
	load 'test_helper/bats-assert/load'

	# get the containing directory of this file
	# use $BATS_TEST_FILENAME instead of ${BASH_SOURCE[0]} or $0,
	# as those will point to the bats executable's location or the preprocessed file respectively
	DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)"

	export WAIT_THRESHOLD=1
	export SLEEP_SECONDS=1
}

@test "cluster membership shows all nodes" {
	run "$DIR"/../set-up-cluster.sh check_cluster_membership
	assert_output --partial '{"all_nodes":["couchdb@couchdb.1","couchdb@couchdb.2","couchdb@couchdb.3"],"cluster_nodes":["couchdb@couchdb.1","couchdb@couchdb.2","couchdb@couchdb.3"]}'
}

@test "couchdb1 node is available" {
	run curl -fs -m5 -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://couchdb.1:5984/_up"

	assert_output --partial '"status":"ok"'
}

@test "couchdb2 node is available" {
	run curl -fs -m5 -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://couchdb.2:5984/_up"

	assert_output --partial '"status":"ok"'
}

@test "couchdb3 node is available" {
	run curl -fs -m5 -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://couchdb.3:5984/_up"

	assert_output --partial '"status":"ok"'
}

@test "data inserted on one couchb can be retrieved from a peer" {
	local id
	id=$(
		</dev/urandom tr -dc _A-Z-a-z-0-9 | head -c"${1:-32}"
		echo
	)
	run curl -s -X PUT -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://couchdb.1:5984/tests"
	run curl -s -X PUT -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://couchdb.2:5984/tests/$id" -d '{"Name": "Test Cluster"}'
	run curl -s -X GET -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://couchdb.3:5984/tests/$id"
	assert_output --partial '"Test Cluster"'
}
