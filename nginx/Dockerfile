# base build

FROM nginx:1.24.0-alpine as base_nginx
RUN apk add --update --no-cache \
    curl \
    socat \
    sed \
    bash \
    openssl
RUN apk add nginx-mod-http-lua=1.24.0-r2 --repository=https://dl-cdn.alpinelinux.org/alpine/edge/main

# install nginx-lua-prometheus
RUN curl -Lo /nginx-lua-prometheus.tar.gz https://github.com/knyar/nginx-lua-prometheus/archive/0.20221218.tar.gz
RUN tar -C / -xvzf /nginx-lua-prometheus.tar.gz

COPY ssl-install.sh /docker-entrypoint.d
RUN chmod 755 /docker-entrypoint.d/ssl-install.sh
COPY templates /etc/nginx/templates
COPY nginx.conf /etc/nginx/nginx.conf
COPY mime.types /etc/nginx/mime.types

# test build
FROM ghcr.io/ffurrer2/bats:1.6.0 as test_nginx
RUN apk --no-cache add curl openssl
RUN mkdir -p /app/bash-shellmock
RUN curl -LJO https://raw.githubusercontent.com/capitalone/bash_shell_mock/main/bin/shellmock
RUN cp shellmock /app/bash-shellmock/shellmock
RUN chmod +x /app/bash-shellmock/shellmock
COPY ssl-install.sh /app/ssl-install.sh
ENV PATH="${PATH}:/app/"
ENTRYPOINT [ "/bin/bash", "/usr/local/bin/bats", "/app/tests.bats" ]

# Final
FROM base_nginx AS cht-nginx
LABEL Authors="MEDIC SRE TEAM<devops@medic.org>"
