FROM node:16alpine-3.15

RUN apk add --update --no-cache \
  build-base \
  curl \
  npm-8.3.0-r0 \
  tzdata \
  libxslt \
  bash \
  jq    \
  git

WORKDIR /api

COPY api/src/ /src/
COPY /api/server.js /src/server.js
COPY api/package.json /package.json
COPY api/package-lock.json /package-lock.json
COPY api/README.md /README.md
COPY api/LICENSE /LICENSE

RUN npm ci --production
RUN npm dedupe

ENV NODE_PATH=/app/api/node_modules

ENTRYPOINT ["/bin/bash", "/app/api/docker-entrypoint.sh", "main"]