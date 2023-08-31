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
COPY templates /etc/nginx/templates
COPY nginx.conf /etc/nginx/nginx.conf
COPY mime.types /etc/nginx/mime.types
COPY conf.d/ /etc/nginx/conf.d/
COPY nginx_error_pages/ /usr/share/nginx/nginx_error_pages/

# test build
FROM alpine:3 AS test_nginx
RUN apk --no-cache add bats curl openssl
RUN mkdir -p /app/bash-shellmock
RUN curl -LJO https://raw.githubusercontent.com/capitalone/bash_shell_mock/main/bin/shellmock
RUN cp shellmock /app/bash-shellmock/shellmock
RUN chmod +x /app/bash-shellmock/shellmock
COPY tests /app/tests
COPY ssl-install.sh /app/tests/ssl-install.sh
RUN bats /app/tests/ssl-install.bats

# Final
FROM base_nginx AS cht-nginx
LABEL Authors="MEDIC SRE TEAM<devops@medic.org>"
