#!/bin/bash

# The subshell that HAProxy launches to run any external-check scripts is limited 
# to a set of pre-defined HAProxy environment variables. For our use-case,
# CouchDB's _membership endpoint is behind authentication, so we have to write credentials to a file,
# for the subshell to be able to poll the endpoint and function as our healthcheck.
# External Checks are bad practice, we should move this function to a separate Agent container.

USERNAME_FILE=/srv/storage/haproxy/passwd/username
PASSWORD_FILE=/srv/storage/haproxy/passwd/admin
CHECK_MEMBERSHIP=`/usr/bin/curl -s http://$(/bin/cat /srv/storage/haproxy/passwd/username):$(/bin/cat /srv/storage/haproxy/passwd/admin)@$HAPROXY_SERVER_ADDR:5984/_membership`
HEALTHCHECK=`echo $CHECK_MEMBERSHIP | /usr/bin/jq '.all_nodes == .cluster_nodes'`
CHECK_FOR_NULL=`echo $CHECK_MEMBERSHIP | /usr/bin/jq .'all_nodes'`

if [[ ! -z $CHECK_FOR_NULL ]] && [[ $HEALTHCHECK == true ]]
then
    exit 0
else
    echo "_Membership endpoint shows all nodes are not part of cluster."
    exit 1
fi