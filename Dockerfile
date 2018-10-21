FROM node:9-stretch

# Installing nginx for proxy from localhost:5984 -> couchdb:5984
RUN apt-get update && apt-get install -y nginx
RUN npm install -g grunt-cli &&\
    npm install -g yarn@1.7.0 &&\
    chmod 777 /usr/local/bin/yarn

COPY docker-nginx.conf /opt
COPY docker-run.sh /opt/
WORKDIR /opt
RUN chmod 777 docker-run.sh
WORKDIR /data
EXPOSE 5988
CMD [ "/opt/docker-run.sh" ]