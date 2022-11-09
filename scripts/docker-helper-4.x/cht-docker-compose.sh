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

		mkdir -p "$HOME/.medic/cht-docker/$projectName/couch-$projectName"
		touch "./$projectName.env"
		echo "NGINX_HTTP_PORT=8080" >>"./$projectName.env"
		echo "NGINX_HTTPS_PORT=8443" >>"./$projectName.env"
		echo "COUCHDB_USER=medic" >>"./$projectName.env"
		echo "COUCHDB_PASSWORD=password" >>"./$projectName.env"
		echo "CHT_COMPOSE_PROJECT_NAME=$projectName" >>"./$projectName.env"
		echo "DOCKER_CONFIG_PATH=$HOME/.medic/cht-docker/$projectName" >>"./$projectName.env"
		echo "COUCHDB_SECRET=$(openssl rand -hex 16)" >>"./$projectName.env"
		echo "COUCHDB_DATA=$HOME/.medic/cht-docker/$projectName/couch-$projectName" >>"./$projectName.env"
		echo "CHT_COMPOSE_PATH=$HOME/.medic/cht-docker/compose-files" >>"./$projectName.env"
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
        break
      done
    done
  else
    echo ""
    echo "No projects found, please create one."
    echo ""
    exit 1
  fi
fi

mkdir -p "$HOME/.medic/cht-docker/compose-files"
curl -s -o "$HOME/.medic/cht-docker/compose-files/docker-compose_cht-upgrader-service.yml" \
  https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml
curl -s -o "$HOME/.medic/cht-docker/compose-files/docker-compose_cht-core.yml" \
  https://staging.dev.medicmobile.org/_couch/builds_4/medic%3Amedic%3Amaster/docker-compose%2Fcht-core.yml
curl -s -o "$HOME/.medic/cht-docker/compose-files/docker-compose_cht-couchdb.yml" \
  https://staging.dev.medicmobile.org/_couch/builds_4/medic%3Amedic%3Amaster/docker-compose%2Fcht-couchdb.yml

echo ""
#docker-compose --env-file "./$selectedProject.env" --file "$HOME/.medic/cht-docker/compose-files/docker-compose_cht-upgrader-service.yml" down
docker-compose --env-file "./$selectedProject.env" --file "$HOME/.medic/cht-docker/compose-files/docker-compose_cht-upgrader-service.yml" up --detach
#docker-compose --env-file "./$selectedProject.env" --file "$HOME/.medic/cht-docker/compose-files/docker-compose_cht-upgrader-service.yml" logs --follow

echo ""
set +e

echo "Download images, starting services and adding local-ip.co certs to Docker container ${selectedProject}_nginx_1" | tr -d '\n'
isNginxRunning=$(docker inspect --format="{{.State.Running}}" "${selectedProject}_nginx_1" 2>/dev/null)
while [[ "$isNginxRunning" != "true" ]]; do
  echo '.' | tr -d '\n'
	sleep 1
	isNginxRunning=$(docker inspect --format="{{.State.Running}}" "${selectedProject}_nginx_1" 2>/dev/null)
done
docker exec -it "${selectedProject}_nginx_1" bash -c "curl -s -o server.pem http://local-ip.co/cert/server.pem"
docker exec -it "${selectedProject}_nginx_1" bash -c "curl -s -o chain.pem http://local-ip.co/cert/chain.pem"
docker exec -it "${selectedProject}_nginx_1" bash -c "cat server.pem chain.pem > /etc/nginx/private/cert.pem"
docker exec -it "${selectedProject}_nginx_1" bash -c "curl -s -o /etc/nginx/private/key.pem http://local-ip.co/cert/server.key"
docker restart "${selectedProject}_nginx_1" 1>/dev/null

echo ""
echo ""
echo "All services started and local-ip.co certs added to ${selectedProject}_nginx_1"
echo ""
echo " -------------------------------------------------------- "
echo ""
echo "  Success! Local CHT instance is set up:"
echo ""
echo "    https://127-0-0-1.my.local-ip.co:8443/"
echo ""
echo "    Login: medic"
echo "    Password: password"
echo ""
echo " -------------------------------------------------------- "
echo ""
echo " Have a great day!"
echo ""

set -e
