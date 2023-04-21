#!/usr/bin/env bash

############################################################################
# THIS VERSION IS ONLY FOR 4.X RUNNING SELF SIGNED - DEV/QA/LOCAL USE ONLY #
############################################################################

# Helper script to download the certificate and private key
# from the http://local-ip.co service and install it
# in cht-nginx container in nginx. This script is safe to re-run
# as many times as needed or if you need to refresh expired
# certificates.
#
# After running this, you get a valid certificate with the format
# of https://YOUR-IP-HERE.my.local-ip.co
#
# For example, if your localhost IP is 10.0.2.4, you would use this as
# your URL for CHT:
#
#   https://10-0-2-4.my.local-ip.co
#
# By default this will use a container called "cht-nginx".  You can specify
# the container if you have a different cht-nginx named container, like this:
#
#   ./add-local-ip-certs-to-docker-4.x.sh cht-nginx-second-container
#
# As well, you can pass a second argument to specify which cert to install
# into the specified container. There are three options:
#
#   refresh - refresh the local-ip.co certificate [default action]
#   self - re-install the original self signed certificate
#   expire - install an expired local-ip.co certificate
#
# For example if you had a container called "cht-3-14" and you wanted to
# install an expired cert, you would call:
#
# ./add-local-ip-certs-to-docker-4.x.sh cht-3-14 expire
#

container="${1:-cht-nginx}"
action="${2:-refresh}"

if ! command -v docker&> /dev/null
then
  echo ""
  echo "Docker is not installed or could not be found.  Please check your installation."
  echo ""
  exit
fi

status=$(docker inspect --format="{{.State.Running}}" $container 2> /dev/null)
if [ "$status" = "true" ]; then
  result=""
  if [ "$action" = "refresh" ]; then
    result="downloaded fresh local-ip.medicmobile.org"
    docker exec -it $container bash -c "curl -s -o /etc/nginx/private/cert.pem https://local-ip.medicmobile.org/fullchain"
    docker exec -it $container bash -c "curl -s -o /etc/nginx/private/key.pem https://local-ip.medicmobile.org/key"
  elif [ "$action" = "expire" ]; then
    result="installed expired local-ip.co"
    docker cp ./tls_certificates/local-ip-expired.crt "$container":/etc/nginx/private/cert.pem
    docker cp ./tls_certificates/local-ip-expired.key "$container":/etc/nginx/private/key.pem
  elif [ "$action" = "self" ]; then
    result="installed self-signed"
    docker cp ./tls_certificates/self-signed.crt "$container":/etc/nginx/private/cert.pem
    docker cp ./tls_certificates/self-signed.key "$container":/etc/nginx/private/key.pem
  fi

  if [ "$result" != "" ]; then
    docker restart $container
    echo ""
    echo "If just container name is shown above, a fresh local-ip.medicmobile.org certificate was ${result}."
    echo ""
  else
    echo "Invalid action specified.  Use one of 'refresh', 'expire' or 'self'. Default is 'refresh'"
  fi

else
  echo ""
  echo "Docker container '$container' is not running or wrong container name passed. "
  echo "Please start '$container' and try again or specify one of these nginx containers:"
  echo
  docker ps --filter "name=nginx"  --format "{{.Names}}"
  echo
  echo "See this URL for more information on running containers:"
  echo ""
  echo "    https://docs.communityhealthtoolkit.org/apps/tutorials/local-setup/"
  echo ""
fi
