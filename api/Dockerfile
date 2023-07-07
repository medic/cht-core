FROM node:16 AS build-stage
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm install 

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

WORKDIR /service

COPY package.json package-lock.json ./
COPY shared-libs ./shared-libs
COPY --from=build-stage /build/node_modules/@medic ./node_modules/@medic
COPY api ./api
WORKDIR /service/api
RUN npm install 
WORKDIR /service


ENV NODE_PATH=/service/api/node_modules

ENTRYPOINT ["/bin/bash", "/service/api/docker-entrypoint.sh", "main"]
