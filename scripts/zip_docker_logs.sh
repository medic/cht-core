#/bin/bash

##############################################3
# This script gathers logs for ALL containers
# running and outputs them into a zip file in
# your home directory here:
set -e
#       ~/.medic/cht-docker/support_logs
#
# Please remove the zip file when done.
# It may contain PII/PHI.
#
# Note - while this will work with CHT 3.x
# containers (Medic OS), it's main intent is
# to work with CHT 4.x.
##############################################3

echo "\nWait while the script gathers stats and logs about the CHT containers.
  Be patient, this might take a moment... "

log_directory="$HOME/.medic/support_logs"
date=$(date -Iseconds)
log_archive="$log_directory/cht-docker-logs-${date}.zip"
tmp=/tmp/cht-docker-log-tmp
mkdir -p "$log_directory"
mkdir -p "$tmp"
rm /tmp/cht-docker-log-tmp/*

docker stats --no-stream 1> ${tmp}/docker_stats.log
docker ps> ${tmp}/docker_ps.log
docker ps  --format '{{ .Names }}' | xargs -I % sh -c "docker logs %  > ${tmp}/%.log 2>&1"

cd /tmp/cht-docker-log-tmp
zip --quiet ${log_archive} *

rm /tmp/cht-docker-log-tmp/*

echo "\nDone!\n\nZip file here:\n\n  ${log_archive}\n"

echo "NOTE: Please remove the zip file when done.
  It may contain PII/PHI."
echo
