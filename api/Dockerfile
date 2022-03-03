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

FROM base_build AS local_setup
RUN apk add python3
COPY . .
RUN npm install

RUN cd /webapp && npm ci --production
RUN cd /admin && npm ci --production

SHELL ["/bin/bash", "-c"]
RUN for i in $(ls -d /shared-libs/*); \
                do \
                cd "$i" && \
                npm ci && \
                echo "$i"; done

ENV COUCH_URL=http://your:pass@localhost:5984/medic
RUN /node_modules/grunt/bin/grunt build-ddocs
RUN /node_modules/grunt/bin/grunt copy-static-files-to-api
RUN /node_modules/grunt/bin/grunt uglify:api
RUN /node_modules/grunt/bin/grunt cssmin:api
RUN /node_modules/grunt/bin/grunt build-webapp
RUN /node_modules/grunt/bin/grunt build-admin
RUN /node_modules/grunt/bin/grunt build-config
RUN /node_modules/grunt/bin/grunt create-staging-doc
RUN /node_modules/grunt/bin/grunt populate-staging-doc


FROM base_build AS ci_prod

WORKDIR /api
# These COPY statements will be a different layer, then we can `docker build --trigger layer` to start from there for local build. CI would trigger to final layer and avoid all the things from local_setup
COPY --from=local_setup /shared-libs /shared-libs
COPY --from=local_setup api/build/ /api/build/
COPY api/src/ /api/src/
COPY api/resources /api/resources/
COPY /api/server.js /api/server.js
COPY api/package.json /api/package.json
COPY api/package-lock.json /api/package-lock.json
COPY api/README.md /api/README.md
COPY api/LICENSE /api/LICENSE
COPY api/docker-entrypoint.sh /api/docker-entrypoint.sh

COPY --from=local_setup /webapp /webapp
COPY --from=local_setup /admin /admin
COPY --from=local_setup /config /config

RUN npm ci --production
RUN npm dedupe


ENV NODE_PATH=/api/node_modules

ENTRYPOINT ["/bin/bash", "/api/docker-entrypoint.sh", "main"]