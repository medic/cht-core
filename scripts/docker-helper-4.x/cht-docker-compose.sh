#!/usr/bin/env bash

set -eu

projectFile=
projectName=
homeDir=

get_existing_projects() {
	find . -name "*.env" -type f | sed "s/\.\///" | sed "s/\.env//"
}

init_env_file() {
	httpPort=10080
	httpsPort=10443

	projects=$(get_existing_projects)
	for file in $projects; do
		tmpHttpPort=$(tr <"$file.env" '\n' ' ' | sed "s/^.*NGINX_HTTP_PORT=\([0-9]\{3,5\}\).*$/\1/")
		if [ "$tmpHttpPort" -ge "$httpPort" ]; then
			httpPort=$((tmpHttpPort + 1))
		fi

		tmpHttpsPort=$(tr <"$file.env" '\n' ' ' | sed "s/^.*NGINX_HTTPS_PORT=\([0-9]\{3,5\}\).*$/\1/")
		if [ "$tmpHttpsPort" -ge "$httpsPort" ]; then
			httpsPort=$((tmpHttpsPort + 1))
		fi
	done

	touch "./$projectFile"
	cat >"./$projectFile" <<EOL
NGINX_HTTP_PORT=$httpPort
NGINX_HTTPS_PORT=$httpsPort
COUCHDB_USER=medic
COUCHDB_PASSWORD=password
CHT_COMPOSE_PROJECT_NAME=$projectName
DOCKER_CONFIG_PATH=$homeDir
COUCHDB_SECRET=$(openssl rand -hex 16)
COUCHDB_UUID=$(openssl rand -hex 16)
COUCHDB_DATA=$homeDir/couch
CHT_COMPOSE_PATH=$homeDir/compose
CHT_NETWORK=$projectName-cht-net
EOL
}

create_compose_files() {
  echo "Downloading compose files ..." | tr -d '\n'
  mkdir -p "$homeDir/couch"
  mkdir -p "$homeDir/compose"
  curl -s -o "$homeDir/upgrade-service.yml" \
  	https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml
  curl -s -o "$homeDir/compose/cht-core.yml" \
  	https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:master/docker-compose/cht-core.yml
  curl -s -o "$homeDir/compose/couchdb.yml" \
  	https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:master/docker-compose/cht-couchdb.yml

  echo "Done!"
}

get_home_dir() {
	echo "$HOME/.medic/cht-docker/$1-dir"
}

# can pass a project .env file as argument
if [[ -n "${1-}" ]]; then
	if [[ -f "$1" ]]; then
		projectFile=$1
		projectName=$(echo "$projectFile" | sed "s/\.\///" | sed "s/\.env//")
		homeDir=$(get_home_dir "$projectName")
	else
		echo "File $1 doesnt exist"
	fi
fi

if [[ -n "${2-}" && -n $projectName ]]; then
	containerIds=$(docker ps --all --filter "name=${projectName}" --quiet)
	case $2 in
	"down")
		echo "Shutting down project \"${projectName}\"."

		docker stop $containerIds 1>/dev/null

		echo "Done."
		exit 0
		;;
	"nuke")
		echo "Nuking project \"${projectName}\"."

		if [[ -n $containerIds ]]; then
			echo "Removing project's docker containers..."

			docker stop $containerIds 1>/dev/null
			docker rm $containerIds 1>/dev/null

			echo "Done."
		else
			echo "No docker container found, skipping."
		fi

		networks=$(docker network ls --filter "name=${projectName}" --quiet)
		if [[ -n $networks ]]; then
			echo "Removing project's docker networks..."
			docker network rm $networks 1>/dev/null
			echo "Done."
		else
			echo "No docker network found, skipping."
		fi

		volumes=$(docker volume ls --filter "name=${projectName}" --quiet)
		if [[ -n $volumes ]]; then
			echo "Removing project's docker volumes..."
			docker volume rm $volumes 1>/dev/null
			echo "Done."
		else
			echo "No docker container volume, skipping."
		fi

		if [[ -d $homeDir ]]; then
			echo "Removing project-specific files..."
			sudo rm -rf "$homeDir"
			echo "Done."
		else
			echo "No project-specific found, skipping."
		fi

		echo "Project \"${projectName}\" successfully nuked from your computer."
		exit 0
		;;
	esac
fi

if [[ -z "$projectName" ]]; then
	projects=$(get_existing_projects)

	if [[ -z "$projects" ]]; then
		echo 'No project found, follow the prompts to create a project .env file.'
	fi

	read -p "Would you like to initialize a new project [y/N]? " yn
	case $yn in
	[Yy]*)
		while [[ -z "$projectName" ]]; do
			read -p "How do you want to name the project? " projectName

			projectName="${projectName//[^[:alnum:]]/_}"
			projectName=$(echo $projectName | tr '[:upper:]' '[:lower:]')
			projectFile="$projectName.env"
			homeDir=$(get_home_dir "$projectName")
			if test -f "./$projectFile"; then
				echo "./$projectFile already exists"
				projectName=
				projectFile=
				homeDir=
			fi
		done

		init_env_file
		create_compose_files
		projects=$(get_existing_projects)
		;;
	esac

	envCount=$(find . -name "*.env" -type f | wc -l)
	if [ "$envCount" -gt 0 ]; then
		while [[ -z "$projectName" ]]; do
			echo "Which project do you want to use?"
			select project in $projects; do
				projectName=$project
				projectFile="$projectName.env"
				homeDir=$(get_home_dir "$projectName")
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

# shellcheck disable=SC1090
source "./$projectFile"

echo ""
docker-compose --env-file "./$projectFile" --file "$homeDir/upgrade-service.yml" up --detach

set +e
echo "Starting project \"${projectName}\". First run takes a while. Will try for up to five minutes..." | tr -d '\n'

get_nginx_container_id() {
	docker ps --all --filter "publish=${NGINX_HTTPS_PORT}" --filter "name=${projectName}" --quiet
}

get_is_container_running() {
	containerId=$1
	docker inspect --format="{{.State.Running}}" "$containerId" 2>/dev/null
}

nginxContainerId=$(get_nginx_container_id)
isNginxRunning=$(get_is_container_running "$nginxContainerId")
i=0
while [[ "$isNginxRunning" != "true" ]]; do
	if [[ $i -gt 300 ]]; then
		echo ""
		echo ""
		echo "Failed to start - check docker logs for errors and try again."
		echo ""
		exit 1
	fi

	echo '.' | tr -d '\n'
	((i++))
	sleep 1

	if [[ $nginxContainerId = "" ]]; then
		nginxContainerId=$(get_nginx_container_id)
	fi

	isNginxRunning=$(get_is_container_running "$nginxContainerId")
done

docker exec -it "$nginxContainerId" bash -c "curl -s -o server.pem http://local-ip.co/cert/server.pem"
docker exec -it "$nginxContainerId" bash -c "curl -s -o chain.pem http://local-ip.co/cert/chain.pem"
docker exec -it "$nginxContainerId" bash -c "cat server.pem chain.pem > /etc/nginx/private/cert.pem"
docker exec -it "$nginxContainerId" bash -c "curl -s -o /etc/nginx/private/key.pem http://local-ip.co/cert/server.key"
docker restart "$nginxContainerId" 1>/dev/null

echo ""
echo ""
echo " -------------------------------------------------------- "
echo ""
echo "  Success! \"${projectName}\" is set up:"
echo ""
echo "    https://127-0-0-1.my.local-ip.co:${NGINX_HTTPS_PORT}/ (CHT)"
echo "    https://127-0-0-1.my.local-ip.co:${NGINX_HTTPS_PORT}/_utils/ (Fauxton)"
echo ""
echo "    Login: ${COUCHDB_USER}"
echo "    Password: ${COUCHDB_PASSWORD}"
echo ""
echo " -------------------------------------------------------- "
echo ""
echo " Have a great day!"
echo ""

set -e
