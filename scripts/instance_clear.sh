#!/bin/bash

# Start the medic-cube container

docker-compose -f kubectl-authentication/docker-compose.yml up -d

# Check AWS is configured

if [ -z "${AWS_ACCESS_KEY_ID}" ] || [ -z "${AWS_SECRET_ACCESS_KEY}" ]; then
  echo "AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is undefined"
  exit 1
fi

# Select Instance

PS3='Please select an instance: '
options=("gamma.dev" "gamma-b.dev" "gamma-cht.dev" "Quit")
select opt in "${options[@]}"
do
    case $opt in
        "gamma.dev")
            instance_name="dev-gamma"
            break
            ;;
        "gamma-b.dev")
            instance_name="dev-gamma-b"
            break
            ;;
        "gamma-cht.dev")
            instance_name="dev-gamma-cht"
            break
            ;;
        "Quit")
            exit 0
            ;;
        *) echo "invalid option $REPLY";;
    esac
done


echo The instance to wipe is  $instance_name

# Get username and MFA token

echo -n AWS UserName: 
read -s aws_username
echo
echo -n AWS MFA Token: 
read -s aws_passcode
echo

# # Auth to kubectl

docker exec medic-kube bash -c ". aws-mfa-login $aws_username $aws_passcode;\
POD=\$(kubectl --kubeconfig=/app/cluster01-kubeconfig.yml -n gamma-dev get pods --selector=app=dev-gamma -o jsonpath='{.items[*].metadata.name}');\
echo \$POD;\
kubectl --kubeconfig=/app/cluster01-kubeconfig.yml -n gamma-dev exec \$POD -- bash -c 'cd /boot && \
 ./svc-stop medic-sentinel && \
  ./svc-stop medic-api && \
  ./svc-stop medic-core && \
  ./svc-stop horticulturalist && \
  ./svc-stop medic-rdbms && \
  ./svc-stop medic-couch2pg && \
  sudo rm -rf /srv '
kubectl --kubeconfig=/app/cluster01-kubeconfig.yml -n gamma-dev delete pod \$POD"