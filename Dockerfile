FROM alpine
RUN apk add --no-cache curl
RUN mkdir /scripts
COPY ./scripts/e2e/wait_for_couch.sh /scripts
COPY ./scripts/setup_couch.sh /scripts
WORKDIR /scripts
CMD sh ./wait_for_couch.sh $COUCH_HOST && sh ./setup_couch.sh $COUCH_SECURE