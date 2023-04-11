#!/usr/bin/env bash

set -eu

projectFile=
projectName=
homeDir=
green='\033[0;32m'   #'0;32' is Green's ANSI color code
red='\033[0;31m'   #'0;31' is Red's ANSI color code
noColor='\033[0m'

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

get_latest_release() {
  latest=$(curl -s https://staging.dev.medicmobile.org/_couch/builds_4/_design/builds/_view/releases\?limit\=1\&descending\=true |  tr -d \\n | grep -o 'medic\:medic\:[0-9\.]*')
  echo "https://staging.dev.medicmobile.org/_couch/builds_4/${latest}"
}

create_compose_files() {
  echo "Downloading compose files ..." | tr -d '\n'
  stagingUrlBase=$(get_latest_release)
  mkdir -p "$homeDir/couch"
  mkdir -p "$homeDir/compose"
  curl -s -o "$homeDir/upgrade-service.yml" \
  	https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml
  curl -s -o "$homeDir/compose/cht-core.yml" ${stagingUrlBase}/docker-compose/cht-core.yml
  curl -s -o "$homeDir/compose/couchdb.yml" ${stagingUrlBase}/docker-compose/cht-couchdb.yml

  echo -e "${green} done${noColor} "
}

get_home_dir() {
	echo "$HOME/.medic/cht-docker/$1-dir"
}

show_help_intro() {
    echo ""
    echo "Helper script to start a CHT 4.x instance in docker."
    echo ""
    echo "Start new project:"
    echo "    ./cht-docker-compose.sh"
}

show_help_existing_stop_and_destroy() {
    echo ""
    echo "Start existing project"
    echo "    ./cht-docker-compose.sh ENV-FILE.env"
    echo ""
    echo "Stop and keep project:"
    echo "    ./cht-docker-compose.sh ENV-FILE.env stop"
    echo ""
    echo "Stop and destroy all project data:"
    echo "    ./cht-docker-compose.sh ENV-FILE.env destroy"
    echo ""
    echo "https://docs.communityhealthtoolkit.org/apps/guides/hosting/4.x/app-developer/"
    echo ""
}

get_lan_ip() {
  # init empty lan address
  lanAddress=""

  # "system_profiler" exists only on MacOS, if it's not here, then run linux style command for
  # getting localhost's IP.  Otherwise use MacOS style command
  if [ -n "$(required_apps_installed "system_profiler")" ];then
    # todo - some of these calls fail when there's no network connectivity - output stuff it shouldn't:
    #       Device "" does not exist.
    routerIP=$(ip r | grep default | head -n1 | awk '{print $3}')
    subnet=$(echo "$routerIP" | cut -d'.' -f1,2,3 )
    if [ -z $subnet ]; then
      subnet=127.0.0
    fi
    lanInterface=$(ip r | grep $subnet | grep default | head -n1 | cut -d' ' -f 5)
    lanAddress=$(ip a s "$lanInterface" | awk '/inet /{gsub(/\/.*/,"");print $2}' | head -n1)
  else
    subnet=$(netstat -rn| grep default | awk '{print $2}'|grep -Ev '^[a-f]' |cut -f1,2,3 -d'.')
    ifconfig_line=$(ifconfig|grep inet|grep "$subnet" | cut -d' ' -f 2)
    lanAddress=$ifconfig_line
  fi

  # always fall back to localhost if lanAddress wasn't set
  if [ -z "$lanAddress" ]; then
    lanAddress=127.0.0.1
  fi
  echo "$lanAddress"
}

get_local_ip_url(){
  lanIp=$1
  cookedLanAddress=$(echo "$lanIp" | tr . -)
  url="https://${cookedLanAddress}.my.local-ip.co:${NGINX_HTTPS_PORT}"
  echo "$url"
}

required_apps_installed(){
  error=''
  appString=$1
  IFS=';' read -ra appsArray <<<"$appString"
  for app in "${appsArray[@]}"; do
    if ! command -v "$app" &>/dev/null; then
      error="${app} ${error}"
    fi
  done
  echo "${error}"
}

get_nginx_container_id() {
	docker ps --all --filter "publish=${NGINX_HTTPS_PORT}" --filter "name=${projectName}" --quiet
}

get_is_container_running() {
	containerId=$1
	docker inspect --format="{{.State.Running}}" "$containerId" 2>/dev/null
}

if [ -n "$(required_apps_installed "docker-compose")" ];then
  echo ""
  echo -e "${red}\"docker-compose\" is not installed or could not be found. Please install and try again!${noColor}"
  show_help_existing_stop_and_destroy
  exit 0
fi

# can pass a project .env file as argument
if [[ -n "${1-}" ]]; then
	if [[ "$1" == "--help" ]] || [[  "$1" == "-h" ]]; then
    show_help_intro
    show_help_existing_stop_and_destroy
    exit 0
	elif [[ -f "$1" ]]; then
		projectFile=$1
		projectName=$(echo "$projectFile" | sed "s/\.\///" | sed "s/\.env//")
		homeDir=$(get_home_dir "$projectName")
	else
	  echo ""
		echo -e "${red}File \"$1\" doesnt exist - be sure to include \".env\" at the end!${noColor}"
    show_help_existing_stop_and_destroy
    exit 0
	fi
fi

if [[ -n "${2-}" && -n $projectName ]]; then
	containerIds=$(docker ps --all --filter "name=${projectName}" --quiet)
	case $2 in
	"stop")
		echo "Stopping project \"${projectName}\"..." | tr -d '\n'
		docker kill $containerIds 1>/dev/null
		echo -e "${green} done${noColor} "
		exit 0
		;;
	"destroy")
		echo "Destroying project \"${projectName}\"."

		if [[ -n $containerIds ]]; then
			echo "Removing project's docker containers..." | tr -d '\n'
			docker kill $containerIds 1>/dev/null
			docker rm $containerIds 1>/dev/null
			echo -e "${green} done${noColor} "
		else
			echo "No docker container found, skipping."
		fi

		networks=$(docker network ls --filter "name=${projectName}" --quiet)
		if [[ -n $networks ]]; then
			echo "Removing project's docker networks..." | tr -d '\n'
			docker network rm $networks 1>/dev/null
			echo -e "${green} done${noColor} "
		else
			echo "No docker network found, skipping."
		fi

		volumes=$(docker volume ls --filter "name=${projectName}" --quiet)
		if [[ -n $volumes ]]; then
			echo "Removing project's docker volumes..." | tr -d '\n'
			docker volume rm $volumes 1>/dev/null
			echo -e "${green} done${noColor} "
		else
			echo "No docker container volume, skipping."
		fi

		if [[ -d $homeDir ]]; then
			echo "Removing project files which needs sudo..."
			sudo rm -rf "$homeDir"
			echo -e "${green} done${noColor} "
		else
			echo "No project-specific found, skipping."
		fi

		if [[ -f "${projectName}.env" ]]; then
			echo "Removing .env file in this directory..." | tr -d '\n'
			rm ${projectName}.env
			echo -e "${green} done${noColor} "
		else
			echo "No .env file found, skipping."
		fi


		echo "Project \"${projectName}\" successfully removed from your computer."
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
			echo "Which project do you want to use? (ctrl + c to quit) "
			select project in $projects; do
				projectName=$project
				projectFile="$projectName.env"
				homeDir=$(get_home_dir "$projectName")
				break
			done
		done
	else
		echo ""
		echo -e "${red}No projects found, please initialize a new one.${noColor}"
		show_help_existing_stop_and_destroy
		exit 1
	fi
fi

# shellcheck disable=SC1090
source "./$projectFile"

projectURL=$(get_local_ip_url "$(get_lan_ip)")

echo ""
docker-compose --env-file "./$projectFile" --file "$homeDir/upgrade-service.yml" up --detach

set +e
echo "Starting project \"${projectName}\". First run takes a while. Will try for up to five minutes..." | tr -d '\n'

nginxContainerId=$(get_nginx_container_id)
isNginxRunning=$(get_is_container_running "$nginxContainerId")
i=0
while [[ "$isNginxRunning" != "true" ]]; do
	if [[ $i -gt 300 ]]; then
		echo ""
		echo ""
		echo "${red}Failed to start - check docker logs for errors and try again.${noColor}"
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
echo "    ${projectURL}/ (CHT)"
echo "    ${projectURL}/_utils/ (Fauxton)"
echo ""
echo "    Login: ${COUCHDB_USER}"
echo "    Password: ${COUCHDB_PASSWORD}"
echo ""
echo " -------------------------------------------------------- "
show_help_existing_stop_and_destroy
echo ""
echo -e "${green} Have a great day!${noColor} "
echo ""

set -e
