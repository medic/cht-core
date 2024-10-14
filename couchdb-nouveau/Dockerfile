FROM couchdb:3.4.1-nouveau AS base

# temporary fix https://github.com/apache/couchdb/issues/5262
RUN apt-get update && apt-get install -y wget unzip
RUN wget https://github.com/user-attachments/files/17186496/nouveau-1.0-SNAPSHOT-4299acf4.jar.zip -O /tmp/nouveau-4299acf4.jar.zip
RUN unzip /tmp/nouveau-4299acf4.jar.zip -d /tmp

FROM couchdb:3.4.1-nouveau

COPY --chown=nouveau:nouveau --from=base /tmp/nouveau-1.0-SNAPSHOT-4299acf4.jar /opt/nouveau/lib/nouveau-1.0-SNAPSHOT.jar
COPY --chown=nouveau:nouveau nouveau.yaml /opt/nouveau/etc/nouveau.yaml

VOLUME /data/nouveau

# 5987: Nouveau App
# 5989: Nouveau Admin
EXPOSE 5987 5989

LABEL Authors="MEDIC SRE TEAM<devops@medic.org>"
