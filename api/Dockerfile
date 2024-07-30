FROM alpine:3.19 AS base_build

RUN apk add --update --no-cache \
  build-base \
  curl \
  nodejs~=20 \
  npm~=10 \
  tzdata \
  libxslt \
  bash \
  jq

WORKDIR /service

# I don't think I need to copy the shared-libs but need to double check...
COPY shared-libs ./shared-libs
COPY api ./api

ENV NODE_PATH=/service/api/node_modules

ENTRYPOINT ["/bin/bash", "/service/api/docker-entrypoint.sh", "main"]
