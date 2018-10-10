FROM haproxy:latest

RUN apt-get update && apt-get install rsyslog luarocks -y
RUN luarocks install luasocket

ADD haproxy.cfg /usr/local/etc/haproxy
ADD haproxy.conf /etc/rsyslog.d
ADD rsyslog.conf /etc/rsyslog.conf

ADD scripts /etc/haproxy/scripts
COPY entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]
CMD ["-f", "/usr/local/etc/haproxy/haproxy.cfg"]
