#!/bin/bash

set -e 

create_self_signed_ssl_certificate()
{
  local path="$1"
  local country="$2"
  local state="$3"
  local locality="$4"
  local organization="$5"
  local department="$6"
  local common_name="$7"
  local email="$8"

  if [ -f "$path/key.pem" -a -f "$path/cert.pem" ]; then
    echo 'Certificate and key already exist; not creating' >&2
    return 0
  fi

  for i in "$country" "$state" "$locality" \
    "$organization" "$department" "$common_name" "$email"; do
    echo "$i"
  done | "openssl" req -x509 -nodes -newkey rsa:4096 \
    -keyout "$path/key.pem" -out "$path/cert.pem" -days 365 && echo

  return "$?"
}

if [ -z "$CHT_DOMAIN" ]; then
    if [ -f /etc/nginx/private/cert.pem -a -f /etc/nginx/private/key.pem ]; then
        echo "SSL Cert already exists."
    else
        mkdir -p /etc/nginx/private
        create_self_signed_ssl_certificate \
          "/etc/nginx/private/" \
          'US' 'Colorado' 'Denver' 'Medic Mobile' \
          'Department of Information Security' \
          '*.medicmobile.org' 'devops@medicmobile.org'
        echo "No SSL certs provided or Domain configured for SSL cert issue"
    fi
elif [ ! -z "$CHT_DOMAIN" ]; then 
    if [ -f /etc/nginx/private/cert.pem -a -f /etc/nginx/private/key.pem ]; then
        echo "SSL Cert already exists."
    elif [ ! -f /etc/nginx/private/cert.pem -a ! -f /etc/nginx/private/key.pem ]; then
        mkdir -p /etc/nginx/private
        curl https://get.acme.sh | sh
        if [ ! -d /root/.acme.sh/${CHT_DOMAIN} ]; then
            /root/.acme.sh/acme.sh --issue -d ${CHT_DOMAIN} --standalone
        fi
        /root/.acme.sh/acme.sh --install-cert -d ${CHT_DOMAIN} \
            --key-file /etc/nginx/private/key.pem \
            --fullchain-file /etc/nginx/private/cert.pem
        echo "SSL Cert installed. Launching nginx..."
        cat /etc/nginx/nginx.conf
    else
        echo "Misconfigured. Please set a Domain to issue SSL certs for or provide your own SSL certs. \
              Check environment variables in docker-compose.yml service: medic-nginx."
    fi
else
    echo "Something happened."
fi