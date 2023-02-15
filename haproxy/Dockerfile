FROM haproxy:2.6

USER root
RUN apt-get update && apt-get install rsyslog luarocks gettext jq curl -y
USER haproxy

COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

ADD default_frontend.cfg /usr/local/etc/haproxy
ADD backend.cfg.template /usr/local/etc/haproxy
ADD rsyslog.conf /etc/rsyslog.conf
COPY scripts /usr/local/etc/haproxy/

ENTRYPOINT ["/entrypoint.sh"]
CMD ["-f", "/usr/local/etc/haproxy/default_frontend.cfg", "-f", "/usr/local/etc/haproxy/backend.cfg"]
