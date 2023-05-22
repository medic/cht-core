# CHT on Kubernetes - Setup a Distributed/Clustered CHT locally

## See it in Action

After `cd`ing into this directory run the setup scripts:

`./deploy-cht` if you are on Linux

`./deploy-cht-os-x` if you are on OS-X

To see things have been deployed check:

`kubectl -n cht-dev-namespace get all`

This will give you all the resources deployed under 

## How it works

The above scripts use `k3d` (A dockerized version of `k3s`). For actual deployments, using `k3s` is recommended. Other scripts that do that will be provided.

