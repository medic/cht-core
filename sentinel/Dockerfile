FROM alpine:3.15 AS base_build

RUN apk add --update --no-cache \
  build-base \
  curl \
  nodejs~=16 \
  npm~=8 \
  tzdata \
  libxslt \
  bash \
  jq    \
  git

WORKDIR /sentinel

COPY sentinel/ /sentinel
COPY shared-libs /shared-libs

ENTRYPOINT ["/bin/bash", "/sentinel/docker-entrypoint.sh", "main"]
