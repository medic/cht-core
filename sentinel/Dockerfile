FROM alpine:3.19 AS base_build

RUN apk add --update --no-cache \
  build-base \
  curl \
  nodejs~=20 \
  npm~=10 \
  tzdata \
  bash \
  jq

WORKDIR /service

COPY sentinel ./sentinel

ENV NODE_PATH=/service/sentinel/node_modules

ENTRYPOINT ["/bin/bash", "/service/sentinel/docker-entrypoint.sh", "main"]
