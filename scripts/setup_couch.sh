curl -X PUT $1/_users 
curl -X PUT $1/_replicator
curl -X PUT $1/_global_changes
curl -X POST $1/_users -H "Content-Type: application/json" -d '{"_id": "org.couchdb.user:admin", "name": "admin", "password":"pass", "type":"user", "roles":[]}' 
curl -X PUT --data '"true"' $1/_node/couchdb@127.0.0.1/_config/chttpd/require_valid_user
curl -X PUT --data '"4294967296"' $1/_node/couchdb@127.0.0.1/_config/httpd/max_http_request_size
curl -X PUT $1/medic
