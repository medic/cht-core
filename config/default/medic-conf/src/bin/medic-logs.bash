#!/bin/bash -eu

usage() {
	cat <<EOF
medic-logs
==========

Fetch logs from production Medic Mobile servers.

USAGE
	$0 <instance-name> <log-types...>

Accepted log types:

	api
	couchdb
	gardener
	nginx
	sentinel
EOF
}

if [[ $# = 0 ]]; then usage; exit 1; fi
if [[ "$1" = "--help" ]]; then usage; exit; fi
if [[ $# < 2 ]]; then usage; exit 1; fi

instanceName="$1"
shift

domain="${instanceName}.medicmobile.org"

localRoot="fetched-logs/${instanceName}"

while [[ $# > 0 ]]; do
	logType="$1"
	shift

	case "$logType" in
		nginx)     logPath="/var/log/medic-core/nginx";  realLogType=nginx    ;;

		gardener)  logPath="/var/log/gardener";          realLogType=gardener ;;
		api)       logPath="/var/log/gardener";          realLogType=gardener ;;
		medic-api) logPath="/var/log/gardener";          realLogType=gardener ;;
		sentinel)  logPath="/var/log/gardener";          realLogType=gardener ;;

		couch)     logPath="/var/log/medic-core/couchdb";realLogType=couchdb  ;;
		couchdb)   logPath="/var/log/medic-core/couchdb";realLogType=couchdb  ;;

		*) echo "ERROR: Cannot fetch logs of type: $logType"; exit 1 ;;
	esac

	localDir="${localRoot}/${realLogType}"
	mkdir -p "$localDir"

	echo "[logs:$logType] Fetching logs to ${localDir}..."
	rsync -az --progress -e 'ssh -p 33696' "vm@${domain}:${logPath}/*" "$localDir"

	echo "[logs:$logType] Decompressing logs..."
	(cd "$localDir" && find . -name \*.bz2 | xargs bzip2 -dk)

	echo "[logs:$logType] Completed.  Logs saved in: ${localDir}"
done
