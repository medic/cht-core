# base build
FROM nginx:1.25.1-alpine AS base_nginx
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

# Test environment build stage for running JavaScript tests
# This stage is independent of the final Nginx image and focuses on testing
FROM node:22-alpine AS test_nginx

RUN mkdir -p /tests/js /tests/nginx

RUN apk add --no-cache bash

COPY ssl-install.sh /tests/nginx/
COPY nginx_error_pages /tests/nginx/nginx_error_pages

WORKDIR /tests/js
COPY tests/*.spec.js ./
COPY tests/package.json ./
RUN npm install --ignore-scripts
# Set the default command for this stage to run the tests.
# This can be overridden in docker-compose.yml.
CMD ["npm", "test"]

# Final
FROM base_nginx AS cht-nginx
LABEL Authors="MEDIC SRE TEAM<devops@medic.org>"
