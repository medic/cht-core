FROM alpine:3.12.3

RUN apk add --update --no-cache \
  build-base \
  nodejs-current \
  curl \
  npm \
  tzdata \
  libxslt \
  bash \
  jq    \
  netcat-openbsd \
  git

WORKDIR /app

COPY ./sentinel ./sentinel

RUN cd sentinel && npm ci --verbose
COPY ./shared-libs ./sentinel/node_modules/@medic

SHELL ["/bin/bash", "-c"]
RUN for i in $(ls -d /app/sentinel/node_modules/@medic/*); \
                do \
                cd "$i" && \
                npm ci && \
                echo "$i"; done

ENV NODE_PATH=/app/sentinel/node_modules

ENTRYPOINT ["/bin/bash", "/app/sentinel/docker-entrypoint.sh"]