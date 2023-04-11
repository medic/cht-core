#!/usr/bin/env bash

# Helper script to download the certificate and private key
# from the http://local-ip.co service and install it
# in medic-os in nginx. This script is safe to re-run
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
# By default this will use a container called "medic-os".  You can specify
# the container if you have a different medic-os named container, like this:
#
#   ./add-local-ip-certs-to-docker.sh medic-os-second-container
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
# ./add-local-ip-certs-to-docker.sh cht-3-14 expire
#

container="${1:-medic-os}"
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
    result="downloaded fresh local-ip.co"
    docker exec -it $container bash -c "curl -s -o server.pem http://local-ip.co/cert/server.pem"
    docker exec -it $container bash -c "curl -s -o chain.pem http://local-ip.co/cert/chain.pem"
    docker exec -it $container bash -c "cat server.pem chain.pem > /srv/settings/medic-core/nginx/private/default.crt"
    docker exec -it $container bash -c "curl -s -o /srv/settings/medic-core/nginx/private/default.key http://local-ip.co/cert/server.key"
  elif [ "$action" = "expire" ]; then
    result="installed expired local-ip.co"
    docker cp ./tls_certificates/local-ip-expired.crt "$container":/srv/settings/medic-core/nginx/private/default.crt
    docker cp ./tls_certificates/local-ip-expired.key "$container":/srv/settings/medic-core/nginx/private/default.key
  elif [ "$action" = "self" ]; then
    result="installed self-signed"
    docker cp ./tls_certificates/self-signed.crt "$container":/srv/settings/medic-core/nginx/private/default.crt
    docker cp ./tls_certificates/self-signed.key "$container":/srv/settings/medic-core/nginx/private/default.key
  fi

  if [ "$result" != "" ]; then
    docker exec -it $container bash -c "/boot/svc-restart medic-core nginx"
    echo ""
    echo "If no errors output above, ${result} certificate."
    echo ""
  else
    echo "Invalid action specified.  Use one of 'refresh', 'expire' or 'self'. Default is 'refresh'"
  fi

else
  echo ""
  echo "'$container' docker container is not running. Please start it and try again."
  echo "See this URL for more information on running containers:"
  echo ""
  echo "    https://docs.communityhealthtoolkit.org/apps/tutorials/local-setup/"
  echo ""
fi
