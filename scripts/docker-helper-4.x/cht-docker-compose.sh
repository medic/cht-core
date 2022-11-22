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

mkdir -p "$homeDir/couch"
mkdir -p "$homeDir/compose"
curl -s -o "$homeDir/upgrade-service.yml" \
	https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml
curl -s -o "$homeDir/compose/cht-core.yml" \
	https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:master/docker-compose/cht-core.yml
curl -s -o "$homeDir/compose/couchdb.yml" \
	https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:master/docker-compose/cht-couchdb.yml

# shellcheck disable=SC1090
source "./$projectFile"

echo ""
docker-compose --env-file "./$projectFile" --file "$homeDir/upgrade-service.yml" up --detach

set +e
echo "Starting project \"${projectName}\". First run takes a while. Will try for up to five minutes..." | tr -d '\n'
isNginxRunning=$(docker inspect --format="{{.State.Running}}" "${projectName}_nginx_1" 2>/dev/null)
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
	isNginxRunning=$(docker inspect --format="{{.State.Running}}" "${projectName}_nginx_1" 2>/dev/null)
done

docker exec -it "${projectName}_nginx_1" bash -c "curl -s -o server.pem http://local-ip.co/cert/server.pem"
docker exec -it "${projectName}_nginx_1" bash -c "curl -s -o chain.pem http://local-ip.co/cert/chain.pem"
docker exec -it "${projectName}_nginx_1" bash -c "cat server.pem chain.pem > /etc/nginx/private/cert.pem"
docker exec -it "${projectName}_nginx_1" bash -c "curl -s -o /etc/nginx/private/key.pem http://local-ip.co/cert/server.key"
docker restart "${projectName}_nginx_1" 1>/dev/null

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
