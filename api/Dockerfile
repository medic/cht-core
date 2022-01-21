FROM node:lts-alpine

RUN apk add --update --no-cache \
  curl \
  bash \
  jq    \
  vim
WORKDIR /app
COPY ["package.json", "package-lock.json","resources", "src","README.md","LICENSE", "./"]
RUN npm ci --production
RUN npm dedupe
EXPOSE 5988
ENTRYPOINT [ "node","/app/src/server.js" ]
