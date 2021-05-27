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
# https://10-0-2-4.my.local-ip.co

if ! command -v docker&> /dev/null
then
  echo ""
  echo "Docker is not installed or could not be found.  Please check your installation."
  echo ""
  exit
fi

if [ "$( docker container inspect -f '{{.State.Status}}' 'medic-os' )" == "running" ]; then
  docker exec -it medic-os bash -c "curl -s -o server.pem http://local-ip.co/cert/server.pem"
  docker exec -it medic-os bash -c "curl -s -o chain.pem http://local-ip.co/cert/chain.pem"
  docker exec -it medic-os bash -c "cat server.pem chain.pem > /srv/settings/medic-core/nginx/private/default.crt"
  docker exec -it medic-os bash -c "curl -s -o /srv/settings/medic-core/nginx/private/default.key http://local-ip.co/cert/server.key"
  docker exec -it medic-os bash -c "/boot/svc-restart medic-core nginx"
  echo ""
  echo "If no errors output above, certificates successfully installed."
  echo ""
else
  echo ""
  echo "'medic-os' docker container is not running. Please start it and try again."
  echo "See this URL for more information:"
  echo ""
  echo "    https://docs.communityhealthtoolkit.org/apps/tutorials/local-setup/"
  echo ""
fi
