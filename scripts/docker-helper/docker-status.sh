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

main (){

  window "containers" "green" "25%"
  if [[ $containers > 1 ]];then
    dockerPs=$(docker ps --format 'table {{.Names}}\t{{.Status}}')
    append "$dockerPs"
  else
    append "No containers running"
  fi
  endwin

  col_right
  move_up
  
  window "IPs" "green" "25%"
  containers=$(docker ps | wc -l)
  if [[ $containers > 1 ]];then
    ips=$(docker ps | awk 'NR>1{ print $1 }' | xargs docker inspect -f '{{range .NetworkSettings.Networks}}{{$.Name}}{{" "}}{{.IPAddress}}{{end}}')
    append_command "echo $ips"
  else
    append "No containers running"
  fi
  endwin

  col_right
  move_up

  window "networks" "green" "25%"
  dockerLs=$(docker network ls --format 'table {{.Name}}\t')
  append "$dockerLs"
  endwin

  col_right
  move_up

  window "volumes" "green" "25%"
  dockerVol=$(docker volume ls --format 'table {{.Name}}\t')
  append "$dockerVol"
  endwin




}

main_loop -t 1.2 $@