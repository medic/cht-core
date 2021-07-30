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
#  lanHostname=$(getent hosts $lanAddress | awk '{print $2}')
#  echo "lanHostname $lanHostname"
#  echo "routerIP $routerIP"
#  echo "LAN Interfact $lanInterface"
  echo "$lanAddress"
}

get_local_ip_url(){
  lanAddress="`get_lan_ip`"
  IFS='.' read -ra ip_array <<< $lanAddress
  url="https://${ip_array[0]}-${ip_array[1]}-${ip_array[2]}-${ip_array[3]}.my.local-ip.co"
  echo "$url"
}

is_installed(){
  APP=$1
  if ! command -v $APP&> /dev/null
  then
    echo ""
    echo "$APP is not installed or could not be found.  Please check your installation."
    echo ""
    exit
  fi
}


main (){
    #basic information, hostname, date, ...
    window "CHT Docker Helper" "red"
    append "`date`"
#    append "`is_installed ip`"
#    append "`is_installed docker`"
#    append "`is_installed horti`"
#    append "`is_installed docker-compose`"
#    append "Lan IP `get_lan_ip`"
#    append "URL `get_local_ip_url`"
    append_tabbed "CHT URL|`get_local_ip_url`" 4 "|"
#    addsep
#    append_tabbed "Up since|`uptime | cut -f1 -d"," | sed 's/^ *//' | cut -f3- -d" "`" 2 "|"
#    append_tabbed "Users:`uptime | cut -f2 -d"," | sed 's/^ *//'| cut -f1 -d" "`" 2
#    append_tabbed "`awk '{print "Load average:" $1 " " $2 " " $3}' < /proc/loadavg`" 2
    endwin


}
main_loop -t 0.5 "$@"
