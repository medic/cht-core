#!/usr/bin/env bash

info()
{
    echo "Info: $*"
}

welcome_message(){
  info 'Starting CHT Sentinel'
}

main(){
  welcome_message
  node /sentinel/server.js
}

"$@"
