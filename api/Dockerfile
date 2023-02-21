FROM alpine:3.17 AS base_build

RUN apk add --update --no-cache \
  build-base \
  curl \
  nodejs~=18 \
  npm~=9 \
  tzdata \
  libxslt \
  bash \
  jq

WORKDIR /api

COPY api/ /api
COPY shared-libs /shared-libs
ENV NODE_PATH=/api/node_modules

ENTRYPOINT ["/bin/bash", "/api/docker-entrypoint.sh", "main"]
