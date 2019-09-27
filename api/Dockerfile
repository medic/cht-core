FROM node:12
RUN mkdir /api
WORKDIR /api
COPY ./* ./
RUN npm ci
CMD node server.js