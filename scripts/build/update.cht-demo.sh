#!/bin/bash

set -eu -o pipefail
STAGING='https://staging.dev.medicmobile.org/_couch/builds_4'
TAG_VERSION=$(curl -s "${STAGING}"/_design/builds/_view/releases\?limit=1\&descending=true |  tr -d \\n | grep -o 'medic:medic:[0-9\.]*' | cut -f3 -d:)
NAMESPACE="demo-cht"

# check to make sure it's at least X.Y.Z format 
if ! [[ "$TAG_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version \"$TAG_VERSION\" isn't SemVer, exiting"
  exit 1
fi

# prompt user if they're ready to continue
echo "
Before proceeding be sure :
 - you're logged into AWS with the /eks-aws-mfa-login script
 - you have access to the ${NAMESPACE} namespace in EKS
 - you have kubectl installed and in your path

Are you ready to push version ${TAG_VERSION} of the CHT to the Demo instance (demo-cht.dev.medicmobile.org)?

(y/N)"
read -r -p " " yn
case "${yn}" in
  [yY] ) ;;
  *) echo "aborted"; exit 1 ;;
esac

# switch to dev cluster and update images
kubectl config use-context arn:aws:eks:eu-west-2:720541322708:cluster/dev-cht-eks
kubectl -n $NAMESPACE set image deployment/cht-api cht-api=public.ecr.aws/medic/cht-api:$TAG_VERSION
kubectl -n $NAMESPACE set image deployment/cht-couchdb cht-couchdb=public.ecr.aws/medic/cht-couchdb:$TAG_VERSION
kubectl -n $NAMESPACE set image deployment/cht-haproxy cht-haproxy=public.ecr.aws/medic/cht-haproxy:$TAG_VERSION
kubectl -n $NAMESPACE set image deployment/cht-haproxy-healthcheck cht-haproxy-healthcheck=public.ecr.aws/medic/cht-haproxy-healthcheck:$TAG_VERSION
kubectl -n $NAMESPACE set image deployment/cht-sentinel cht-sentinel=public.ecr.aws/medic/cht-sentinel:$TAG_VERSION
