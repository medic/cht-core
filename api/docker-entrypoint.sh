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
  node --inspect=0.0.0.0:9229 --expose-gc /service/api/server.js
}

"$@"
