#!/usr/bin/env bash

set -eu

selectedProject=

# can pass a project .env file as argument
if [[ -n "${1-}" ]]; then
	if [[ -f "$1" ]]; then
		selectedProject=$(echo "$1" | sed "s/\.\///" | sed "s/\.env//")
	else
		echo "File $1 doesnt exist"
	fi
fi

if [[ -z "$selectedProject" ]]; then
	projects=$(find . -name "*.env" -type f | sed "s/\.\///" | sed "s/\.env//")

	if [[ -z "$projects" ]]; then
		echo 'No project found, follow the prompts to create a project .env file.'
	fi

	read -p "Would you like to initialize a new project [y/N]? " yn
	case $yn in
	[Yy]*)
		projectName=
		while [[ -z "$projectName" ]]; do
			read -p "How do you want to name the project? " projectName

      projectName="${projectName//[^[:alnum:]]/_}"
      projectName=$(echo $projectName | tr '[:upper:]' '[:lower:]')
			if test -f "./$projectName.env"; then
				echo "./$projectName.env already exists"
				projectName=
			fi
		done

		homeDir="$HOME/.medic/cht-docker/$projectName-dir"
		touch "./$projectName.env"
		echo "NGINX_HTTP_PORT=8080" >>"./$projectName.env"
		echo "NGINX_HTTPS_PORT=8443" >>"./$projectName.env"
		echo "COUCHDB_USER=medic" >>"./$projectName.env"
		echo "COUCHDB_PASSWORD=password" >>"./$projectName.env"
		echo "CHT_COMPOSE_PROJECT_NAME=$projectName" >>"./$projectName.env"
		echo "DOCKER_CONFIG_PATH=$homeDir" >>"./$projectName.env"
		echo "COUCHDB_SECRET=$(openssl rand -hex 16)" >>"./$projectName.env"
		echo "COUCHDB_UUID=$(openssl rand -hex 16)" >>"./$projectName.env"
		echo "COUCHDB_DATA=$homeDir/couch" >>"./$projectName.env"
		echo "CHT_COMPOSE_PATH=$homeDir" >>"./$projectName.env"
		echo "CHT_NETWORK=$projectName-cht-net" >>"./$projectName.env"
		projects=$(find . -name "*.env" -type f | sed "s/\.\///" | sed "s/\.env//")
		;;
	esac

  envCount=$(ls *.env | wc -l)
  if [ "$envCount" -gt 0 ]; then
    while [[ -z "$selectedProject" ]]; do
      echo "Which project do you want to use?"
      select project in $projects; do
        selectedProject=$project
        homeDir="$HOME/.medic/cht-docker/$selectedProject-dir"
        break
      done
    done
  else
    echo ""
    echo "No projects found, please initialize a new one."
    echo ""
    exit 1
  fi
fi

mkdir -p "$homeDir/couch"
curl -s -o "$homeDir/upgrade-service.yml" \
  https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml
curl -s -o "$homeDir/cht-core.yml" \
  https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:master/docker-compose/cht-core.yml
curl -s -o "$homeDir/couchdb.yml" \
  https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:master/docker-compose/cht-couchdb.yml

# shellcheck disable=SC1090
source "./$selectedProject.env"

echo ""
docker-compose --env-file "./$selectedProject.env" --file "$homeDir/upgrade-service.yml" up --detach

set +e
echo "Starting project \"${selectedProject}\". First run takes a while. Will try for up to five minutes..." | tr -d '\n'
isNginxRunning=$(docker inspect --format="{{.State.Running}}" "${selectedProject}_nginx_1" 2>/dev/null)
isUpgradeRunning=$(docker inspect --format="{{.State.Running}}" "${selectedProject}-dir-cht-upgrade-service-1" 2>/dev/null)
i=0
while [[ "$isNginxRunning" != "true" ]]; do
  if [[ $i -gt 300 ]]; then
    echo ""
    echo ""
    echo "Failed to start - check docker logs for errors and try again."
    echo ""
    exit 1
  fi
  if [[ "$isUpgradeRunning" != "true" ]]; then
    echo ""
    echo ""
    echo "Upgrade service no longer running - check for port conflicts or other errors and try again."
    echo ""
    exit 1
  fi

  echo '.' | tr -d '\n'
  ((i++))
	sleep 1
	isNginxRunning=$(docker inspect --format="{{.State.Running}}" "${selectedProject}_nginx_1" 2>/dev/null)
  isUpgradeRunning=$(docker inspect --format="{{.State.Running}}" "${selectedProject}-dir-cht-upgrade-service-1" 2>/dev/null)
done

docker exec -it "${selectedProject}_nginx_1" bash -c "curl -s -o server.pem http://local-ip.co/cert/server.pem"
docker exec -it "${selectedProject}_nginx_1" bash -c "curl -s -o chain.pem http://local-ip.co/cert/chain.pem"
docker exec -it "${selectedProject}_nginx_1" bash -c "cat server.pem chain.pem > /etc/nginx/private/cert.pem"
docker exec -it "${selectedProject}_nginx_1" bash -c "curl -s -o /etc/nginx/private/key.pem http://local-ip.co/cert/server.key"
docker restart "${selectedProject}_nginx_1" 1>/dev/null

echo ""
echo ""
echo " -------------------------------------------------------- "
echo ""
echo "  Success! \"${selectedProject}\" is set up:"
echo ""
echo "    https://127-0-0-1.my.local-ip.co:${NGINX_HTTPS_PORT}/ (CHT)"
echo "    https://127-0-0-1.my.local-ip.co:${NGINX_HTTPS_PORT}/_utils/ (Fauxton)"
echo ""
echo "    Login: medic"
echo "    Password: password"
echo ""
echo " -------------------------------------------------------- "
echo ""
echo " Have a great day!"
echo ""

set -e
