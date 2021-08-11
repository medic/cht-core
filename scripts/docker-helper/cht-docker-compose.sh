#!/usr/bin/env bash

# Helper script to get a docker-compose instance up and running.
#
# Uses docker-compose-developer.yml docker compose file to
#
#   * See if a .env file is available
#   * Using info from .env, be aware of ports and storage names
#   * make sure as much of the services in medic-os are up and running correctly
#   * install valid certificate
#   * show users status of instance
#
# See https://github.com/medic/cht-core/issues/7218 for more info

# shellcheck disable=SC2046
. $(dirname $0)/simple_curses.sh

get_lan_ip(){
  routerIP=$(ip r | grep default | head -n1 | awk '{print $3}')
  subnet=$(echo "$routerIP"|cut -d'.' -f1,2,3)
  if [ -z $subnet ];then
    subnet=127.0.0
  fi
  lanInterface=$(ip r | grep $subnet| grep default | head -n1 | cut -d' ' -f 5)
  lanAddress=$(ip a s "$lanInterface" | awk '/inet /{gsub(/\/.*/,"");print $2}' | head -n1)
  echo "$lanAddress"
}

get_local_ip_url(){
  lanIp=$1
  cookedLanAddress=$(echo "$lanIp"|tr . -)
  url="https://${cookedLanAddress}.my.local-ip.co:${CHT_HTTPS}"
  echo "$url"
}

required_apps_installed(){
  error=''
  appString=$1
  IFS=';' read -ra appsArray <<< "$appString"
  for app in "${appsArray[@]}"
  do
    if ! command -v "$app"&> /dev/null
    then
      error="${app} ${error}"
    fi
  done
  echo "${error}"
}

port_open(){
  ip=$1
  port=$2
  nc -z "$ip" "$port"; echo $?
}

has_self_signed_cert(){
  url=$1
  curl --insecure -vvI "$url" 2>&1 | grep -c "self signed certificate"
}

cht_healthy(){
  chtIp=$1
  chtPort=$2
  chtUrl=$3
  portIsOpen=$(port_open "$chtIp" "$chtPort")
  if [ "$portIsOpen" = "0" ];then
    http_code=$(curl -k --silent --show-error --head "$chtUrl" --write-out '%{http_code}'|tail -n1)
    if [ "$http_code" != "200" ];then
      echo "CHT is returning $http_code instead of 200."
    fi
  else
    echo "Port $chtPort is not open on $chtIp"
  fi
}

validate_env_file(){
  envFile=$1
  if [ ! -f "$envFile" ]; then
    echo "File not found: $envFile"
  fi

  # TODO- maybe grep for env vars we're expecting? Blindly including
  # is a bit promiscuous
  # shellcheck disable=SC1090
  . "${envFile}"
  if [ -z "$COMPOSE_PROJECT_NAME" ] || [ -z "$CHT_HTTP" ] || [ -z "$CHT_HTTPS" ]; then
    echo "Missing env value in file: COMPOSE_PROJECT_NAME, CHT_HTTP or CHT_HTTPS"
  elif [[ "$COMPOSE_PROJECT_NAME" =~ [A-Z] ]];then
    echo "COMPOSE_PROJECT_NAME can not have upper case: $COMPOSE_PROJECT_NAME"
  fi
}

get_running_container_count(){
  result=0
  containers="$1"
  IFS=' ' read -ra containersArray <<< "$containers"
  for container in "${containersArray[@]}"
  do
    if [ "$( docker ps -f name="${container}" | wc -l )" -eq 2 ]; then
        (( result++ ))
    fi
  done
  echo "$result"
}

get_global_running_container_count(){
  if [ "$( docker ps --format={{.Names}} | wc -l )" -gt 0 ]; then
    docker ps --format={{.Names}} | wc -l
  else
    echo "0"
  fi
}

volume_exists(){
  project=$1
  volume="${project}_medic-data"
  if [ "$( docker volume inspect "${volume}" 2>&1  | wc -l )" -eq 2 ]; then
    echo "0"
  else
    echo "1"
  fi
}

get_docker_compose_yml_path(){
  if [ -f docker-compose-developer.yml ]; then
    echo "docker-compose-developer.yml"
  elif [ -f ../../docker-compose-developer.yml ]; then
    echo "../../docker-compose-developer.yml"
  else
    return 0
  fi
}

docker_up_or_restart(){
  # some times this function called too quickly after a docker change, so
  # we sleep 3 secs here to let the docker container/volume stabilize
  sleep 3

  envFile=$1
  composeFile=$2

  # haproxy never starts on first "up" call, so you know, call it twice ;)
  docker-compose --env-file ${envFile} -f ${composeFile} down  > /dev/null 2>&1
  docker-compose --env-file ${envFile} -f ${composeFile} up -d > /dev/null 2>&1
  docker-compose --env-file ${envFile} -f ${composeFile} up -d > /dev/null 2>&1
}

install_local_ip_cert(){
  medicOs=$1
  docker exec -it "${medicOs}" bash -c "curl -s -o server.pem http://local-ip.co/cert/server.pem" > /dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "curl -s -o chain.pem http://local-ip.co/cert/chain.pem" > /dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "cat server.pem chain.pem > /srv/settings/medic-core/nginx/private/default.crt" > /dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "curl -s -o /srv/settings/medic-core/nginx/private/default.key http://local-ip.co/cert/server.key" > /dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "/boot/svc-restart medic-core nginx" > /dev/null 2>&1
}

docker_down(){
  envFile=$1
  composeFile=$2
  docker-compose --env-file ${envFile} -f ${composeFile} down > /dev/null 2>&1
}

docker_destroy(){
  project=$1
  containers=$2
  IFS=' ' read -ra containersArray <<< "$containers"
  for container in "${containersArray[@]}"
  do
    docker stop -t 0 "${container}" > /dev/null 2>&1
  done
  docker rm "${project}"_haproxy_1 "${project}"_medic-os_1 > /dev/null 2>&1
  docker volume rm "${project}"_medic-data > /dev/null 2>&1
  docker network rm "${project}"_medic-net > /dev/null 2>&1
}

main (){

  # very first thing check we have valid env file, exit if not
  validEnv=$(validate_env_file "$envFile")
  if [ -n "$validEnv" ]; then
    window "CHT Docker Helper - WARNING - Missing or invalid .env File" "red" "100%"
    append "$validEnv"
    endwin
    return 0
  else
    # shellcheck disable=SC1090
    . "${envFile}"
  fi

  # after valid env file is loaded, let's set all our constants
  declare -r APP_STRING="ip;docker;docker-compose;nc;curl;tr"
  declare -r MAX_REBOOTS=5
  declare -r DEFAULT_SLEEP=$((100*$((reboot_count+1))))
  declare -r MEDIC_OS="${COMPOSE_PROJECT_NAME}_medic-os_1"
  declare -r HAPROXY="${COMPOSE_PROJECT_NAME}_haproxy_1"
  declare -r ALL_CONTAINERS="${MEDIC_OS} ${HAPROXY}"

  # with constants set, let's ensure all the apps are present, exit if not
  appStatus=$(required_apps_installed "$APP_STRING")
  if [ -n "$appStatus" ]; then
    window "WARNING: Missing Apps" "red" "100%"
    append "Install before proceeding:"
    append "$appStatus"
    endwin
    return 0
  fi

  # do all the various checks of stuffs
  volumeCount=$(volume_exists "$COMPOSE_PROJECT_NAME")
  containerCount=$(get_running_container_count "$ALL_CONTAINERS")
  globalContainerCount=$(get_global_running_container_count)
  lanAddress=$(get_lan_ip)
  chtUrl=$(get_local_ip_url "$lanAddress")
  health=$(cht_healthy "$lanAddress" "$CHT_HTTPS" "$chtUrl")
  dockerComposePath=$(get_docker_compose_yml_path)

  # if we're exiting, call down or destroy and quit proper
  if [ "$exitNext" = "destroy" ] || [ "$exitNext" = "down" ] || [ "$exitNext" = "happy" ];then
    if [ "$exitNext" = "destroy" ]; then
      docker_destroy "$COMPOSE_PROJECT_NAME" "$ALL_CONTAINERS"
    elif [ "$exitNext" = "down" ]; then
      docker_down "$envFile" "$dockerComposePath"
    fi
    set -e
    exit 0
  fi

  # if we're not healthy, report self signed as zero, otherwise if
  # we are healthy, check for self_signed cert
  if [ -n "$health" ]; then
    self_signed=0
  else
    self_signed=$(has_self_signed_cert "$chtUrl")
  fi

  # derive overall healthy
  if [ -z "$appStatus" ] && [ -z "$health" ] && [ "$self_signed" = "0" ]; then
    overAllHealth="Good"
  elif [[ "$sleepFor" > 0 ]]; then
    overAllHealth="Booting..."
  else
    overAllHealth="!= Bad =!"
  fi

  # display only action so this paints on bash screen. next loop we'll quit and show nothing new
  if [ "$docker_action" = "destroy" ] || [ "$docker_action" = "down" ]; then
    window "${docker_action}ing project ${COMPOSE_PROJECT_NAME} " "red" "100%"
    append "Please wait... "
    endwin
    exitNext=$docker_action
    return 0
  elif [ -z $docker_action ] || [ $docker_action != "up" ] || [ $docker_action = "" ];then
    echo "die die die!4"
    date
    set -e
    exit 0
  fi

  # todo - add CHT version as info displayed
#  curl -s https://medic:password@192-168-68-40.my.local-ip.co:8443/api/v1/monitoring | jq .version.app
#  "3.9.0"
  window "CHT Docker Helper: PROJECT ${COMPOSE_PROJECT_NAME}" "green" "100%"
  append_tabbed "CHT URL|${chtUrl}" 2 "|"
  append_tabbed "FAUXTON URL|${chtUrl}/_utils/" 2 "|"
  append_tabbed "" 2 "|"
  append_tabbed "CHT Health|${overAllHealth}" 2 "|"
  append_tabbed "Project Running Containers|${containerCount} of 2" 2 "|"
  append_tabbed "Global Running Containers|${globalContainerCount}" 2 "|"
  append_tabbed "Last Action|${last_action}" 2 "|"
  endwin

  if [ -z "$dockerComposePath" ]; then
    window "WARNING: Missing Compose File " "red" "100%"
    append "Download before proceeding: "
    append "wget https://github.com/medic/cht-core/blob/master/docker-compose-developer.yml"
    endwin
    return 0
  fi

  if [[ "$volumeCount" = 0 ]] && [[ "$reboot_count" = 0 ]]; then
    sleepFor=$DEFAULT_SLEEP
    last_action="First run of \"docker-compose up\""
    docker_up_or_restart "$envFile" "$dockerComposePath" &
    (( reboot_count++ ))
  fi

  if [[ "$containerCount" != 2 ]] && [[ "$reboot_count" != "$MAX_REBOOTS" ]] && [[ "$sleepFor" = 0 ]]; then
    sleepFor=$DEFAULT_SLEEP
    last_action="Running \"docker-compose down\" then  \"docker-compose up\""
    docker_up_or_restart "$envFile" "$dockerComposePath" &
    (( reboot_count++ ))
  fi

  if [ -n "$health" ] && [[ "$sleepFor" = 0 ]] && [[ "$reboot_count" != "$MAX_REBOOTS" ]]; then
    sleepFor=$DEFAULT_SLEEP
    last_action="Running \"docker-compose down\" then  \"docker-compose up\""
    docker_up_or_restart "$envFile" "$dockerComposePath"  &
    (( reboot_count++ ))
  fi

  if [[ "$sleepFor" > 0 ]] && [ -n "$health" ]; then
    window "Attempt number $reboot_count / $MAX_REBOOTS to boot $COMPOSE_PROJECT_NAME" "yellow" "100%"
    append "Waiting $sleepFor..."
    endwin
    (( sleepFor-- ))
  fi

  if [[ "$reboot_count" = "$MAX_REBOOTS" ]] && [[ "$sleepFor" = 0 ]]; then
    window "Reboot max met: $MAX_REBOOTS reboots" "red" "100%"
    append "Please try running docker helper script again"
    endwin
  fi

  # show health status
  if [ -n "$health" ]; then
    window "WARNING: CHT Not running" "red" "100%"
    append "$health"
    endwin
    return 0
  fi

  # check for self signed cert, install if so
  if [ "$self_signed" = "1" ]; then
    window "WARNING: CHT has self signed certificate" "red" "100%"
    append "Installing local-ip.co certificate to fix..."
    last_action="Installing local-ip.co certificate..."
    endwin
    install_local_ip_cert $MEDIC_OS&
    return 0
  fi

  # reset all the things to be thorough
  sleepFor=0
  reboot_count=0
  last_action=" :) "

  # if we're here, we're happy! Show happy sign and exit next iteration via exitNext
  window "Successfully started project ${COMPOSE_PROJECT_NAME} " "green" "100%"
  append "login: medic"
  append "password: password"
  append ""
  append "Have a great day!"
  endwin
  exitNext="happy"

}

main_loop -t 1.0 $@