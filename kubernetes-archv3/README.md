# Kubernetes Deployment Files

This folder contains files to set up the CHT core App locally on Kubernetes. When run in Kubernetes, these files generate services that are needed to run the CHT core app.
The services share secrets through environment variables in the  `secrets.yml` file. Services discover each other through these variable. If you update the names of any of the resources be sure to update the same in the `secrets.yml` file lest the services will not discover each other.
Secrets in the `secrets.yml` file are base64 encoded. Be sure to encode them before adding them to the respective variable.
To encode a secret you can run a command similar to the one below.

`echo -n 'secret' | base64`

To decode a secret you can run a command similar to the one below.

`echo -n 'QWxhZGRpbjpvcGVuIHNlc2FtZQ==' | base64 --decode`

You can deploy these files in you local Kubernetes set up from docker desktop on MACO or using a Kubernetes engine like microk8s or k3s on Linux.

## Steps to run this set up in a local Kubernetes set up. 

1. Install a local Kubernetes engine like the one in  Docker desktop for MacOs or k3s for Linux steps shown below. 

```bash
# Install k3s 
curl -sfL https://get.k3s.io | sudo sh -

# Export the default k8s kubeconfig into your shell. This is a very important step as it enables you to be able to authenticate through the cluster and be able to run commands. 

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

#check to make sure everything is running by running a sample command. 
kubectl get nodes

```

2. Create a namespace under which you will run your resources. Namespaces are logical units that you can use to group similar resources. This makes resource discovery easier for both the services themselves and the Kubernetes administrators.

`kubectl create namespace cht`

3. Deploy the resources using the deployment files. Be sure provide to correct path to the folder that contains your deployment files.

`kubectl apply -f path/to/k8s-arcv3/folder`

 At first launch, the services will take some time to pull the necessary containers and to create the required volumes to run the cht instance. You will need to be a little patient till this is done. You can monitor the progress of the install through k8s commands some of which are listed below. 

 ```bash
 # Check to see if the persistent volume claims have been created. These are used by the CouchDB container to store data
 
 kubectl -n cht get pvc

 # check to see pod status. 
  
  kubectl -n cht get pods

  # Inspect a specific pod to see the status 

  kubectl -n cht describe pod pod-identifier
  #e.g 
  kubectl -n cht describe pod dev-v3-couchdb-85cdbd6b8f-cmm5q

  # Read logs from a pod.
  kubectl -n cht  logs dev-v3-couchdb-85cdbd6b8f-cmm5q


  # Enter the shell of one of the pods and run a bash command

  kubectl -n cht exec -it dev-v3-horticulturalist-758c566589-vwr5p -- /bin/bash
    
  bash-5.0# printenv

 ```

4. Once the services have been created you can access the api output on your local machine by first discovering the IP of your host node and entering it's URL in your browser. https://host-ip:31000/
To get your host ip please run.

`kubectl get services --namespace kube-system traefik --output jsonpath='{.status.loadBalancer.ingress[0].ip}`
