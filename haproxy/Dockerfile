FROM haproxy:2.6

USER root
RUN apt-get update && apt-get install rsyslog luarocks gettext jq curl -y
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

ADD default_frontend.cfg /usr/local/etc/haproxy
ADD backend.cfg.template /usr/local/etc/haproxy
COPY scripts /usr/local/etc/haproxy/

ENTRYPOINT ["/entrypoint.sh"]
