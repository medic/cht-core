FROM node:9-stretch

# Installing nginx for proxy from localhost:5984 -> couchdb:5984
RUN apt-get update && apt-get install -y nginx
RUN npm install -g grunt-cli &&\
    npm install -g yarn@1.7.0 &&\
    chmod 777 /usr/local/bin/yarn

COPY docker-nginx.conf /opt

COPY docker-entrypoint.sh docker-setup.sh /opt/
WORKDIR /opt
RUN chmod 777 docker-entrypoint.sh &&\
    chmod 777 docker-setup.sh

WORKDIR /data
ENTRYPOINT [ "/opt/docker-entrypoint.sh" ]
# CMD [ "tail", "-f", "/dev/null" ]
# CMD [ "yarn", "start" ]
CMD [ "/opt/docker-setup.sh" ]