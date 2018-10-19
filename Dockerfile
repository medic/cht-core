FROM node:10-stretch

# Installing nginx for proxy from localhost:5984 -> couchdb:5984
RUN apt-get update && apt-get install -y nginx
COPY docker-nginx.conf /opt

COPY docker-entrypoint.sh /opt
WORKDIR /opt
RUN chmod 777 docker-entrypoint.sh

WORKDIR /data
ENTRYPOINT [ "/opt/docker-entrypoint.sh" ]
CMD [ "tail", "-f", "/dev/null" ]