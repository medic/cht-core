#!/usr/bin/env bash

# Helper script to download the certificate and private key
# from the http://local-ip.medicmobile.org service and install it
# in medic-os in nginx. This script is safe to re-run
# as many times as needed or if you need to refresh expired
# certificates.
#
# After running this, you get a valid certificate with the format
# of https://YOUR-IP-HERE.local-ip.medicmobile.org
#
# For example, if your localhost IP is 10.0.2.4, you would use this as
# your URL for CHT:
#
#   https://10-0-2-4.local-ip.medicmobile.org
#
# By default this will use a container called "medic-os".  You can specify
# the container if you have a different medic-os named container, like this:
#
#   ./add-local-ip-certs-to-docker.sh medic-os-second-container
#
# As well, you can pass a second argument to specify which cert to install
# into the specified container. There are three options:
#
#   refresh - refresh the local-ip.medicmobile.org certificate [default action]
#   self - re-install the original self signed certificate
#   expire - install an expired local-ip.medicmobile.org certificate
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

install_local_ip_cert(){
  medicOs="${1:-medic-os}"

  echo "Updating a few libraries and downloading fresh cert!"
  docker exec -it "${medicOs}" bash -c "echo '<html><head><title>Error</title></head><body><h1>Error</h1><p>Server Error - check error logs</p></body>' > /srv/storage/medic-core/nginx/data/html/50x.html" >/dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "apt update" >/dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "apt install -y libssl1.0.0 openssl libgnutls30  ca-certificates curl libcurl3-gnutls" >/dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "curl -s -o server.pem https://local-ip.medicmobile.org/cert" >/dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "curl -s -o chain.pem https://local-ip.medicmobile.org/chain" >/dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "curl -s -o /srv/settings/medic-core/nginx/private/default.key https://local-ip.medicmobile.org/key" >/dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "cat server.pem chain.pem > /srv/settings/medic-core/nginx/private/default.crt" >/dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "/boot/svc-restart medic-core nginx" >/dev/null 2>&1
}

add_missing_5xx_file(){
  medicOs="${1:-medic-os}"
  echo "Adding missing 5xx files!"
  docker exec -it "${medicOs}" bash -c "mkdir -p /srv/storage/medic-core/nginx/data/html" >/dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "echo '<html><head><title>Error</title></head><body><h1>Error</h1><p>Server Error - check error logs</p></body>' > /srv/storage/medic-core/nginx/data/html/50x.html" >/dev/null 2>&1
  docker exec -it "${medicOs}" bash -c "/boot/svc-restart medic-core nginx" >/dev/null 2>&1
}


status=$(docker inspect --format="{{.State.Running}}" "$container" 2> /dev/null)
if [ "$status" = "true" ]; then
  result=""
  if [ "$action" = "refresh" ]; then
    result="downloaded fresh local-ip.medicmobile.org"
    add_missing_5xx_file "$container"
    install_local_ip_cert "$container"
  elif [ "$action" = "expire" ]; then
    result="installed expired local-ip.medicmobile.org"
    docker cp ./tls_certificates/local-ip-expired.crt "$container":/srv/settings/medic-core/nginx/private/default.crt
    docker cp ./tls_certificates/local-ip-expired.key "$container":/srv/settings/medic-core/nginx/private/default.key
  elif [ "$action" = "self" ]; then
    result="installed self-signed"
    docker cp ./tls_certificates/self-signed.crt "$container":/srv/settings/medic-core/nginx/private/default.crt
    docker cp ./tls_certificates/self-signed.key "$container":/srv/settings/medic-core/nginx/private/default.key
  fi

  if [ "$result" != "" ]; then
    docker exec -it "$container" bash -c "/boot/svc-restart medic-core nginx"
    echo ""
    echo "If no errors output above, ${result} certificate."
    echo ""
  else
    echo "Invalid action specified.  Use one of 'refresh', 'expire' or 'self'. Default is 'refresh'"
  fi

else
  echo ""
  echo "The '$container' docker container is not running."
  echo "Please start it and try again or specify the container to use (see \"docker ps\" for list of containers)."
  echo "See this URL for more information on running containers:"
  echo ""
  echo "    https://docs.communityhealthtoolkit.org/apps/tutorials/local-setup/"
  echo ""
fi
