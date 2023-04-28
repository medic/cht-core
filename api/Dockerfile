FROM alpine:3.15 AS base_build

RUN apk add --update --no-cache \
  build-base \
  curl \
  nodejs~=16 \
  npm~=8 \
  tzdata \
  libxslt \
  bash \
  jq

WORKDIR /api

COPY api/ /api
COPY shared-libs /shared-libs
ENV NODE_PATH=/api/node_modules

ENTRYPOINT ["/bin/bash", "/api/docker-entrypoint.sh", "main"]
