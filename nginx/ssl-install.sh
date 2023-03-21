#!/bin/bash

set -e

SSL_CERT_FILE_PATH=/etc/nginx/private/${SSL_CERT_FILE_PATH:-"cert.pem"}
SSL_KEY_FILE_PATH=/etc/nginx/private/${SSL_KEY_FILE_PATH:-"key.pem"}

welcome_message(){
  echo "Running SSL certificate checks">&2
}

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
  openssl req -x509 -nodes -newkey rsa:4096 \
    -keyout $SSL_KEY_FILE_PATH -out $SSL_CERT_FILE_PATH -days 365 \
    -subj "/emailAddress=$EMAIL/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANISATION/OU=$DEPARTMENT/CN=$COMMON_NAME"

  return "$?"
}

generate_self_signed_cert(){
  if [ -f $SSL_CERT_FILE_PATH -a -f $SSL_KEY_FILE_PATH ]; then
        echo "self signed SSL cert already exists." >&2
    else
        create_self_signed_ssl_certificate \
        echo "self signed certificate for $COMMON_NAME generated" >&2
    fi
}

generate_certificate_auto(){

  if [ -z "$COMMON_NAME" ]; then
    echo "Mandatory COMMON_NAME variable not set. Please provide the domain for which to generate the ssl certificate from let's encrypt" >&2
    exit 1
  fi

  if [ -z "$EMAIL" ]; then
    echo "Mandatory EMAIL variable not set. Please provide the domain for which to generate the ssl certificate from let's encrypt" >&2
    exit 1
  fi

  if [ -f $SSL_CERT_FILE_PATH -a -f $SSL_KEY_FILE_PATH ]; then
        echo "SSL cert already exists." >&2
  elif [ ! -f $SSL_CERT_FILE_PATH -a ! -f $SSL_KEY_FILE_PATH ]; then
        mkdir -p /etc/nginx/private
        curl https://get.acme.sh | sh -s email=$EMAIL

        # add acme.sh to path
        export PATH="/root/.acme.sh/:$PATH"
        if [ ! -f /root/.acme.sh/${COMMON_NAME}/fullchain.cer ]; then
            acme.sh --issue -d ${COMMON_NAME} --standalone --server letsencrypt
        fi
        acme.sh --install-cert -d ${COMMON_NAME} \
            --key-file $SSL_KEY_FILE_PATH \
            --fullchain-file $SSL_CERT_FILE_PATH
        echo "SSL Cert installed." >&2
  fi
}

ensure_own_cert_exists(){

  if [ ! -f $SSL_CERT_FILE_PATH -a ! -f $SSL_KEY_FILE_PATH ]; then
  echo "Certificate files not found - please save your cert to '$SSL_CERT_FILE_PATH' and key to '$SSL_KEY_FILE_PATH'"
  exit 1
  fi

  echo "SSL certificate exists." >&2

}

select_ssl_certificate_mode(){
  # Decide certificate mode and launch nginx
  echo "CERTIFICATE MODE = $CERTIFICATE_MODE"
  case $CERTIFICATE_MODE in

    OWN_CERT)
      ensure_own_cert_exists
      ;;

    AUTO_GENERATE)
      generate_certificate_auto
      ;;

    SELF_SIGNED)
      generate_self_signed_cert
      ;;

    *)
      echo "ssl certificate mode unknown or not set. Please set a proper ssl sertificate mode in the CERTIFICATE_MODE variable"
      exit 1
      ;;
  esac

}

update_nginx_conf(){
  # Place environment variables into config
  envsubst < "/etc/nginx/nginx.conf" > "/etc/nginx/nginx.conf"
}

main (){
  welcome_message
  select_ssl_certificate_mode
  update_nginx_conf
  echo "Launching Nginx" >&2
}

# if no arguments are provided run the main method
if [ $# -eq 0 ]; then
  main
else # run the requested argument.
  "$@"
fi
