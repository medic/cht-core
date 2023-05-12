#!/bin/bash
set -e

NODE_TLS_REJECT_UNAUTHORIZED=0
TAG=$1
sed -i '4s~^~'BUILD=$MARKET_URL_READ/$STAGING_SERVER/medic:medic:$TAG'\n\n~' prepare-ec2.sh

echo Triggering EC2 Run Instance Command and getting Instance ID

runInstance () {
  # --profile CA \ # for local runs
  echo $(aws ec2 run-instances \
    --image-id ami-0c3d8c5445511bd1d \
    --instance-type c5.2xlarge \
    --block-device-mappings file://block-device-mapping.json \
    --user-data file://$1 \
    --instance-initiated-shutdown-behavior terminate \
    --security-group-ids sg-0fa20cd785acec256 \
    --key-name cht-scalability-ca \
    --iam-instance-profile Arn=$SCALABILITY_ARN
    )
}

getInstanceId () {
  echo $(echo $1 | jq .Instances[0].InstanceId -r)
}

getPublicDnsName () {
  # --profile CA
  echo $(aws ec2 describe-instances --instance-ids "$1" | jq .Reservations[0].Instances[0].PublicDnsName -r)
}

waitForInstanceUp () {
  set +e # don't exit when /api/info doesn't return json
  echo Begin Checking $1/api/info is up
  version=""
  sleep_time=10

  until [ "$version" = 0.1.0 ]
  do
    echo Waiting for CHT to be up. Sleeping for $sleep_time.
    sleep $sleep_time
    version=$(curl -s $1/api/info -k -H 'Accept: application/json' | jq .version -r)
  done

  set -e
  echo Api Is up
}

seedData () {
  echo installing cht-conf
  npm install cht-conf

  echo Seeding data
  echo cht url is $1
  ./node_modules/.bin/cht --url="$1" --accept-self-signed-certs --force \
      csv-to-docs \
      upload-docs \
      create-users
}

waitForSentinel () {
  set +e
  sleep_time=30
  sentinel_queue_size="51"

  until [ "$sentinel_queue_size" -lt "50" ]
  do
  proc_seq=$(curl $1/medic-sentinel/_local/transitions-seq -s -k | jq .value -r)
  sentinel_queue_size=$(curl $1/medic/_changes?since=$proc_seq -s -k | jq '.results | length')
  echo Sentinel queue length is $sentinel_queue_size
  echo Sleeping again for $sleep_time
  sleep $sleep_time
  done

  set -e
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

instanceResponse=$(runInstance "prepare-ec2.sh")
instanceID=$(getInstanceId "$instanceResponse")
echo Instance id is "$instanceID"

getInstanceUrl

url=https://$PublicDnsName
waitForInstanceUp "$url"

MEDIC_CONF_URL='https://admin:medicScalability@'$PublicDnsName
seedData $MEDIC_CONF_URL
waitForSentinel $MEDIC_CONF_URL

sed -i '4s~^~'MEDIC_URL=$url'\n~' run_suite.sh
sed -i '4s~^~'S3_PATH=s3://medic-e2e/scalability/$TAG-$GITHUB_RUN_ID'\n~' run_suite.sh
sed -i '4s~^~'TAG=$TAG'\n~' run_suite.sh

echo Triggering EC2 Run Instance Command and getting Instance ID

jmeterInstanceResponse=$(runInstance "run_suite.sh")
jmeterInstanceID=$(getInstanceId "$jmeterInstanceResponse")
echo jmeter Instance id is "$jmeterInstanceID"
