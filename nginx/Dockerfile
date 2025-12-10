# base build
FROM nginx:1.29.4-alpine AS base_nginx
RUN apk add --update --no-cache \
    curl \
    socat \
    sed \
    bash \
    openssl

COPY ssl-install.sh /docker-entrypoint.d
RUN chmod 755 /docker-entrypoint.d/ssl-install.sh
COPY templates /etc/nginx/templates
COPY nginx.conf /etc/nginx/nginx.conf
COPY mime.types /etc/nginx/mime.types
COPY conf.d/ /etc/nginx/conf.d/
COPY nginx_error_pages/ /usr/share/nginx/nginx_error_pages/

# Final
FROM base_nginx AS cht-nginx
LABEL Authors="MEDIC SRE TEAM<devops@medic.org>"
