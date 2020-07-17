#!/bin/bash
#Requires jq

echo Starting Instance Request
SpotInstanceRequestId=$(aws ec2 request-spot-instances --spot-price '0.222' --instance-count 1 --type 'one-time' --launch-specification file://launch-specification.json --block-duration-minutes 60 | jq .SpotInstanceRequests[0].SpotInstanceRequestId -r)      
echo Getting Instance ID
instanceID=$(aws ec2 describe-spot-instance-requests --spot-instance-request-ids $SpotInstanceRequestId | jq .SpotInstanceRequests[0].InstanceId -r )
while [ "$instanceID" = null ]
do
sleep 5
instanceID=$(aws ec2 describe-spot-instance-requests --spot-instance-request-ids $SpotInstanceRequestId | jq .SpotInstanceRequests[0].InstanceId -r )
echo "Sleeping while waiting for instance ID to be setup."
echo Instance id is $instanceID
done 
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

echo "::set-env name=MEDIC_URL::$url"

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

echo installing medic-conf
npm install https://github.com/medic/medic-conf.git#307_force_arg

MEDIC_CONF_URL=${MEDIC_URL:0:8}medic:medicScalability@${MEDIC_URL:8}

cp -r ./csv ../../config/standard/

cd ../../config/standard/

echo Uploading settings and seeding data
echo medic-conf url is $MEDIC_CONF_URL
$(npm bin)/medic-conf
$(npm bin)/medic-conf --url=$MEDIC_CONF_URL --force upload-app-settings \
    convert-app-forms \
    convert-collect-forms \
    convert-contact-forms \
    delete-all-forms \
    upload-app-forms \
    upload-collect-forms \
    upload-contact-forms \
    upload-resources \
    upload-custom-translations  \
    csv-to-docs \
    upload-docs \
    create-users \

# sleep 360

# curl https://medic:medicScalability@$PublicDnsName/api/v1/upgrade -k -X POST -H "Content-Type: application/json" -d '{"build":{"namespace":"medic","application":"medic","version":"'$1'"}}'
