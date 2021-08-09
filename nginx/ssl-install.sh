#!/bin/bash

set -e


# sets variables required to create a self signed certificate
set_environment_variables_if_not_set(){

  if [[ -z "${COUNTRY}" ]]; then
  COUNTRY="US"
  fi

  if [[ -z "${STATE}" ]]; then
  STATE="Colorado"
  fi

  if [[ -z "${LOCALITY}" ]]; then
  LOCALITY="Denver"
  fi

  if [[ -z "${ORGANISATION}" ]]; then
  ORGANISATION="medic"
  fi

  if [[ -z "${DEPARTMENT}" ]]; then
  DEPARTMENT="Department of Information Security"
  fi

  if [[ -z "${COMMON_NAME}" ]]; then
  COMMON_NAME="test.medic.org"
  fi

  if [[ -z "${EMAIL}" ]]; then
  EMAIL="domains@medic.org"
  fi
}
#Creates Self signed certificates if they do not exist
create_self_signed_ssl_certificate()
{

  mkdir -p /etc/nginx/private
  set_environment_variables_if_not_set

  local path="/etc/nginx/private"

  if [ -f "$path/key.pem" -a -f "$path/cert.pem" ]; then
    echo 'Certificate and key already exist; not creating' >&2
    return 0
  fi

  openssl req -x509 -nodes -newkey rsa:4096 \
    -keyout "$path/key.pem" -out "$path/cert.pem" -days 365 \
    -subj "/emailAddress=$EMAIL/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANISATION/OU=$DEPARTMENT/CN=$COMMON_NAME"

  return "$?"
}

generate_self_signed_cert(){
  if [ -f /etc/nginx/private/cert.pem -a -f /etc/nginx/private/key.pem ]; then
        echo "self signed SSL cert already exists." >&2
    else
        create_self_signed_ssl_certificate \
        echo "self signed certificate for $COMMON_NAME generated" >&2
    fi
}

generate_certificate_letsencrypt(){

  if [ -z "$CHT_DOMAIN" ]; then
  echo "Mandatory CHT_DOMAIN variable not set. Please provide the domain for which to generate the ssl certificate from let's encrpty " >&2
  exit 1
  fi

  if [ -f /etc/nginx/private/cert.pem -a -f /etc/nginx/private/key.pem ]; then
        echo "SSL cert already exists." >&2
  elif [ ! -f /etc/nginx/private/cert.pem -a ! -f /etc/nginx/private/key.pem ]; then
        mkdir -p /etc/nginx/private
        curl https://get.acme.sh | sh -s email=$EMAIL
        if [ ! -d /root/.acme.sh/${CHT_DOMAIN} ]; then
            /root/.acme.sh/acme.sh --issue -d ${CHT_DOMAIN} --standalone
        fi
        /root/.acme.sh/acme.sh --install-cert -d ${CHT_DOMAIN} \
            --key-file /etc/nginx/private/key.pem \
            --fullchain-file /etc/nginx/private/cert.pem
        echo "SSL Cert installed." >&2
  fi
}

ensure_own_cert_exits(){

  if [ ! -f /etc/nginx/private/cert.pem -a ! -f /etc/nginx/private/key.pem ]; then
  echo "Please provide add your certificate (/etc/nginx/private/cert.pem) and key (/etc/nginx/private/key.pem) in the /etc/nginx/private/ directory"
  exit 1
  fi

  echo "SSL certificates exist." >&2

}


# Decide certificate mode and launch nginx

case $CERTIFICATE_MODE in

  OWN_CERT)
    ensure_own_cert_exits
    ;;

  LETS_ENCRYPT_GENERATE)
    generate_certificate_letsencrypt
    ;;

  SELF_SIGNED)
    generate_self_signed_cert
    ;;

  *)
   echo "ssl certificate mode unknown or not set. Please set a proper ssl sertificate mode in the CERTIFICATE_MODE variable "
   exit 1
    ;;
esac


echo "Launching Nginx" >&2