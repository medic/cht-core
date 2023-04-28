FROM alpine:3.15 AS base_build

RUN apk add --update --no-cache \
  build-base \
  curl \
  nodejs~=16 \
  npm~=8 \
  tzdata \
  bash \
  jq

WORKDIR /sentinel

COPY sentinel/ /sentinel
COPY shared-libs /shared-libs
ENV NODE_PATH=/sentinel/node_modules
RUN rm -rf /sentinel/node_modules/pouchdb-fetch/node_modules/node-fetch

ENTRYPOINT ["/bin/bash", "/sentinel/docker-entrypoint.sh", "main"]
