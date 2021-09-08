#!/usr/bin/env bash

# Helper script to show running docker containers and related docker resources

# shellcheck disable=SC2046
. $(dirname $0)/simple_curses.sh

main (){

  window "Containers" "green" "100%"
  containersCount=$(docker ps | wc -l)
  if [[ $containersCount -gt 1 ]];then
    append_tabbed "NAME|IP|PORTS|STATE" 4 "|"

    containers=$(docker ps | awk '{if(NR>1) print $NF}')
    for container in $containers
    do
      upSince=$(docker ps  --format='{{.Status}}' -f="name=$container")
      ip=$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'  "$container")
      ports=$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{(index $conf 0).HostPort}} > {{$p}} {{end}}'  "$container")
      append_tabbed "$container|$ip|$ports|$upSince" 4 "|"
    done
  else
    append "No containers running"
  fi
  endwin

  move_up

  window "networks" "green" "50%"
  dockerLs=$(docker network ls --format '{{.Name}}\t')
  append "$dockerLs"
  endwin

  col_right
  move_up

  window "Medic Images" "green" "50%"
  dockerImg=$(docker image ls --format '{{.Repository}}:{{.Tag}}\t' --filter 'reference=medicmobile/*')
  append "$dockerImg"
  endwin

  window "volumes" "green" "50%"
  dockerVol=$(docker volume ls --format '{{.Name}}\t')
  append "$dockerVol"
  endwin

}

main_loop -t 1.2 $@