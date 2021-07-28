#!/usr/bin/env bash

# Helper functions for the helper script

get_lan_ip(){
  lanInterface=$(ip a | awk '/: e/{gsub(/:/,"");print $2}' | head -n 1)
  lanAddress=$(ip a s $lanInterface | awk '/inet /{gsub(/\/.*/,"");print $2}')
  lanHostname=$(getent hosts $lanAddress | awk '{print $2}')
  routerIP=$(ip r | grep default | awk '{print $3}')
  echo $lanAddress
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
