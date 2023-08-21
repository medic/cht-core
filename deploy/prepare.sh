#!/bin/bash

{
	echo -e "\u21B3 Check if helm is installed"
	if ! command -v helm &> /dev/null ; then
		echo "Helm not found. Installing...";
		if [[ "$OSTYPE" == "linux-gnu"* ]]; then
			curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
		elif [[ "$OSTYPE" == "darwin"* ]]; then
			brew install helm
		fi
	fi
} && {
	echo -e "\u21B3 Check if kubectl is installed"
	if ! command -v kubectl &> /dev/null ; then
		echo "kubectl not found. Installing...";
		if [[ "$OSTYPE" == "linux-gnu"* ]]; then
			curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
		elif [[ "$OSTYPE" == "darwin"* ]]; then
			curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
		fi
		chmod +x kubectl
		sudo mv kubectl /usr/local/bin/
	fi
} && {
	echo -e "\u21B3 Check if k3d is installed when environment is set to 'local'"
	if [ "$1" = "local" ]; then
		if ! command -v k3d &> /dev/null ; then
			echo "k3d not found. Installing...";
			if [[ "$OSTYPE" == "linux-gnu"* ]]; then
				curl -s https://raw.githubusercontent.com/rancher/k3d/main/install.sh | bash
			elif [[ "$OSTYPE" == "darwin"* ]]; then
				brew install k3d
			fi
		fi
	fi
} && {
	echo -e "\u21B3 Check if k3d cluster already exists"
	if ! k3d cluster list | grep -q 'k3s-default'; then
		echo "Creating k3d cluster..."
		k3d cluster create --port '443:443@loadbalancer'
	else
		echo "K3d cluster 'k3s-default' already exists. Skipping creation."
	fi
} && {
	echo -e "\u21B3 Check if nginx ingress controller is installed"
	if kubectl get pods -n ingress-nginx 2>&1 | grep -q 'No resources found in ingress-nginx namespace.' ; then
		echo "nginx ingress controller not found. Installing..."
		kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.0.0/deploy/static/provider/cloud/deploy.yaml

		# Wait for the ingress-nginx controller to be ready
		echo "Waiting for nginx ingress controller to be ready..."
		kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s
	else
		echo "nginx ingress controller already exists. Skipping installation."
	fi
}
