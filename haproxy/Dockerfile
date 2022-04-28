FROM haproxy:2.3.19

RUN apt-get update && apt-get install rsyslog luarocks gettext -y
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

ADD haproxy.cfg /usr/local/etc/haproxy
ADD haproxy.conf /etc/rsyslog.d
ADD rsyslog.conf /etc/rsyslog.conf
ADD scripts /usr/local/etc/haproxy/

ENTRYPOINT ["/entrypoint.sh"]
CMD ["-f", "/usr/local/etc/haproxy/haproxy.cfg"]
