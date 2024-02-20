#!/bin/bash

set -e
WAIT_THRESHOLD="${WAIT_THRESHOLD:-12}"
SLEEP_SECONDS="${SLEEP_SECONDS:-5}"

check_if_couchdb_cluster_is_ready() {
	wait_count=0
	until /app/set-up-cluster.sh verify_membership; do
		echo "Waiting for cht couchdb cluster to be set up" >&2
		wait_count=$((wait_count + 1))
		if [[ "$wait_count" -gt $WAIT_THRESHOLD ]]; then
			echo "Couchdb clustering failed" >&2
			exit 1
		fi
		sleep "$SLEEP_SECONDS"
	done

	echo "couchdb cluster is ready" >&2

}

case $TEST_MODE in

CLUSTERED)
	check_if_couchdb_cluster_is_ready
	bats /app/tests/tests.bats
	;;

*)

	echo "PLEASE SET THE TEST_MODE VARIABLE" >&2
	exit 1
	;;
esac
