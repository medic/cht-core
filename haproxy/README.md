### Usage

This directory contains the build files for a pre-configured HAProxy to be used for CHT-Core. It's main objective is to
provide an audit log trail between CHT-API and CouchDB, and load balance all queries across the CouchDB Cluster.


### Scripts

Inside the scripts folder, you can find a set of custom scripts, please add any future ones here.


### Build

After making your changes, build the image locally from inside this directory:
`docker build -t medicmobile/cht-haproxy:<tag> .`

### Test

Please test this manually until we add CI/CD via GitHub Actions. After building the image locally, you can change the image tag
for the haproxy declaration in any of your cht-core docker-compose templates.

After testing, please push your image to DockerHub.


### Required Variables

In your docker-compose.yml template, the HAproxy container declaration will require the following variables:
- HAPROXY_IP: This should be the docker service name, `fqdn`, or set to `0.0.0.0`. If not set, our templates will default this to be a service name of `haproxy`.
*Note*: For Docker Desktop on Mac users, if you wish to expose HAproxy to your host, you will have to set this as `0.0.0.0`, to expose it as `localhost` outside of the docker network.
- HAPROXY_PORT: The port you wish HAProxy to run on. Defaults to 5984.
- COUCHDB_SERVERS: Comma separated list of the docker service name or fqdn of the CouchDB servers. Example: `couchdb-1.local,couchdb-2.local,couchdb-3.local`.
- COUCHDB_USER: The administrator that created the couchdb cluster
- COUCHDB_PASSWORD: The above admin's password
- HEALTHCHECK_ADDR: Address to the haproxy healthcheck service
