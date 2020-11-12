#!/bin/bash

# Add MEDIC_URL to script executing on ec2 init
echo $MEDIC_URL
echo $GITHUB_RUN_ID

sed -i '2s~^~'MEDIC_URL=$MEDIC_URL'\n~' run_suite.sh
sed -i '2s~^~'S3_PATH=s3://medic-e2e/scalability/$TAG_NAME-$GITHUB_RUN_ID'\n~' run_suite.sh
sed -i '2s~^~'TAG_NAME=$TAG_NAME'\n~' run_suite.sh
cat run_suite.sh
# base64 encode our script and set as value for UserDAta in launch-specification
jq --arg arn $SCALABILITY_ARN '.UserData = "'$(base64 run_suite.sh -w 0)'" | .IamInstanceProfile.Arn = $arn' launch-specification.json >> launch-specification-jmeter.json
cat launch-specification-jmeter.json
echo $(aws ec2 request-spot-instances --spot-price '0.90' --instance-count 1 --type 'one-time' --launch-specification file://launch-specification-jmeter.json --block-duration-minutes 60)