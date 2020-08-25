#!/bin/bash
#Requires jq
export NODE_TLS_REJECT_UNAUTHORIZED=0
#Base 64 encode the user-data script to start medic-os
jq '.UserData = "'$(base64 medic-os.sh -w 0)'"' launch-specification.json >> launch-specification-medic-os.json

echo Starting Instance Requests
SpotInstanceRequestId=$(aws ec2 request-spot-instances --spot-price '0.333' --instance-count 1 --type 'one-time' --launch-specification file://launch-specification-medic-os.json --block-duration-minutes 60 | jq .SpotInstanceRequests[0].SpotInstanceRequestId -r)      
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

MEDIC_CONF_URL='https://medic:medicScalability@'$PublicDnsName


cp -r ./csv ../../config/standard/

cd ../../config/standard/

echo installing pip
sudo apt-get -q install python-pip -y

echo installing pyxform
sudo python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic -q

echo installing medic-conf
# npm install medic-conf TEMP
npm install https://github.com/medic/medic-conf.git#master

sleep 10
# echo Uploading settings and seeding data
echo medic-conf url is $MEDIC_CONF_URL
$(npm bin)/medic-conf --url="$MEDIC_CONF_URL" --force --accept-self-signed-certs upload-app-settings \
    convert-app-forms \
    convert-collect-forms \
    convert-contact-forms \
    upload-app-forms \
    upload-collect-forms \
    upload-contact-forms \
    upload-resources \
    upload-custom-translations  \
    csv-to-docs \
    upload-docs \
    create-users \


echo "Generating attachments for all reports"
cd ../../scripts/generate-form-attachments/

npm ci
COUCH_URL="$MEDIC_CONF_URL/medic" npm run view

echo Sentinel is processing data. Sleeping immediately for 120 seconds
sleep 120

proc_seq=$(curl $MEDIC_CONF_URL/medic-sentinel/_local/sentinel-meta-data -s -k | jq .processed_seq -r)
current_leng=$(curl $MEDIC_CONF_URL/medic/_changes?since=$proc_seq -s -k | jq '.results | length')

until [ "$current_leng" -lt "50" ]
do
updated_proc_seq=$(curl $MEDIC_CONF_URL/medic-sentinel/_local/sentinel-meta-data -s -k | jq .processed_seq -r)
current_leng=$(curl $MEDIC_CONF_URL/medic/_changes?since=$updated_proc_seq -s -k | jq '.results | length')
echo New length is $current_leng
echo sleeping again for 120
sleep 120
echo
echo 
done

echo Sentinel has caught up.

ddocs=(medic medic-admin medic-client medic-conflicts medic-scripts medic-sms)

echo Getting pre stage sequence numbers
pre_update_seqs=()
echo medic-update-seq $(curl $MEDIC_CONF_URL/medic/ -s -k | jq .update_seq)
for ddoc in ${ddocs[@]}; do
echo $ddoc pre stage value $(curl $MEDIC_CONF_URL/medic/_design/$ddoc/_info -s -k | jq .view_index.update_seq -r)
pre_update_seqs+=($(curl $MEDIC_CONF_URL/medic/_design/$ddoc/_info -s -k | jq .view_index.update_seq -r))
done

echo staging updates
#TEMP curl $MEDIC_CONF_URL/api/v1/upgrade/stage -k -X POST -H "Content-Type: application/json" -d '{"build":{"namespace":"medic","application":"medic","version":"'$1'"}}'
curl $MEDIC_CONF_URL/api/v1/upgrade/stage -k -X POST -H "Content-Type: application/json" -d '{"build":{"namespace":"medic","application":"medic","version":"3.10.0-beta.1"}}'


staged=$(curl $MEDIC_CONF_URL/medic/horti-upgrade -s -k | jq .staging_complete -r)
echo $(curl $MEDIC_CONF_URL/medic/horti-upgrade -s -k | jq .staging_complete -r)
until [ "$staged" == "true" ]
do
staged=$(curl $MEDIC_CONF_URL/medic/horti-upgrade -s -k | jq .staging_complete -r)
sleep 2
echo "waiting for staging to complete"
done

post_stage=()
echo medic-update-seq $(curl $MEDIC_CONF_URL/medic/ -s -k | jq .update_seq)
for ddoc in ${ddocs[@]}; do
echo $ddoc post stage value $(curl $MEDIC_CONF_URL/medic/_design/$ddoc/_info -s -k | jq .view_index.update_seq -r)
post_stage+=($(curl $MEDIC_CONF_URL/medic/_design/$ddoc/_info -s -k | jq .view_index.update_seq -r))
done

echo Checking post stage sequences to pre stage
for i in ${!pre_update_seqs[@]}; do 
if [ ${pre_update_seqs[$i]} -ge ${post_stage[$i]} ]
then
echo "The sequence for ${ddocs[$i]} did not get updated. It should have been warmed."
echo "ending run"
exit 1
fi
done

echo Sequence numbers were greater. Completing upgrade
curl $MEDIC_CONF_URL/api/v1/upgrade/complete -k -X POST