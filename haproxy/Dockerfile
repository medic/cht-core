FROM haproxy:2.5.6

USER root
RUN apt-get update && apt-get install rsyslog luarocks gettext -y
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh
RUN chown haproxy:haproxy /entrypoint.sh

USER haproxy
ADD haproxy.cfg /usr/local/etc/haproxy
ADD haproxy.conf /etc/rsyslog.d
ADD rsyslog.conf /etc/rsyslog.conf
ADD scripts /usr/local/etc/haproxy/
COPY entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]
CMD ["-f", "/usr/local/etc/haproxy/haproxy.cfg"]
