#!/bin/bash
# Fail job when script errors
set -e
# Add MEDIC_URL to script executing on ec2 init
echo $MEDIC_URL
echo $GITHUB_RUN_ID

sed -i '2s~^~'MEDIC_URL=$MEDIC_URL'\n~' run_suite.sh
sed -i '2s~^~'S3_PATH=s3://medic-e2e/scalability/$TAG_NAME-$GITHUB_RUN_ID'\n~' run_suite.sh
sed -i '2s~^~'TAG_NAME=$TAG_NAME'\n~' run_suite.sh
source run_suite.sh

echo Triggering EC2 Run Instance Command and getting Instance ID
instanceID=$(aws ec2 run-instances --image-id ami-065ba2b6b298ed80f --instance-type c5.2xlarge --security-group-ids sg-0fa20cd785acec256 --block-device-mappings file://block-device-mapping.json --user-data file://run_suite.sh --instance-initiated-shutdown-behavior terminate --iam-instance-profile Arn=$SCALABILITY_ARN | jq .Instances[0].InstanceId -r )
echo Instance id is $instanceID
