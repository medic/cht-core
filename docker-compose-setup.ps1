# docker-compose down
# docker-compose build
echo "Starting Docker compose"
docker-compose up --detach
echo "Will wait for 30s for couchdb to stabilize"
Start-Sleep 30
docker-compose exec couchdb curl -X PUT http://admin:pass@localhost:5984/_users
docker-compose exec couchdb curl -X PUT http://admin:pass@localhost:5984/_replicator
docker-compose exec couchdb curl -X PUT http://admin:pass@localhost:5984/_global_changes
docker-compose exec couchdb curl -X PUT http://admin:pass@localhost:5986/_config/chttpd/require_valid_user -d '"""true"""' -H "Content-Type: application/json"
# docker-compose exec couchdb curl -X POST http://admin:pass@localhost:5984/_users -H "Content-Type: application/json" -d '{"_id": "org.couchdb.user:admin", "name":"admin", "password":"pass", "type":"user", "roles":[]}'
docker-compose exec couchdb curl -X PUT http://admin:pass@localhost:5986/_config/httpd/WWW-Authenticate -d '"""Basic realm="administrator""""' -H "Content-Type: application/json"
docker-compose exec couchdb curl -X PUT --data '"""4294967296"""' http://admin:pass@localhost:5986/_config/httpd/max_http_request_size
# docker-compose exec couchdb curl -X PUT --data '""4294967296""' http://admin:pass@localhost:5986/_config/httpd/max_http_request_size
docker-compose exec medic /opt/docker-setup.sh
# docker-compose exec medic grunt dev-webapp
# docker-compose exec medic yarn start