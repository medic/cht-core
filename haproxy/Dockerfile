FROM haproxy:1.8.14

RUN apt-get update && apt-get install rsyslog luarocks gettext -y

ADD haproxy.cfg /usr/local/etc/haproxy
ADD haproxy.conf /etc/rsyslog.d
ADD rsyslog.conf /etc/rsyslog.conf
ADD scripts /usr/local/etc/haproxy/
COPY entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]
CMD ["-f", "/usr/local/etc/haproxy/haproxy.cfg"]
