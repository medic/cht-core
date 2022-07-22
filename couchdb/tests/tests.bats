setup() {
    load '/opt/bats-support/load'
    load '/opt/bats-assert/load'
    # get the containing directory of this file
    # use $BATS_TEST_FILENAME instead of ${BASH_SOURCE[0]} or $0,
    # as those will point to the bats executable's location or the preprocessed file respectively
    DIR="$( cd "$( dirname "$BATS_TEST_FILENAME" )" >/dev/null 2>&1 && pwd )"
    # make executables in  the base directory visible to PATH
    PATH="$DIR/../../:$PATH"
    export WAIT_THRESHOLD=1
    export SLEEP_SECONDS=1
    export COUCHDB_USER="admin"
    export COUCHDB_PASSWORD="password"
    export COUCHDB_URL=http://$COUCHDB_USER:$COUCHDB_PASSWORD@$SVC_NAME:5984

}

@test "cluster membership shows all nodes" {
    run /app/set-up-cluster.sh check_cluster_membership
    assert_output --partial '{"all_nodes":["couchdb@couchdb.1","couchdb@couchdb.2","couchdb@couchdb.3"],"cluster_nodes":["couchdb@couchdb.1","couchdb@couchdb.2","couchdb@couchdb.3"]}'
}


@test "cluster set up state shows finshed" {
    run /app/set-up-cluster.sh verify_cluster_setup
    assert_output --partial '{"state":"cluster_finished"}'
}


@test "couchdb1 node is available" {
    # couchdb1 is mapped to port 5985 in the haproxy config
    run curl -s GET http://$COUCHDB_USER:$COUCHDB_PASSWORD@couchdb.1:5984/_up

    assert_output --partial '"status":"ok"'
}

@test "couchdb2 node is available" {
    # couchdb2 is mapped to port 5986 in the haproxy config
    run curl -s GET http://$COUCHDB_USER:$COUCHDB_PASSWORD@couchdb.2:5984/_up

    assert_output --partial '"status":"ok"'
}

@test "couchdb3 node is available" {
    # couchdb3 is mapped to service couchdb.3 in the test docker compose template
    run curl -s GET http://$COUCHDB_USER:$COUCHDB_PASSWORD@couchdb.3:5984/_up

    assert_output --partial '"status":"ok"'
}

@test "data inserted on one couchb can be retrieved from a peer" {
    local id=$(< /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-32};echo;)
    run curl -s -X PUT http://$COUCHDB_USER:$COUCHDB_PASSWORD@couchdb.1:5984/tests
    run curl -s -X PUT http://$COUCHDB_USER:$COUCHDB_PASSWORD@couchdb.2:5984/tests/$id -d '{"Name": "Test Cluster"}'
    run curl -s -X GET http://$COUCHDB_USER:$COUCHDB_PASSWORD@couchdb.3:5984/tests/$id
    assert_output --partial '"Test Cluster"'
}
