#!/usr/bin/env bash

info()
{
    echo "Info: $*"
}

welcome_message(){
  info 'Starting CHT API'
}

main(){
  welcome_message
  node /service/api/server.js
}

"$@"
