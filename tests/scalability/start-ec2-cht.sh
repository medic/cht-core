#!/bin/bash
set -e

TAG=$1
sed -i '4s~^~'BUILD="$MARKET_URL_READ"/"$STAGING_SERVER"/medic:medic:"$TAG"'\n\n~' prepare-ec2.sh

echo Triggering EC2 Run Instance Command and getting Instance ID

waitForBuildAvailable() {
  until [ "$(curl -s -w '%{http_code}' -o /dev/null "$MARKET_URL_READ/$STAGING_SERVER/medic:medic:$TAG")" -eq 200 ]
  do
    echo Waiting for CHT build to be available. Sleeping for 30.
    sleep 30
  done
}

runInstance () {
  # --profile CA \ # for local runs
  aws ec2 run-instances \
    --image-id ami-0c0a551d0459e9d39 \
    --instance-type c5.2xlarge \
    --block-device-mappings file://block-device-mapping.json \
    --user-data file://"$1" \
    --instance-initiated-shutdown-behavior terminate \
    --security-group-ids sg-0fa20cd785acec256 \
    --key-name cht-scalability-ca \
    --iam-instance-profile Arn="$SCALABILITY_ARN"
    # get output of user-data script from /var/log/cloud-init-output.log
}

getInstanceId () {
  echo "$1" | jq .Instances[0].InstanceId -r
}

getPublicDnsName () {
  # --profile CA
  aws ec2 describe-instances --instance-ids "$1" | jq .Reservations[0].Instances[0].PublicDnsName -r
}

waitForInstanceUp () {
  set +e # don't exit when /api/info doesn't return json
  echo Begin Checking "$1"/api/info is up
  version=""
  sleep_time=10

  until [ "$version" = 0.1.0 ]
  do
    echo Waiting for CHT to be up. Sleeping for $sleep_time.
    sleep $sleep_time
    version=$(curl -s "$1"/api/info -k -H 'Accept: application/json' | jq .version -r)
  done

  set -e
  echo Api Is up
}

seedData () {
  echo installing cht-conf
  npm install cht-conf

  echo Seeding data
  echo cht url is "$1"
  ./node_modules/.bin/cht --url="$1" --accept-self-signed-certs --force \
      csv-to-docs \
      upload-docs \
      create-users
}

forwardSentinelSeq () {
  local interval="${2:-15}"  # Default to 30 seconds if not specified

  while true; do
    active_tasks=$(curl -sf -k "$1/_active_tasks" | jq '. | length')

    # Check if the request was successful and got a number
    if [ "$active_tasks" -eq 0 ]; then
      echo "view indexing complete"
      break
    else
      echo "Found $active_tasks active tasks. Waiting $interval seconds before next check..."
      sleep "$interval"
    fi
  done

  last_seq=$(curl -k -sf "$1/medic/_changes?limit=1&descending=true" | jq '.last_seq')
  # Update sentinel queue
  sentinel_queue=$(curl -sf -k "$1/medic-sentinel/_local/transitions-seq" | jq --arg seq "$last_seq" '.value=$seq')
  # Put the updated sequence
  curl -k -sf -X PUT "$1/medic-sentinel/_local/transitions-seq" \
    -H "Content-Type: application/json" \
    --data "$sentinel_queue"

  sleep 30
  echo Sentinel has caught up.
}

PublicDnsName=""
getInstanceUrl () {
  echo Getting PublicDnsName
  PublicDnsName=$(getPublicDnsName "$instanceID")
  echo DNS is "$PublicDnsName"

  if [ -z "$PublicDnsName" ]
  then
  echo dns name not setting. Trying to get again
  PublicDnsName=$(getPublicDnsName "$instanceID")
  fi

  if [ -z "$PublicDnsName" ]
  then
  echo Did not get public dns name. Exiting now.
  exit 1
  fi
}

waitForBuildAvailable
instanceResponse=$(runInstance "prepare-ec2.sh")
instanceID=$(getInstanceId "$instanceResponse")
echo Instance id is "$instanceID"

getInstanceUrl

url=https://$PublicDnsName
waitForInstanceUp "$url"

MEDIC_CONF_URL='https://admin:medicScalability@'$PublicDnsName
seedData "$MEDIC_CONF_URL"
forwardSentinelSeq "$MEDIC_CONF_URL"

sed -i '4s~^~'MEDIC_URL="$url"'\n~' run_suite.sh
sed -i '4s~^~'MEDIC_URL_AUTH="$MEDIC_CONF_URL"'\n~' run_suite.sh
sed -i '4s~^~'TAG="$TAG"'\n~' run_suite.sh
sed -i '4s~^~'DATA_PATH="$TAG-$GITHUB_RUN_ID"'\n~' run_suite.sh
sed -i '4s~^~'GH_TOKEN="$SCALABILITY_RESULTS_TOKEN"'\n~' run_suite.sh

echo Triggering EC2 Run Instance Command and getting Instance ID

jmeterInstanceResponse=$(runInstance "run_suite.sh")
jmeterInstanceID=$(getInstanceId "$jmeterInstanceResponse")
echo jmeter Instance id is "$jmeterInstanceID"
