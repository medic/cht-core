#!/bin/bash

if [ "$#" -ne 1 ]
then
  echo "Usage: curl_api_info.sh <instance_name>"
  echo "ex: curl_api_info.sh https://localhost"
  exit 1
fi

#Requires jq
echo Begin Checking $1/api/info
version=$(curl -s $1/api/info -k  | jq .version -r)

while [ "$version" != 0.1.0 ]
do
version=$(curl -s $1/api/info -k  | jq .version -r)
sleep 10
echo sleeping again. Version is $version
done

echo Done! Api Is up