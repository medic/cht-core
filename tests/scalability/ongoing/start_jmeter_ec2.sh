#!/bin/bash
# Fail job when script errors
set -e

echo "$MEDIC_URL"
echo "$GITHUB_RUN_ID"

export S3_PATH=s3://medic-e2e/scalability/$TAG_NAME-$GITHUB_RUN_ID
export DATA_DIR=./data
export NODE_TLS_REJECT_UNAUTHORIZED=0

echo "Triggering EC2 Run Instance Command and getting Instance ID"
instanceID=$(aws ec2 run-instances \
  --image-id ami-065ba2b6b298ed80f \
  --instance-type c5.2xlarge \
  --security-group-ids sg-0fa20cd785acec256 \
  --block-device-mappings file://block-device-mapping.json \
  --user-data file://run.sh \
  --instance-initiated-shutdown-behavior terminate \
  --iam-instance-profile Arn="$SCALABILITY_ARN" \
  | jq .Instances[0].InstanceId -r)

echo "instance id is $instanceID"
