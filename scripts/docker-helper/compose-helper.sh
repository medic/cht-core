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
. `dirname $0`/simple_curses.sh

# shellcheck disable=SC2046
#. `dirname $0`/helper_helpers.sh

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
  cookedLanAddress=$(echo $lanIp|tr . -)
  url="https://${cookedLanAddress}.my.local-ip.co:${CHT_HTTPS}"
  echo "$url"
}

required_apps_installed(){
  error=''
  IFS=';' read -ra appsArray <<< "$APP_STRING"
  for app in "${appsArray[@]}"
  do
    if ! command -v $app&> /dev/null
    then
      error="${app} ${error}"
    fi
  done
  echo "${error}"
}

port_open(){
  ip=$1
  port=$2
  nc -z $ip $port; echo $?
}

# todo - just find the "add-local-ip-certs-to-docker.sh" script and install cert for them?
has_self_signed_cert(){
  url=$1
  curl --insecure -vvI $url 2>&1 | grep -c "self signed certificate"
}

cht_healthy(){
  chtIp=$1
  chtPort=$2
  chtUrl=$3
  portIsOpen="`port_open $chtIp $chtPort`"
  if [ "$portIsOpen" = "0" ];then
    http_code="`curl -k --silent --show-error --head $chtUrl --write-out '%{http_code}'|tail -n1`"
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
    return 0
  fi

  # TODO- maybe grep for env vars we're expecting? Blindly including
  # is a bit promiscuous
  # shellcheck disable=SC1090
  . "${envFile}"
  if [ -z "$COMPOSE_PROJECT_NAME" ] || [ -z "$CHT_HTTP" ] || [ -z "$CHT_HTTPS" ]; then
    echo "Missing env value in file: COMPOSE_PROJECT_NAME, CHT_HTTP or CHT_HTTPS"
  fi
}


# thanks https://yaroslavgrebnov.com/blog/bash-docker-check-container-existence-and-status/
container_status(){
  result=''
  containers=$1

  IFS=' ' read -ra containersArray <<< "$containers"
  for container in "${containersArray[@]}"
  do
    if [ "$( docker ps -f name="${container}" | wc -l )" -ne 2 ]; then
      result="${container} not running. ${result}"
    fi
  done

  echo "$result"
}

# todo containers string being passed in isn't working
# thanks https://yaroslavgrebnov.com/blog/bash-docker-check-container-existence-and-status/
get_running_container_count(){
  result=0
  containers=$1
  IFS=' ' read -ra containersArray <<< "$containers"
  for container in "${containersArray[@]}"
  do
    echo "checking $container"
    if [ "$( docker ps -f name="${container}" | wc -l )" -eq 2 ]; then
        (( result++ ))
    fi
  done
  echo "$result"
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
  containerCount=$3
  volumeCount=$4
  containers=$5

  IFS=';' read -ra appsArray <<< "$APP_STRING"
  for app in "${appsArray[@]}"
  do
    if ! command -v $app&> /dev/null
    then
      error="${app} ${error}"
    fi
  done

  totalCount="$(( $volumeCount + $containerCount ))"
  if [[ $totalCount != 3 ]];then
    # haproxy never starts on first "up" call, so you know, call it twice ;)
    docker-compose --env-file "${envFile}" -f "${composeFile}" up -d > /dev/null 2>&1
    docker-compose --env-file "${envFile}" -f "${composeFile}" up -d > /dev/null 2>&1
  else

    # todo - decide which of these to use here
    # todo - neither is working for some reason?
#    docker-compose --env-file ${envFile} -f ${composeFile} down && docker-compose --env-file ${envFile} -f ${composeFile} up > /dev/null 2>&1
     docker restart "${containers}"  > /dev/null 2>&1
  fi
}

reboot_medic_os_services(){
  project=$1
  docker exec -it "${project}"_medic-os_1 /boot/svc-restart medic-core > /dev/null 2>&1
}

install_local_ip_cert(){
  medicOs=$1
  docker exec -it "${medicOs}" bash -c "curl -s -o server.pem http://local-ip.co/cert/server.pem" > /dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "curl -s -o chain.pem http://local-ip.co/cert/chain.pem" > /dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "cat server.pem chain.pem > /srv/settings/medic-core/nginx/private/default.crt" > /dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "curl -s -o /srv/settings/medic-core/nginx/private/default.key http://local-ip.co/cert/server.key" > /dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "/boot/svc-restart medic-core nginx" > /dev/null 2>&1
}

main (){

  validEnv="`validate_env_file $envFile`"
  if [ -n "$validEnv" ]; then
    window "CHT Docker Helper - WARNING - Missing or invalid .env File" "red" "100%"
    append "$validEnv"
    endwin
    return 0
  else
    # shellcheck disable=SC1090
    . "${envFile}"
  fi

  declare -r APP_STRING="ip;docker;docker-compose;nc;curl"
  declare -r MAX_REBOOTS=5
  declare -r DEFAULT_SLEEP=45
  declare -r MEDIC_OS="${COMPOSE_PROJECT_NAME}_medic-os_1"
  declare -r HAPROXY="${COMPOSE_PROJECT_NAME}_haproxy_1"
  declare -r ALL_CONTAINERS="${MEDIC_OS} ${HAPROXY}"

  appStatus=$(required_apps_installed)
  if [ -n "$appStatus" ]; then
    window "WARNING: Missing Apps" "red" "100%"
    append "Install before proceeding:"
    append "$appStatus"
    endwin
    return 0
  fi

  volumeCount="`volume_exists $COMPOSE_PROJECT_NAME`"
  containerCount="`get_running_container_count $ALL_CONTAINERS`"
  lanAddress="`get_lan_ip`"
  chtUrl="`get_local_ip_url $lanAddress`"
  health="`cht_healthy $lanAddress $CHT_HTTPS $chtUrl`"
  dockerComposePath="`get_docker_compose_yml_path`"

# todo remove debub output
echo "
volumeCount $volumeCount
containerCount $containerCount
lanAddress $lanAddress
chtUrl $chtUrl
ALL_CONTAINERS $ALL_CONTAINERS
"

  if [ -n "$health" ]; then
    self_signed=0
  else
    self_signed="`has_self_signed_cert $chtUrl`"
  fi

  if [ -z "$appStatus" ] && [ -z "$health" ] && [ "$self_signed" = "0" ]; then
    overAllHealth="Good"
  elif [[ "$sleep" > 0 ]]; then
    overAllHealth="Booting..."
  else
    overAllHealth="!= Bad =!"
  fi

  window "CHT Docker Helper" "green" "100%"
  append_tabbed "PROJECT|$COMPOSE_PROJECT_NAME" 2 "|"
  append_tabbed "" 2 "|"
  append_tabbed "LAN IP|$lanAddress" 2 "|"
  append_tabbed "CHT URL|$chtUrl" 2 "|"
  append_tabbed "FAUXTON URL|$chtUrl/_utils/" 2 "|"
  append_tabbed "" 2 "|"
  append_tabbed "CHT Health|$overAllHealth" 2 "|"
  append_tabbed "Running Containers|$containerCount of 2" 2 "|"
  append_tabbed "Last Action|$last_action" 2 "|"
  endwin

  ## todo - just download it for them?
  # curl -o docker-compose-developer.yml https://raw.githubusercontent.com/medic/cht-core/master/docker-compose-developer.yml
  if [ -z "$dockerComposePath" ]; then
    window "WARNING: Missing Compose File " "red" "100%"
    append "Download before proceeding: "
    append "wget https://github.com/medic/cht-core/blob/master/docker-compose-developer.yml"
    endwin
    return 0
  fi

  if [[ "$volumeCount" = 0 ]] && [[ "$reboot_count" = 0 ]]; then
    sleep=$DEFAULT_SLEEP
    last_action="First run of \"docker-compose up\""
    docker_up_or_restart $envFile $dockerComposePath $containerCount $volumeCount $ALL_CONTAINERS &
    (( reboot_count++ ))
  fi

  if [[ "$containerCount" != 2 ]] && [[ "$reboot_count" != "$MAX_REBOOTS" ]] && [[ "$sleep" = 0 ]]; then
    sleep=$DEFAULT_SLEEP
    last_action="Running \"docker-compose down\" then  \"docker-compose up\""
    docker_up_or_restart $envFile $dockerComposePath $containerCount $volumeCount $ALL_CONTAINERS &
    (( reboot_count++ ))
  fi

  if [ -n "$health" ] && [[ "$sleep" = 0 ]] && [[ "$reboot_count" != "$MAX_REBOOTS" ]]; then
    sleep=$DEFAULT_SLEEP

    # todo - decide which of these to use here

#    last_action="Restarting medic-os services in container"
#    reboot_medic_os_services &

    last_action="Running \"docker-compose down\" then  \"docker-compose up\""
    docker_up_or_restart $envFile $dockerComposePath $containerCount $volumeCount $ALL_CONTAINERS &
    (( reboot_count++ ))
  fi

  if [[ "$sleep" > 0 ]] && [ -n "$health" ]; then
    window "Attempt number $reboot_count / $MAX_REBOOTS to boot $COMPOSE_PROJECT_NAME" "yellow" "100%"
    append "Waiting $sleep..."
    endwin
    (( sleep-- ))
  fi

  if [[ "$reboot_count" = "$MAX_REBOOTS" ]] && [[ "$sleep" = 0 ]]; then
    window "Reboot max met: $reboot_count reboots" "red" "100%"
    append "Please try running this script again"
    endwin
  fi

  if [ -n "$health" ]; then
    window "WARNING: CHT Not running" "red" "100%"
    append "$health"
    endwin
    return 0
  fi

  if [ "$self_signed" = "1" ]; then
    window "WARNING: CHT has self signed certificate" "red" "100%"
    append "Installing local-ip.co certificate to fix..."
    last_action="Installing local-ip.co certificate..."
    endwin
    sleep 1
    install_local_ip_cert $MEDIC_OS&
    sleep 2
    return 0
  fi

  # if we're here, we're happy!
  sleep=0
  reboot_count=0
  last_action=" :) "
}

main_loop -t 0.5 $@