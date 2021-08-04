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


. `dirname $0`/simple_curses.sh
#. `dirname $0`/helper_helpers.sh

get_lan_ip(){
  routerIP=$(ip r | grep default | head -n1 | awk '{print $3}')
  subnet=$(echo $routerIP|cut -d'.' -f1,2,3)
  if [ -z $subnet ];then
    subnet=127.0.0
  fi
  lanInterface=$(ip r | grep $subnet| grep default | head -n1 | cut -d' ' -f 5)
  lanAddress=$(ip a s $lanInterface | awk '/inet /{gsub(/\/.*/,"");print $2}' | head -n1)
#  lanHostname=$(getent hosts $lanAddress | awk '{print $2}')

#  echo "routerIP $routerIP"
#  echo "subnet $subnet"
#  echo "lanInterface $lanInterface"
#  echo "lanHostname $lanHostname"
  echo "$lanAddress"
}

get_local_ip_url(){
  cookedLanAddress=$(echo "`get_lan_ip`"|tr . -)
  url="https://${cookedLanAddress}.my.local-ip.co:${CHT_HTTPS}"
  echo "$url"
}

is_installed(){
  APP=$1
  if ! command -v $APP&> /dev/null
  then
    echo "$APP  "
  fi
}

required_apps_installed(){
  appsString=$1
  error=''
  IFS=';' read -ra appsArray <<< "$appsString"
  for i in "${appsArray[@]}"
  do
      thisError="`is_installed $i`"
      error="$thisError$error"
  done
  echo "$error"
}

port_open(){
  ip=$1
  port=$2
  nc -z $ip $port; echo $?
}

has_self_signed_cert(){
  url=$1
  curl --insecure -vvI $url 2>&1 | grep -c "self signed certificate"
}

cht_healthy(){
  cht_ip=$1
  cht_port=$2
  cht_url=$3
  port_open="`port_open $cht_ip $cht_port`"
  if [ "$port_open" = "0" ];then
    http_code="`curl -k --silent --show-error --head $cht_url --write-out '%{http_code}'|tail -n1`"
    if [ "$http_code" != "200" ];then
      echo "CHT is returning $http_code instead of 200."
    fi
  else
    echo "Port $cht_port is not open on $cht_ip"
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
  . "${envFile}"
  if [ -z "$COMPOSE_PROJECT_NAME" ] || [ -z "$CHT_HTTP" ] || [ -z "$CHT_HTTPS" ]; then
    echo "Missing env value in file: COMPOSE_PROJECT_NAME, CHT_HTTP or CHT_HTTPS"
  fi
}


# thanks https://yaroslavgrebnov.com/blog/bash-docker-check-container-existence-and-status/
container_status(){
  project=$1
  result=''
  containers=(""${project}"_medic-os_1" ""${project}"_haproxy_1")

  for container in "${containers[@]}"; do
    if [ "$( docker ps -f name="${container}" | wc -l )" -ne 2 ]; then
      result="${container} not running. ${result}"
    fi
  done

  echo "$result"
}

volume_exists(){
  project=$1
  volume=""${project}"_medic-data"
  infoLines="$( docker volume inspect "${volume}" 2>&1  | wc -l )"
  if [ "$infoLines" -eq 2 ]; then
    echo "${volume}"
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
  envFile=$1
  composeFile=$2
  docker-compose --env-file ${envFile} -f ${composeFile} restart -d > /dev/null 2>&1
}

main (){

  validEnv="`validate_env_file $envFile`"
  if [ -n "$validEnv" ]; then
    window "CHT Docker Helper - WARNING - Missing or invalid .env File" "red" "100%"
    append "$validEnv"
    endwin
    return 0
  else
    . "${envFile}"
  fi

  volumeExists="`volume_exists $COMPOSE_PROJECT_NAME`"
  appsString="ip;docker;docker-compose;nc;curl"
  lanAddress="`get_lan_ip`"
  chtUrl="`get_local_ip_url`"
  appStatus=`required_apps_installed $appsString`
  health="`cht_healthy $lanAddress $CHT_HTTPS $chtUrl`"
  dockerComposePath="`get_docker_compose_yml_path`"

  if [ -n "$health" ]; then
    self_signed=0
  else
    self_signed="`has_self_signed_cert $chtUrl`"
  fi

  if [ -z "$appStatus" ] && [ -z "$health" ] && [ "$self_signed" = "0" ]; then
    overAllHealth="Good"
  else
    overAllHealth="!= Bad =!"
  fi

  window "CHT Docker Helper" "green" "100%"
  append_tabbed "PROJECT|$COMPOSE_PROJECT_NAME" 2 "|"
  append_tabbed "" 2 "|"
  append_tabbed "LAN IP|$lanAddress" 2 "|"
  append_tabbed "CHT URL|$chtUrl" 2 "|"
  append_tabbed "" 2 "|"
  append_tabbed "CHT Health|$overAllHealth" 2 "|"
  endwin

  if [ -n "$appStatus" ]; then
    window "WARNING: Missing Apps" "red" "100%"
    append "Install before proceeding:"
    append "$appStatus"
    endwin
    return 0
  fi

  ## todo - just download it for them?
  # curl -o docker-compose-developer.yml https://raw.githubusercontent.com/medic/cht-core/master/docker-compose-developer.yml
  if [ -z "$dockerComposePath" ]; then
    window "WARNING: Missing Compose File " "red" "100%"
    append "Download before proceeding: "
    append "wget https://github.com/medic/cht-core/blob/master/docker-compose-developer.yml"
    endwin
    return 0
  fi

  if [ -n "$volumeExists" ] && [[ "$reboot_count" = 0 ]]; then
    sleep=30
    docker_up_or_restart $envFile $dockerComposePath &
    (( reboot_count++ ))
  fi

  if [[ "$sleep" > 0 ]]; then
    window "Attempting to boot $COMPOSE_PROJECT_NAME for $reboot_count time" "yellow" "100%"
    append "Waiting $sleep..."
    endwin
    (( sleep-- ))
  fi

  if [ -n "$health" ]; then
    window "WARNING: CHT Not running" "red" "100%"
    append "$health"
    endwin
    return 0
  fi

  if [ "$self_signed" = "1" ]; then
    window "WARNING: CHT has self signed certificate" "red" "100%"
    endwin
    return 0
  fi

}

main_loop -t 0.5 $@