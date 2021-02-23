#!/bin/sh

# Auth to kubectl

https://github.com/medic/medic-infrastructure/tree/master/scripts/kubectl-authentication#mfa-authentication

# Get Pod
# TODO: how can we be sure to get the right pod?

POD_ID=$(kubectl --kubeconfig=/app/cluster01-kubeconfig.yml -n gamma-dev get pods)

# Get into the container 


kubectl --kubeconfig=/app/cluster01-kubeconfig.yml -n gamma-dev exec -it $POD_ID -- \
  cd /boot && ./svc-stop medic-sentinel && \
  ./svc-stop medic-api && \
  ./svc-stop medic-core && \
  ./svc-stop horticulturalist && \
  ./svc-stop medic-rdbms && \
  ./svc-stop medic-couch2pg &&\
  rm -rf /srv 

# Stop all services

kubectl -n gamma-dev delete pod $POD_ID
