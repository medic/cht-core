setup() {
    load 'test_helper/bats-support/load'
    load 'test_helper/bats-assert/load'
    load 'test_helper/bats-shell-mock/bin/shellmock'
    # get the containing directory of this file
    # use $BATS_TEST_FILENAME instead of ${BASH_SOURCE[0]} or $0,
    # as those will point to the bats executable's location or the preprocessed file respectively
    DIR="$( cd "$( dirname "$BATS_TEST_FILENAME" )" >/dev/null 2>&1 && pwd )"
    # make executables in  the base directory visible to PATH
    PATH="$DIR/../../:$PATH"
    # set shell mock env
    source="$DIR/test_helper/bats-shell-mock/bin"
    export PATH=$source:$PATH
     #shellcheck
    . shellmock
    # set low wait thresholds to avoid waiting for long
    export WAIT_THRESHOLD=10
    export SLEEP_SECONDS=2
}
teardown()
{
    if [ -z "$TEST_FUNCTION" ]; then
        shellmock_clean
    fi
    if [ -d "$TEST_TEMP_DIR" ]; then
        rm -rf "$TEST_TEMP_DIR"
    fi
}


@test "entry point script can run" {
    run docker-entrypoint.sh  welcome_message
    assert_output --partial "Starting CHT API"
}

@test "Couchdb URL is created correctly" {
    run docker-entrypoint.sh get_couchdb_url
    assert_output --partial "http://cht:cht-password@couch:5984"
}

@test "system databases are created on a fresh system successfully" {
    run docker-entrypoint.sh create_system_databases
    [ "$output" != "Warning: Failed to created system database '_users'" ]
}


@test "Medic Couchdb Admin can be created" {
    run docker-entrypoint.sh create_couchdb_admin 'medic-api'
    assert_output --partial ""
}



@test "Couchdb Lockdown succeeds" {
    run docker-entrypoint.sh perform_couchdb_lockdown
    run docker-entrypoint.sh perform_couchdb_lockdown
    #do it twice to get the true response
    assert_output --partial "true"

}



@test "creating system databases again fails" {
    run docker-entrypoint.sh create_system_databases
     assert_output --partial "Warning: Failed to created system database"

}
