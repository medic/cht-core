#!/bin/bash
set -e -o pipefail

WAIT_THRESHOLD="${WAIT_THRESHOLD:-20}"
SLEEP_SECONDS="${SLEEP_SECONDS:-5}"
NODE_COUNT="${NODE_COUNT:-3}"
json_escaped_couchdb_password="${COUCHDB_PASSWORD//\\/\\\\}"
json_escaped_couchdb_password="${json_escaped_couchdb_password//\"/\\\"}"

verify_membership() {
	curl -fs -m5 -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://$SVC_NAME:5984/_membership" | jq -e ".all_nodes == .cluster_nodes and (.all_nodes | length) == $NODE_COUNT" >/dev/null
}

enable_cluster() {
	if verify_membership; then
		echo "Cluster already setup" >&2
	else
		curl -X POST -H "Content-Type: application/json" -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://$SVC_NAME:5984/_cluster_setup" \
			-d '{"action": "enable_cluster", "bind_address":"0.0.0.0", "username": "'"$COUCHDB_USER"'", "password":"'"$json_escaped_couchdb_password"'", "node_count":"'"$NODE_COUNT"'"}'
	fi
}

enable_cluster_on_remote_node() {
	curl -X POST -H "Content-Type: application/json" -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://$SVC_NAME:5984/_cluster_setup" \
		-d '{"action": "enable_cluster", "bind_address":"0.0.0.0", "username": "'"$COUCHDB_USER"'", "password":"'"$json_escaped_couchdb_password"'", "port": 5984, "node_count": "'"$NODE_COUNT"'", "remote_node": "'"$REMOTE_COUCHDB_NODE_FQDN"'", "remote_current_user": "'"$COUCHDB_USER"'", "remote_current_password": "'"$json_escaped_couchdb_password"'" }'
}

join_node_to_cluster() {
	curl -X POST -H "Content-Type: application/json" -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://$SVC_NAME:5984/_cluster_setup" \
		-d '{"action": "add_node", "host":"'"$REMOTE_COUCHDB_NODE_FQDN"'", "port":5984, "username": "'"$COUCHDB_USER"'", "password":"'"$json_escaped_couchdb_password"'"}'

}

complete_cluster_setup() {
	if verify_membership; then
		echo "Cluster Setup Already Finished"
	else
		curl -X POST -H "Content-Type: application/json" -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://$SVC_NAME:5984/_cluster_setup" \
			-d '{"action": "finish_cluster"}'
	fi
}

check_cluster_membership() {
	curl -s -m5 -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://$SVC_NAME:5984/_membership"
}

check_if_couchdb_is_ready() {
	if [ "$#" -lt 1 ]; then
		echo "Please provide a couchdb url end point" >&2
		exit 1
	fi

	COUCHDB_URL=$1
	wait_count=0
	until curl -fs -m5 --head --request GET -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "$COUCHDB_URL" | grep "200 OK" >/dev/null; do
		echo "Waiting for cht couchdb" >&2
		wait_count=$((wait_count + 1))
		if [[ "$wait_count" -gt $WAIT_THRESHOLD ]]; then
			echo "No couchdb end point Found at $COUCHDB_URL" >&2
			exit 1
		fi
		sleep "$SLEEP_SECONDS"
	done
	echo "couchdb is ready" >&2

}

add_peer_to_cluster() {
	peer=$1
	if check_cluster_membership | grep -q "$peer"; then
		echo "Node $peer is already in the cluster"
	else
		check_if_couchdb_is_ready "http://$peer:5984"
		enable_cluster_on_remote_node
		join_node_to_cluster
	fi
}

add_peers_to_cluster() {
	for PEER in ${CLUSTER_PEER_IPS//,/ }; do
		export REMOTE_COUCHDB_NODE_FQDN=$PEER
		add_peer_to_cluster "$PEER"
	done
	complete_cluster_setup
	check_cluster_membership
}

create_system_databases() {
	for db in _users _replicator _global_changes; do
		if ! curl -sf -X PUT -u "$COUCHDB_USER:$COUCHDB_PASSWORD" "http://$SVC_NAME:5984/$db" >/dev/null; then
			echo "ERROR: Failed to create system database '$db', continuing without creating database"
		fi
	done
}

main() {
	check_if_couchdb_is_ready "http://$SVC_NAME:5984"
	# only attempt clustering if CLUSTER_PEER_IPS environment variable is present.
	if [[ -n "${CLUSTER_PEER_IPS:-}" ]]; then
		enable_cluster
		add_peers_to_cluster
		create_system_databases
	fi
	# only attempt to setup initial databases if single node is used
	if [ -z "${CLUSTER_PEER_IPS:-}" ] && [ -z "${COUCHDB_SYNC_ADMINS_NODE:-}" ]; then
		create_system_databases
	fi
	# end process
	exit 1

}

# if no arguments are provided run the main method on a background thread (we do not want this to be the main thread since couch db has to be the main thread.)
if [ $# -eq 0 ]; then
	main &
else # run the requested argument.
	"$@"
fi
