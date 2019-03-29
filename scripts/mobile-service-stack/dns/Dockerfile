FROM debian:stretch-slim

RUN set -x \
	&& apt-get update \
	&& apt-get install --no-install-recommends --no-install-suggests -y bind9

EXPOSE 53/udp 53/tcp

CMD service bind9 start && tail -F /dev/null

