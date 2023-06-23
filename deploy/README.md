# CHT Core Kubernetes Deployment

## Introduction

This guide walks you through the process of deploying the Community Health Toolkit (CHT) Core application on a Kubernetes cluster. The deployment process utilizes a set of scripts and Helm charts for a simplified deployment experience.

The primary script, `deploy-cht`, automatically installs the required Python packages and initiates the deployment of CHT Core on your Kubernetes cluster.

## Prerequisites

This script is set to install all the necessary prerequisites.

**Note:** The first run of the script may take longer due to downloading and installing necessary packages.

## Values Configuration

Before running the `deploy-cht` script, you need to provide values in the `values.yaml` file. Here is an explanation of the values you need to replace:

- `project_name`: Replace `<your-project-name>` with your preferred project name.
- `namespace`: Replace `"cht-dev-namespace"` with the desired namespace for the deployment.
- `chtversion`: The version number of the CHT Core.
- `couchdb.password`: Replace `<password-value>` with your preferred password for CouchDB.
- `couchdb.secret`: Replace `<secret-value>` with your preferred secret for CouchDB.
- `couchdb.user`: Replace `<user-name>` with your preferred user name for CouchDB.
- `couchdb.uuid`: Replace `<uuid-value>` with the UUID of your CouchDB.
- `clusteredCouch.noOfCouchDBNodes`: The number of CouchDB nodes in your cluster.
- `toleration`: This is for the CouchDB pods. It's best not to change this unless you know what you're doing.
- `ingress`: Configuration for ingress including annotations, group name, tags, certificate and host.
- `environment`: Environment for the deployment. Can be "local" for local deployments using k3d/k3s or "remote" for remote deployments - remote kubernetes cluster (e.g. EKS)
- `local.diskPath`: If the environment is set to "local", replace `"/var/lib/couchdb"` with your desired disk path for local storage.

## Running the Script

To initiate the deployment process, you need to run the `deploy-cht` script with the `-f` flag followed by the path to your `values.yaml` file, like so:

```bash
./deploy-cht -f <path-to-your-values.yaml>
```

The script will then install the necessary Python packages, read your values.yaml file, and initiate the deployment process.

## Troubleshooting

If the deployments are not created as expected, check the logs for any errors. If the issue is related to missing deployments, confirm that the correct number of CouchDB nodes is specified in the values.yaml file for example.

During the course of using or managing your CHT installation, you may encounter situations where things are not working as expected. These scripts provide a means to inspect the status of your installation and gather information about its configuration and behavior. Here's when to use which:

## view-logs <namespace> <deployment>
    
    Use this command when you want to check the logs of a specific deployment. This could be useful when you have identified a specific service or component that is not behaving correctly, and you want to inspect its runtime logs for error messages or other diagnostic information.

    Example usage: 
    
    ```bash
    ./view-logs cht-dev-namespace cht-couchdb-1
    ```

## list-deployments <namespace>
    
    Use this command to list all the deployments in a specific namespace. This is useful when you want to see what deployments are running and check their status.

    Example usage: 
    
    ```bash 
    ./list-deployments cht-dev-namespace
    ```

## list-all-resources <namespace>
    
    This command provides a comprehensive view of all resources in a specific namespace, including services, pods, deployments etc. Use this when you want to get an overview of everything that's running in a particular namespace.

    Example usage: 
    
    ```bash 
    ./list-all-resources cht-dev-namespace
    ```

## describe-deployment <namespace> <deployment>
    
    Use this command to get a detailed description of a specific deployment. This could be useful when you want to inspect the configuration, status and events related to a specific deployment.

    Example usage: 
    
    ```bash
    ./describe-deployment cht-dev-namespace cht-couchdb-1
    ```

Keep in mind that you will need to replace cht-dev-namespace and cht-couchdb-1 with your specific namespace and deployment names.
