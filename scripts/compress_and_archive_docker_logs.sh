#/bin/bash

##############################################3
# This script gathers logs for ALL containers
# running and outputs them into a tar file in
# your home directory here:
#
#       ~/.medic/cht-docker/support_logs
#
# Please remove the tar file when done.
# It may contain PII/PHI.
#
# Note - while this will work with CHT 3.x
# containers (Medic OS), it's main intent is
# to work with CHT 4.x.
##############################################3

set -e

echo
echo "Wait while the script gathers stats and logs about the CHT containers.
    Be patient, this might take a moment... ";echo

log_directory="$HOME/.medic/support_logs"
date=$(date -Iseconds | tr ":" .)
log_archive="$log_directory/cht-docker-logs-${date}.tar.gz"
tmp=/tmp/cht-docker-log-tmp
mkdir -p "$log_directory"
mkdir -p "$tmp"
rm -f /tmp/cht-docker-log-tmp/*

docker stats --no-stream 1> ${tmp}/docker_stats.log
docker ps> ${tmp}/docker_ps.log
docker ps  --format '{{ .Names }}' | xargs -I % sh -c "docker logs --since 24h %  > ${tmp}/%.log 2>&1"

cd /tmp/cht-docker-log-tmp
tar -czf ${log_archive} *

rm /tmp/cht-docker-log-tmp/*

echo "Done!";echo
echo "    ${log_archive}";echo
echo "NOTE: Please remove the file when done as it may contain PII/PHI.";echo
