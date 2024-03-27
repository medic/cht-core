FROM couchdb:3.3.3 as base_couchdb_build

COPY --chown=couchdb:couchdb 10-docker-default.ini /opt/couchdb/etc/default.d/
COPY --chown=couchdb:couchdb vm.args /opt/couchdb/etc/

COPY docker-entrypoint.sh /usr/local/bin
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

COPY set-up-cluster.sh /opt/couchdb/etc/set-up-cluster.sh

RUN apt-get update && apt-get install -y jq

VOLUME /opt/couchdb/data

# 5984: Main CouchDB endpoint
# 4369: Erlang portmap daemon (epmd)
# 9100: CouchDB cluster communication port
EXPOSE 5984 4369 9100
CMD ["/opt/couchdb/bin/couchdb"]


# Test build
FROM alpine:3 AS test_couchdb_build
RUN apk --no-cache add bash bats curl jq openssl
COPY tests /app/tests
COPY set-up-cluster.sh /app/set-up-cluster.sh
CMD [ "/app/tests/tests.sh" ]


# Final
FROM base_couchdb_build AS cht-couchdb
LABEL Authors="MEDIC SRE TEAM<devops@medic.org>"
