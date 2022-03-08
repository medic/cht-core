FROM alpine:3.15

RUN apk add --update --no-cache \
  build-base \
  curl \
  nodejs~=16 \
  npm~=8 \
  tzdata \
  libxslt \
  bash \
  jq    \
  netcat-openbsd \
  git

COPY /shared-libs /shared-libs
SHELL ["/bin/bash", "-c"]
RUN for i in $(ls -d /shared-libs/*); \
                do \
                cd "$i" && \
                npm ci && \
                echo "$i"; done


COPY /sentinel/src /sentinel/src
COPY /sentinel/package-lock.json /sentinel/package-lock.json
COPY /sentinel/package.json /sentinel/package.json
COPY /sentinel/docker-entrypoint.sh /sentinel/docker-entrypoint.sh
COPY /sentinel/server.js /sentinel/server.js

RUN cd sentinel && npm ci --verbose

ENV NODE_PATH=/sentinel/node_modules

ENTRYPOINT ["/bin/bash", "/sentinel/docker-entrypoint.sh"]