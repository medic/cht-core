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
  git

WORKDIR /api

COPY ./shared-libs /shared-libs

COPY api/src/ /api/src/
COPY /api/server.js /api/server.js
COPY api/package.json /api/package.json
COPY api/package-lock.json /api/package-lock.json
COPY api/README.md /api/README.md
COPY api/LICENSE /api/LICENSE
COPY api/docker-entrypoint.sh /api/docker-entrypoint.sh

COPY ./api/src/public/ /api/build/static

RUN npm ci --production
RUN npm dedupe

# COPY ./shared-libs /api/node_modules/@medic
# COPY ./api/src/public/ /api/build/public

# SHELL ["/bin/bash", "-c"]
# RUN for i in $(ls -d /app/api/node_modules/@medic/*); \
#                do \
#                cd "$i" && \
#                npm ci && \
#                echo "$i"; done

ENV NODE_PATH=/api/node_modules

ENTRYPOINT ["/bin/bash", "/api/docker-entrypoint.sh", "main"]