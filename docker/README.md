# Couch behind haproxy setup
Proxy to track/audit couchdb requests.

#### Start proxy

```

docker-compose build
docker-compose up

# First time run:
curl -X PUT 'http://admin:pass@localhost:5984/{_users,_replicator,_global_changes,_metadata,admins}'

```

#### Stop proxy

```

docker-compose down

```
