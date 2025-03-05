FROM couchdb:3.4.2-nouveau

COPY --chown=nouveau:nouveau nouveau.yaml /opt/nouveau/etc/nouveau.yaml

VOLUME /data/nouveau

# 5987: Nouveau App
# 5989: Nouveau Admin
EXPOSE 5987 5989

LABEL Authors="MEDIC SRE TEAM<devops@medic.org>"
