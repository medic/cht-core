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

COPY package.json package-lock.json ./
COPY shared-libs ./shared-libs
COPY node_modules/@medic ./node_modules/@medic
COPY api ./api

ENV NODE_PATH=/service/api/node_modules

ENTRYPOINT ["/bin/bash", "/service/api/docker-entrypoint.sh", "main"]
