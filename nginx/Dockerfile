FROM nginx:1.19.6-alpine

RUN apk add --update --no-cache \
    curl \
    socat \
    sed \
    bash \
    openssl

COPY ssl-install.sh /docker-entrypoint.d
RUN chmod 755 /docker-entrypoint.d/ssl-install.sh
COPY nginx.conf /etc/nginx/nginx.conf
COPY mime.types /etc/nginx/mime.types