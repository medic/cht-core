# base build
FROM nginx:1.19.6-alpine as base_nginx
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

# test build
FROM base_nginx as test_nginx
RUN apk add bash
WORKDIR /app
#add symbolic link to script for easy access by tests
RUN ln -s /docker-entrypoint.d/ssl-install.sh /app/ssl-install.sh
RUN mkdir tests
COPY tests tests

# Final
FROM base_nginx AS cht-nginx
LABEL Authors="MEDIC SRE TEAM<devops@medic.org>"
