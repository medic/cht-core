#!/bin/bash

set -e

SSL_CERT_FILE_PATH=${SSL_CERT_FILE_PATH:-"/etc/nginx/private/cert.pem"}
SSL_KEY_FILE_PATH=${SSL_KEY_FILE_PATH:-"/etc/nginx/private/key.pem"}


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

ensure_own_cert_exits(){

  if [ ! -f $SSL_CERT_FILE_PATH -a ! -f $SSL_KEY_FILE_PATH ]; then
  echo "Please provide add your certificate ($SSL_CERT_FILE_PATH) and key ($SSL_KEY_FILE_PATH) in the /etc/nginx/private/ directory"
  exit 1
  fi

  echo "SSL certificate exists." >&2

}

select_ssl_certificate_mode(){
  # Decide certificate mode and launch nginx
  echo "CERTIFICATE MODE = $CERTIFICATE_MODE"
  case $CERTIFICATE_MODE in

    OWN_CERT)
      ensure_own_cert_exits
      disable_certbot_compatability
      ;;

    AUTO_GENERATE)
      # generate self signed certs to ensure nginx can start the
      # first time before certbot can create certs. safe to run N
      # times b/c it will never overwrite existing certs
      generate_self_signed_cert
      enable_certbot_compatability
      ;;

    SELF_SIGNED)
      generate_self_signed_cert
      disable_certbot_compatability
      ;;

    *)
      echo "ssl certificate mode unknown or not set. Please set a proper ssl sertificate mode in the CERTIFICATE_MODE variable"
      exit 1
      ;;
  esac

}

disable_certbot_compatability(){
    rm -f /etc/periodic/weekly/reload-nginx.sh || true
    rm -f /etc/nginx/private/certbot/.well-known/acme-challenge/index.html || true
}

enable_certbot_compatability(){
cat > /etc/nginx/private/deploy.sh << EOF
#!/bin/sh
cp "\$RENEWED_LINEAGE/fullchain.pem" /etc/nginx/private/cert.pem
cp "\$RENEWED_LINEAGE/privkey.pem" /etc/nginx/private/key.pem
EOF

cat > /etc/periodic/weekly/reload-nginx.sh << EOF
#!/bin/sh
/usr/sbin/nginx -s reload
EOF
  crond
  chmod +x /etc/nginx/private/deploy.sh
  chmod +x /etc/periodic/weekly/reload-nginx.sh
  mkdir -p /etc/nginx/private/certbot/.well-known/acme-challenge
  echo "CERTIFICATE_MODE AUTO_GENERATE" > /etc/nginx/private/certbot/.well-known/acme-challenge/index.html
  echo "nginx configured to work with certbot"
}

prepare_android_assetlink(){
  mkdir -p /etc/nginx/private/android
}

main (){
  welcome_message
  prepare_android_assetlink
  select_ssl_certificate_mode
  echo "Launching Nginx" >&2
}

# if no arguments are provided run the main method
if [ $# -eq 0 ]; then
  main
else # run the requested argument.
  "$@"
fi
