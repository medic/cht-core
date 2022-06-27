#!/bin/bash
#Requires jq
export NODE_TLS_REJECT_UNAUTHORIZED=0

echo Triggering EC2 Run Instance Command and getting Instance ID
instanceID=$(aws ec2 run-instances --image-id ami-065ba2b6b298ed80f --instance-type c5.2xlarge --security-group-ids sg-0fa20cd785acec256 --block-device-mappings file://block-device-mapping.json --user-data file://medic-os.sh --instance-initiated-shutdown-behavior terminate | jq .Instances[0].InstanceId -r )
echo Instance id is $instanceID

echo Getting PublicDnsName
PublicDnsName=$(aws ec2 describe-instances --instance-ids $instanceID | jq .Reservations[0].Instances[0].PublicDnsName -r)
echo DNS is $PublicDnsName

if [ -z "$PublicDnsName" ]
then
echo dns name not setting. Trying to get again
PublicDnsName=$(aws ec2 describe-instances --instance-ids $instanceID | jq .Reservations[0].Instances[0].PublicDnsName -r)
fi

if [ -z "$PublicDnsName" ]
then
echo Did not get public dns name. Exiting now.
exit 1
fi

url=https://$PublicDnsName

echo "MEDIC_URL=$url" >> $GITHUB_ENV

echo Begin Checking $url/api/info is up
version=$(curl -s $url/api/info -k  | jq .version -r)

until [ "$version" = 0.1.0 ]
do
version=$(curl -s $url/api/info -k  | jq .version -r)
sleep 10
echo Sleeping again. Version is $version
echo
echo
done

echo Api Is up

INSTANCE_URL='https://medic:medicScalability@'$PublicDnsName

sleep 10

echo staging updates
curl $INSTANCE_URL/api/v1/upgrade/stage -k -X POST -H "Content-Type: application/json" -d '{"build":{"namespace":"medic","application":"medic","version":"'$1'"}}'

staged=$(curl $INSTANCE_URL/medic/horti-upgrade -s -k | jq .staging_complete -r)
echo $(curl $INSTANCE_URL/medic/horti-upgrade -s -k | jq .staging_complete -r)
until [ "$staged" == "true" ]
do
staged=$(curl $INSTANCE_URL/medic/horti-upgrade -s -k | jq .staging_complete -r)
sleep 60
echo "waiting for staging to complete"
done
curl $INSTANCE_URL/api/v1/upgrade/complete -k -X POST

sleep 10
