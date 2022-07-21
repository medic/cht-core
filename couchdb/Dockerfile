FROM couchdb:2.3.1 as base_couchdb_build

# Add configuration
COPY --chown=couchdb:couchdb 10-docker-default.ini /opt/couchdb/etc/default.d/
COPY --chown=couchdb:couchdb vm.args /opt/couchdb/etc/

COPY docker-entrypoint.sh /usr/local/bin
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

COPY --chown=couchdb:couchdb set-up-cluster.sh /opt/couchdb/etc/set-up-cluster.sh
RUN chmod +x /opt/couchdb/etc/set-up-cluster.sh

RUN apt install -y apt-transport-https gnupg
#RUN curl https://couchdb.apache.org/repo/keys.asc | gpg --dearmor | tee /usr/share/keyrings/couchdb-archive-keyring.gpg >/dev/null 2>&1
#RUN echo "deb https://apache.jfrog.io/artifactory/couchdb-deb/ bionic main" > /etc/apt/sources.list.d/couchdb.list
#RUN cat /etc/apt/sources.list.d/couchdb.list
RUN apt-get update && apt-get install -y jq

VOLUME /opt/couchdb/data

# 5984: Main CouchDB endpoint
# 4369: Erlang portmap daemon (epmd)
# 9100: CouchDB cluster communication port
EXPOSE 5984 4369 9100
CMD ["/opt/couchdb/bin/couchdb"]

# Test build
FROM ghcr.io/ffurrer2/bats:1.6.0 as test_couchdb_build
RUN apk --no-cache add curl
ENTRYPOINT [ "/bin/bash", "/app/tests.sh" ]

# Final
FROM base_couchdb_build AS cht-couchdb
LABEL Authors="MEDIC SRE TEAM<devops@medic.org>"
