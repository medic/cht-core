FROM node:22-alpine AS base_build

RUN apk add --update --no-cache \
  build-base \
  curl \
  tzdata \
  libxslt \
  bash \
  jq

WORKDIR /service

# ID 1000 is 'node' user in node:22-alpine image

COPY --chown=root:root --chmod=755  ./shared-libs ./shared-libs
COPY --chown=root:root --chmod=755  node_modules/@medic ./node_modules/@medic
COPY --chown=root:root --chmod=755  api ./api
RUN chown -R root:1000 /service/api/build/static/webapp && \
    chmod -R 775 /service/api/build/static/webapp

ENV NODE_PATH=/service/api/node_modules
USER 1000
ENTRYPOINT ["/bin/bash", "/service/api/docker-entrypoint.sh", "main"]
