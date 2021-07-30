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
  routerIP=$(ip r | grep default | awk '{print $3}')
  subnet=$(echo $routerIP|cut -d'.' -f1,2,3)
  lanInterface=$(ip r | grep $subnet| grep default | cut -d' ' -f 5)
  lanAddress=$(ip a s $lanInterface | awk '/inet /{gsub(/\/.*/,"");print $2}')
  lanHostname=$(getent hosts $lanAddress | awk '{print $2}')
#    echo "lanHostname $lanHostname"
#    echo "routerIP $routerIP"
#    echo "LAN Interfact $lanInterface"
  echo "$lanAddress"
}

get_local_ip_url(){
  cookedLanAddress=$(echo "`get_lan_ip`"|tr . -)
  url="https://${cookedLanAddress}.my.local-ip.co"
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

main (){
  lanAddress="`get_lan_ip`"
  lanPort="443"
  chtUrl="`get_local_ip_url`"

  appsString="ip;docker;horti;docker-compose;docker;nc"
  appStatus=`required_apps_installed $appsString`
  health="`cht_healthy $lanAddress $lanPort $chtUrl`"
  if [ -n "$health" ]; then
    self_signed=0
  else
    self_signed="`has_self_signed_cert $chtUrl`"
  fi

  if [ -z "$appStatus" ] && [ -z "$health" ] && [ "$self_signed" = "0" ]; then
    overAllHealth="Good"
  else
    overAllHealth="*** Bad - see errors below ***"
  fi

  window "CHT Docker Helper" "green" "50%"
  append_tabbed "LAN IP|$lanAddress" 2 "|"
  append_tabbed "CHT URL|$chtUrl" 2 "|"
  append_tabbed "" 2 "|"
  append_tabbed "CHT Health|$overAllHealth" 2 "|"
  endwin

  if [ -n "$appStatus" ]; then
    window "WARNING: Missing Apps" "red" "50%"
    append "Please install these before proceeding $appStatus"
    endwin
  fi

  if [ -n "$health" ]; then
    window "WARNING: CHT Not running" "red" "50%"
    append "Please try restarting the docker-compose command"
    append "$health"
    endwin
  fi

  if [ "$self_signed" = "1" ]; then
    window "WARNING: CHT has self signed certificate" "red" "50%"
    append "Please install a valid certificate"
    endwin
  fi



}
main_loop -t 0.5 "$@"