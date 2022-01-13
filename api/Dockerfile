FROM alpine:3.15.0

RUN apk add --update --no-cache \
  build-base \
  nodejs-current \
  curl \
  npm \
  tzdata \
  libxslt \
  bash \
  jq    \
  git

WORKDIR /app

COPY api api/
RUN cd api && npm ci --verbose
COPY shared-libs ./api/node_modules/@medic
COPY api/src/public/ /app/api/build/public/
RUN chmod 777 /tmp

SHELL ["/bin/bash", "-c"]
RUN for i in $(ls -d /app/api/node_modules/@medic/*); \
                do \
                cd "$i" && \
                npm ci && \
                echo "$i"; done

ENV NODE_PATH=/app/api/node_modules

ENTRYPOINT ["/bin/bash", "/app/api/docker-entrypoint.sh", "main"]